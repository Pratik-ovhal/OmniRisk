import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import BankHeader from '../components/common/BankHeader'
import RiskBadge from '../components/bank/RiskBadge'
import WeatherForecastWidget from '../components/common/WeatherForecastWidget'
import CustomerFormModal from '../components/bank/CustomerFormModal'
import RiskCheckHistory from '../components/bank/RiskCheckHistory'
import { supabase } from '../api/supabaseClient'
import type { Borrower, RegionalHazard, RiskCheck, RiskCheckInput } from '../types/database.types'
import type { WeatherSummary } from '../types/weather.types'
import { fetchWeatherForecast } from '../api/openMeteo'
import { geocodeAddress, reverseGeocode, type GeocodeResult, isCoordinatesInIndia } from '../api/locationResolver'
import { getAreaHazardIntelligence, type AreaHazardIntelligence } from '../api/areaHazardService'
import { calculateDualModeScore, type DualModeCalculationResult } from '../engine/scoringEngine'
import { saveRiskCheck, attachCheckToCustomer } from '../api/riskCheckService'

// Custom Leaflet Pin Icon
const pinIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: #006a61; opacity: 0.25; animation: ping 2s infinite;"></div>
      <div style="position: relative; width: 24px; height: 24px; border-radius: 50%; background: #006a61; border: 2.5px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: bold;">
        📍
      </div>
    </div>
  `,
  className: 'custom-check-pin',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
})

function MapCenterController({ lat, lon, zoom = 12 }: { lat: number; lon: number; zoom?: number }) {
  const map = useMap()
  const prevCoordRef = useRef<string>('')

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`
    if (prevCoordRef.current !== key) {
      prevCoordRef.current = key
      map.flyTo([lat, lon], zoom, {
        animate: true,
        duration: 0.8,
      })
      setTimeout(() => {
        map.invalidateSize()
      }, 250)
    }
  }, [lat, lon, zoom, map])

  return null
}

function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lon: number) => void
}) {
  const map = useMap()
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng)
      map.flyTo(e.latlng, map.getZoom())
    },
  })
  return null
}

export default function PreLoanRiskCheckPage() {
  const routerLocation = useLocation()
  const navigate = useNavigate()

  // Location inputs
  const [locationName, setLocationName] = useState('Shirol Agro Corridor')
  const [district, setDistrict] = useState('Kolhapur')
  const [state, setState] = useState('Maharashtra')
  const [latitude, setLatitude] = useState(16.70)
  const [longitude, setLongitude] = useState(74.24)

  // Nominatim search
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([])
  const [searchingAddress, setSearchingAddress] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchDebounceRef = useRef<number | null>(null)
  const searchRequestIdRef = useRef<number>(0)

  // Existing Customers for Quick Pre-fill
  const [existingCustomers, setExistingCustomers] = useState<Borrower[]>([])
  const [allHazards, setAllHazards] = useState<RegionalHazard[]>([])

  // Optional Enterprise Refinement Accordion
  const [includeBusinessInputs, setIncludeBusinessInputs] = useState(false)
  const [sector, setSector] = useState('Agriculture')
  const [subActivity, setSubActivity] = useState('')
  const [soilType, setSoilType] = useState('Alluvial')
  const [irrigationAccess, setIrrigationAccess] = useState('Borewell + Drip')
  const [utilityReliability, setUtilityReliability] = useState('24x7 Grid')
  const [supplyChainResilience, setSupplyChainResilience] = useState('Direct APMC Mandi Link')
  const [loanAmount, setLoanAmount] = useState('500000')
  const [monthlyRevenue, setMonthlyRevenue] = useState('65000')
  const [repaymentScore, setRepaymentScore] = useState('740')
  const [insuranceStatus, setInsuranceStatus] = useState('Active Crop Insurance')

  // Assessment results
  const [assessing, setAssessing] = useState(false)
  const [result, setResult] = useState<DualModeCalculationResult | null>(null)
  const [hazardIntelligence, setHazardIntelligence] = useState<AreaHazardIntelligence | null>(null)
  const [weatherSummary, setWeatherSummary] = useState<WeatherSummary | null>(null)
  const [activeCheckRecord, setActiveCheckRecord] = useState<RiskCheck | null>(null)
  const [boundaryWarning, setBoundaryWarning] = useState<string | null>(null)

  // Modals & Drawers
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [attachModalOpen, setAttachModalOpen] = useState(false)
  const [selectedCustomerToAttach, setSelectedCustomerToAttach] = useState<string>('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Load existing customers and regional hazards on mount
  useEffect(() => {
    async function loadInitial() {
      const { data: bData } = await supabase
        .from('borrowers')
        .select('*')
        .eq('is_archived', false)
        .order('borrower_name', { ascending: true })
      if (bData) setExistingCustomers(bData as Borrower[])

      const { data: hData } = await supabase.from('regional_hazards').select('*')
      if (hData) setAllHazards(hData as RegionalHazard[])
    }
    loadInitial()
  }, [])

  // Handle navigation prefill if redirected from customer detail
  useEffect(() => {
    if (routerLocation.state) {
      const s = routerLocation.state as any
      if (s.latitude && s.longitude) {
        setLatitude(parseFloat(Number(s.latitude).toFixed(4)))
        setLongitude(parseFloat(Number(s.longitude).toFixed(4)))
      }
      if (s.district) setDistrict(s.district)
      if (s.state) setState(s.state)
      if (s.prefillCustomer) {
        const c = s.prefillCustomer as Borrower
        setLocationName(`${c.business_name} (${c.district})`)
        setSector(c.sector || 'Agriculture')
        setSubActivity(c.sub_activity || '')
        setSoilType(c.soil_type || 'Alluvial')
        setIrrigationAccess(c.irrigation_access || 'Borewell + Drip')
        setUtilityReliability(c.utility_reliability || '24x7 Grid')
        setSupplyChainResilience(c.supply_chain_resilience || 'Direct APMC Mandi Link')
        setLoanAmount(String(c.loan_amount || 500000))
        setMonthlyRevenue(String(c.monthly_revenue || 65000))
        setRepaymentScore(String(c.repayment_score || 740))
        setInsuranceStatus(c.insurance_status || 'Active Crop Insurance')
        setIncludeBusinessInputs(true)
      }
      // Trigger evaluation after short delay
      setTimeout(() => {
        runEvaluation()
      }, 300)
    }
  }, [routerLocation.state])

  // Address search with debounce and race-condition guard
  const handleSearchAddress = (query: string) => {
    setSearchQuery(query)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)

    if (query.trim().length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    const currentReqId = ++searchRequestIdRef.current
    setSearchingAddress(true)
    searchDebounceRef.current = window.setTimeout(async () => {
      try {
        const results = await geocodeAddress(query)
        if (searchRequestIdRef.current === currentReqId) {
          setSuggestions(results)
          setShowDropdown(true)
        }
      } catch {
        if (searchRequestIdRef.current === currentReqId) {
          setSuggestions([])
          setShowDropdown(false)
        }
      } finally {
        if (searchRequestIdRef.current === currentReqId) {
          setSearchingAddress(false)
        }
      }
    }, 400)
  }

  const handleSelectSuggestion = (s: GeocodeResult) => {
    if (!Number.isFinite(s.latitude) || !Number.isFinite(s.longitude)) return
    const validLat = parseFloat(s.latitude.toFixed(4))
    const validLon = parseFloat(s.longitude.toFixed(4))

    setLatitude(validLat)
    setLongitude(validLon)
    if (s.district && s.district !== 'Unknown District') setDistrict(s.district)
    if (s.state && s.state !== 'Unknown State') setState(s.state)
    setLocationName(s.name || s.displayName)
    setSearchQuery(s.displayName)
    setShowDropdown(false)
    checkBoundaries(validLat, validLon)
  }

  // Map click / pin drag handler
  const handleMapSelect = async (lat: number, lon: number) => {
    const latFixed = parseFloat(lat.toFixed(4))
    const lonFixed = parseFloat(lon.toFixed(4))
    setLatitude(latFixed)
    setLongitude(lonFixed)
    checkBoundaries(latFixed, lonFixed)

    const geo = await reverseGeocode(latFixed, lonFixed)
    if (geo) {
      if (geo.district && geo.district !== 'Unknown District') setDistrict(geo.district)
      if (geo.state && geo.state !== 'Unknown State') setState(geo.state)
      setLocationName(geo.name || `${geo.district}, ${geo.state}`)
      setSearchQuery(geo.displayName)
    }
  }

  // Pre-fill location from existing portfolio customer
  const handleSelectExistingCustomer = (customerId: string) => {
    if (!customerId) return
    const cust = existingCustomers.find((c) => c.id === customerId)
    if (cust) {
      setLocationName(`${cust.business_name} Site`)
      setDistrict(cust.district)
      setState(cust.state)
      setLatitude(cust.latitude)
      setLongitude(cust.longitude)
      setSector(cust.sector)
      setSubActivity(cust.sub_activity || '')
      setSoilType(cust.soil_type)
      setIrrigationAccess(cust.irrigation_access)
      setUtilityReliability(cust.utility_reliability)
      setSupplyChainResilience(cust.supply_chain_resilience)
      setLoanAmount(String(cust.loan_amount))
      setMonthlyRevenue(String(cust.monthly_revenue))
      setRepaymentScore(String(cust.repayment_score))
      setInsuranceStatus(cust.insurance_status)
      setIncludeBusinessInputs(true)
      checkBoundaries(cust.latitude, cust.longitude)
    }
  }

  // Boundary check
  const checkBoundaries = (lat: number, lon: number) => {
    if (!isCoordinatesInIndia(lat, lon)) {
      setBoundaryWarning('Notice: Coordinates lie outside standard Indian mainland boundaries. Regional benchmarks may use approximate extrapolation.')
    } else {
      setBoundaryWarning(null)
    }
  }

  // Execute Dual-Mode Assessment
  const runEvaluation = async () => {
    setAssessing(true)
    setBoundaryWarning(null)

    try {
      checkBoundaries(latitude, longitude)

      // 1. Surrounding Area & District Hazard Intelligence
      const intel = await getAreaHazardIntelligence(latitude, longitude, district)
      setHazardIntelligence(intel)

      // 2. Live Weather Forecast from Open-Meteo
      const weather = await fetchWeatherForecast(latitude, longitude)
      setWeatherSummary(weather)

      // 3. Dual-Mode Evaluation
      const businessInputsSnapshot: RiskCheckInput | null = includeBusinessInputs
        ? {
            sector,
            sub_activity: subActivity,
            soil_type: soilType,
            irrigation_access: irrigationAccess,
            utility_reliability: utilityReliability,
            supply_chain_resilience: supplyChainResilience,
            loan_amount: Number(loanAmount),
            monthly_revenue: Number(monthlyRevenue),
            repayment_score: Number(repaymentScore),
            insurance_status: insuranceStatus,
          }
        : null

      const evalResult = calculateDualModeScore(
        intel.targetHazard,
        weather,
        businessInputsSnapshot
      )
      setResult(evalResult)

      // 4. Persist to risk_checks database
      const checkRecord = await saveRiskCheck({
        locationName: locationName.trim() || `${district} Target Site`,
        district: district.trim(),
        state: state.trim(),
        latitude,
        longitude,
        checkType: evalResult.checkType,
        inputsSnapshot: businessInputsSnapshot || {},
        score: evalResult.totalScore,
        advisoryLabel: evalResult.advisoryLabel,
        dataCompleteness: evalResult.dataCompleteness,
        subscoresSnapshot: {
          hazardSubscore: evalResult.hazardSubscore,
          vulnerabilitySubscore: evalResult.vulnerabilitySubscore,
          forecastSubscore: evalResult.forecastSubscore,
          financialSubscore: evalResult.financialSubscore,
          satelliteBonus: evalResult.satelliteBonus,
        },
      })
      setActiveCheckRecord(checkRecord)

      showToast(`Assessment complete: Score ${evalResult.totalScore}/100 (${evalResult.advisoryLabel})`)
    } catch (err: any) {
      alert(err.message || 'Error executing location evaluation')
    } finally {
      setAssessing(false)
    }
  }

  // Attach Check to Existing Customer
  const handleAttachCheck = async () => {
    if (!activeCheckRecord || !selectedCustomerToAttach) return
    try {
      await attachCheckToCustomer(activeCheckRecord.id, selectedCustomerToAttach)
      showToast('Assessment successfully attached to customer file!')
      setAttachModalOpen(false)
    } catch (err: any) {
      alert(err.message || 'Failed to attach check to customer')
    }
  }

  // Re-inspect from History Drawer
  const handleSelectHistoricalCheck = (check: RiskCheck) => {
    setLocationName(check.location_name)
    setDistrict(check.district)
    setState(check.state)
    setLatitude(check.latitude)
    setLongitude(check.longitude)

    if (check.check_type === 'AREA_AND_BUSINESS' && check.inputs_snapshot) {
      setIncludeBusinessInputs(true)
      const inp = check.inputs_snapshot
      if (inp.sector) setSector(inp.sector)
      if (inp.sub_activity) setSubActivity(inp.sub_activity)
      if (inp.soil_type) setSoilType(inp.soil_type)
      if (inp.irrigation_access) setIrrigationAccess(inp.irrigation_access)
      if (inp.utility_reliability) setUtilityReliability(inp.utility_reliability)
      if (inp.supply_chain_resilience) setSupplyChainResilience(inp.supply_chain_resilience)
      if (inp.loan_amount) setLoanAmount(String(inp.loan_amount))
      if (inp.monthly_revenue) setMonthlyRevenue(String(inp.monthly_revenue))
      if (inp.repayment_score) setRepaymentScore(String(inp.repayment_score))
      if (inp.insurance_status) setInsuranceStatus(inp.insurance_status)
    } else {
      setIncludeBusinessInputs(false)
    }

    setActiveCheckRecord(check)
    runEvaluation()
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col text-on-surface">
      <BankHeader />

      {/* Floating Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-slideDown">
          <div className="px-4 py-3 rounded-xl bg-primary text-white shadow-xl flex items-center gap-2 text-xs font-semibold border border-secondary">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Title & History Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary/15 text-secondary border border-secondary/30 uppercase">
                Pre-Loan Decision Support
              </span>
              <span className="text-xs text-outline">•</span>
              <span className="text-xs text-on-surface-variant font-medium">Dual-Mode Evaluation</span>
            </div>
            <h1 className="text-2xl font-black text-primary tracking-tight mt-1">
              Pre-Loan Location & Area Risk Check
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Screen geographic coordinates and area climate hazard exposure prior to borrower onboarding.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 text-primary text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[17px]">history</span>
              <span>Check History</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-3.5 py-2 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container-high text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <span className="material-symbols-outlined text-[17px]">arrow_back</span>
              <span>Portfolio Dashboard</span>
            </button>
          </div>
        </div>

        {/* Synthetic Demonstration Banner */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px]">science</span>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              <strong className="text-primary font-semibold">Institutional Advisory Tool:</strong> OmniRisk evaluates acute perils using Open-Meteo 7-day live meteorological forecasts and World Bank regional indices.
            </p>
            <p className="text-[11px] text-outline mt-0.5 font-medium">
              Advisory only. The bank makes the lending decision. Pre-loan screening contains zero automated approval or denial logic.
            </p>
          </div>
        </div>

        {/* Boundary Warning if any */}
        {boundaryWarning && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-amber-600">warning</span>
            <span>{boundaryWarning}</span>
          </div>
        )}

        {/* Main Grid: Input Panel (Left) & Assessment Results (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Multi-Modal Location & Inputs Panel (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                <h2 className="text-sm font-bold text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-secondary">pin_drop</span>
                  <span>1. Target Location</span>
                </h2>
                <span className="text-[10px] font-bold uppercase text-secondary bg-secondary/10 px-2 py-0.5 rounded">
                  OSM Nominatim
                </span>
              </div>

              {/* Pre-fill from existing customer portfolio */}
              {existingCustomers.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-primary mb-1">
                    Pre-fill from Existing Customer (Optional)
                  </label>
                  <select
                    onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                    defaultValue=""
                  >
                    <option value="">-- Choose portfolio enterprise --</option>
                    {existingCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.business_name} ({c.district}, {c.state})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Address Search Bar */}
              <div className="relative">
                <label className="block text-[11px] font-semibold text-primary mb-1">
                  Address / Village / Town Search
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchAddress(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowDropdown(true)
                    }}
                    placeholder="Type town, mandi or landmark (e.g., Shirol, Kolhapur)..."
                    className="w-full px-3.5 py-2 pl-9 pr-8 rounded-xl bg-surface-container-low border border-outline-variant/35 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  />
                  <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[17px] text-outline">
                    {searchingAddress ? 'sync' : 'search'}
                  </span>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setSuggestions([])
                        setShowDropdown(false)
                      }}
                      className="absolute right-2.5 top-2.5 text-outline hover:text-primary transition-colors"
                      title="Clear search"
                    >
                      <span className="material-symbols-outlined text-[15px]">close</span>
                    </button>
                  )}
                </div>

                {/* Autocomplete Suggestions */}
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 z-[1050] mt-1 bg-surface-container-lowest rounded-xl border border-outline-variant/35 shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                    {suggestions.length > 0 ? (
                      suggestions.map((item, idx) => (
                        <div
                          key={idx}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            handleSelectSuggestion(item)
                          }}
                          onClick={() => handleSelectSuggestion(item)}
                          className="px-3.5 py-2 hover:bg-surface-container-low cursor-pointer border-b border-outline-variant/15 text-xs text-primary transition-colors flex items-start gap-2"
                        >
                          <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5 shrink-0">location_on</span>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-primary truncate">{item.name}</div>
                            <div className="text-[10px] text-on-surface-variant truncate">{item.displayName}</div>
                            <div className="text-[9px] text-outline font-mono mt-0.5">
                              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)} &bull; {item.district}, {item.state}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : !searchingAddress && searchQuery.trim().length >= 2 ? (
                      <div className="px-3.5 py-3 text-center text-xs text-on-surface-variant">
                        No matching locations found for &ldquo;{searchQuery}&rdquo;. Try another town or district.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Interactive Mini-Map with Click & Draggable Pin */}
              <div className="h-48 rounded-xl border border-outline-variant/30 overflow-hidden relative shadow-inner">
                <MapContainer
                  center={[latitude, longitude]}
                  zoom={11}
                  className="w-full h-full"
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <MapCenterController lat={latitude} lon={longitude} />
                  <MapClickHandler onLocationSelect={handleMapSelect} />
                  <Marker
                    position={[latitude, longitude]}
                    icon={pinIcon}
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        const pos = e.target.getLatLng()
                        handleMapSelect(pos.lat, pos.lng)
                      },
                    }}
                  />
                </MapContainer>
                <div className="absolute bottom-2 left-2 z-1000 bg-surface-container-lowest/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-semibold text-primary border border-outline-variant/30 pointer-events-none">
                  💡 Click map or drag pin to inspect coordinates
                </div>
              </div>

              {/* Coordinates & District/State Fields */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-primary mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-primary mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-primary mb-1">District</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-primary mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Optional Enterprise Refinement Accordion */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
              <div
                onClick={() => setIncludeBusinessInputs(!includeBusinessInputs)}
                className="p-4 bg-surface-container-low cursor-pointer flex items-center justify-between select-none hover:bg-surface-container-high transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-secondary">
                    {includeBusinessInputs ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-primary">
                      2. Optional Enterprise Refinements
                    </h3>
                    <p className="text-[11px] text-on-surface-variant">
                      {includeBusinessInputs
                        ? 'Full 100% data completeness mode (5 pillars active)'
                        : 'Area-only check (55% baseline, no business inputs needed)'}
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[18px] text-outline">
                  {includeBusinessInputs ? 'expand_less' : 'expand_more'}
                </span>
              </div>

              {includeBusinessInputs && (
                <div className="p-5 space-y-3.5 border-t border-outline-variant/20 animate-fadeIn text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-primary mb-1">Sector</label>
                      <select
                        value={sector}
                        onChange={(e) => setSector(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 text-xs"
                      >
                        <option value="Agriculture">Agriculture</option>
                        <option value="Agri-processing">Agri-processing</option>
                        <option value="Rural Retail">Rural Retail</option>
                        <option value="Handloom/Textile">Handloom/Textile</option>
                        <option value="Light Manufacturing">Light Manufacturing</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-primary mb-1">Sub-activity</label>
                      <input
                        type="text"
                        value={subActivity}
                        onChange={(e) => setSubActivity(e.target.value)}
                        placeholder="e.g. Sugarcane Cultivation"
                        className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-primary mb-1">Irrigation Access</label>
                      <select
                        value={irrigationAccess}
                        onChange={(e) => setIrrigationAccess(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 text-xs"
                      >
                        <option value="Borewell + Drip">Borewell + Drip</option>
                        <option value="Canal Irrigated">Canal Irrigated</option>
                        <option value="Rainfed Only">Rainfed Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-primary mb-1">Soil Drainage</label>
                      <select
                        value={soilType}
                        onChange={(e) => setSoilType(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 text-xs"
                      >
                        <option value="Alluvial">Alluvial</option>
                        <option value="Clay Loam">Clay Loam</option>
                        <option value="Red Sandy">Red Sandy</option>
                        <option value="Black Cotton">Black Cotton</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-primary mb-1">Loan Exposure (₹)</label>
                      <input
                        type="number"
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-primary mb-1">Monthly Revenue (₹)</label>
                      <input
                        type="number"
                        value={monthlyRevenue}
                        onChange={(e) => setMonthlyRevenue(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-primary mb-1">Repayment Score (300-900)</label>
                      <input
                        type="number"
                        value={repaymentScore}
                        onChange={(e) => setRepaymentScore(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-primary mb-1">Insurance Status</label>
                      <select
                        value={insuranceStatus}
                        onChange={(e) => setInsuranceStatus(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/35 text-xs"
                      >
                        <option value="Active Crop Insurance">Active PMFBY / Crop Cover</option>
                        <option value="Asset Insured">Asset Insured</option>
                        <option value="Uninsured">Uninsured</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Run Assessment Button */}
            <button
              type="button"
              onClick={runEvaluation}
              disabled={assessing}
              className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-xs hover:bg-primary-container shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              {assessing ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  <span>Screening Location Hazards & Live Weather...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">radar</span>
                  <span>
                    {includeBusinessInputs
                      ? 'Execute Full Pre-Loan Check (100% Complete)'
                      : 'Run Instant Area-Only Risk Check (55% Baseline)'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* RIGHT: Assessment Result Screen (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {!result ? (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-12 text-center text-on-surface-variant flex flex-col items-center justify-center min-h-[420px]">
                <div className="w-14 h-14 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[32px]">travel_explore</span>
                </div>
                <h3 className="text-base font-bold text-primary">Ready to Assess Pre-Loan Risk</h3>
                <p className="text-xs text-on-surface-variant max-w-sm mt-1 leading-relaxed">
                  Select or search coordinates on the map, choose optional business refinements, and click &ldquo;Run Instant Area-Only Risk Check&rdquo;.
                </p>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-outline">
                  <span className="material-symbols-outlined text-[15px]">verified_user</span>
                  <span>Zero approval / denial triggers • Pure advisory decision support</span>
                </div>
              </div>
            ) : (
              <div className="space-y-5 animate-fadeIn">
                {/* Result Hero Card */}
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-6 shadow-sm space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            result.checkType === 'AREA_ONLY'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {result.checkType === 'AREA_ONLY' ? 'Area-Only Check' : 'Area + Business Check'}
                        </span>
                        <span className="text-[10px] text-outline">•</span>
                        <span className="text-xs text-on-surface-variant font-medium">
                          {district}, {state}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-primary mt-1">{locationName}</h2>
                      <p className="text-[11px] text-outline font-mono mt-0.5">
                        GPS: {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Data Completeness Circular Badge */}
                      <div className="text-right">
                        <div className="text-[10px] text-outline font-semibold uppercase">Completeness</div>
                        <div className="text-xs font-extrabold text-primary flex items-center justify-end gap-1">
                          <span className="w-2 h-2 rounded-full bg-secondary"></span>
                          <span>{result.dataCompleteness}%</span>
                        </div>
                      </div>
                      <RiskBadge score={result.totalScore} label={result.advisoryLabel} size="lg" />
                    </div>
                  </div>

                  {/* 4 Pillars Breakdown (with Unavailable Markers for Area-Only) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-outline-variant/20">
                    {/* Pillar 1 */}
                    <div className="p-3 bg-surface-container-low rounded-xl text-center border border-outline-variant/20">
                      <span className="text-[10px] font-semibold text-on-surface-variant">Location Hazard</span>
                      <div className="text-lg font-extrabold text-primary mt-1">
                        {result.hazardSubscore}
                      </div>
                      <span className="text-[9px] text-outline font-bold">30% Weight</span>
                    </div>

                    {/* Pillar 2 */}
                    <div className="p-3 bg-surface-container-low rounded-xl text-center border border-outline-variant/20">
                      <span className="text-[10px] font-semibold text-on-surface-variant">7-Day Forecast</span>
                      <div className="text-lg font-extrabold text-primary mt-1">
                        {result.forecastSubscore}
                      </div>
                      <span className="text-[9px] text-outline font-bold">25% Weight</span>
                    </div>

                    {/* Pillar 3 */}
                    <div className="p-3 bg-surface-container-low rounded-xl text-center border border-outline-variant/20">
                      <span className="text-[10px] font-semibold text-on-surface-variant">Business Vulnerability</span>
                      {result.vulnerabilitySubscore !== undefined ? (
                        <>
                          <div className="text-lg font-extrabold text-primary mt-1">
                            {result.vulnerabilitySubscore}
                          </div>
                          <span className="text-[9px] text-outline font-bold">25% Weight</span>
                        </>
                      ) : (
                        <div className="mt-2 text-[10px] text-outline font-semibold bg-surface-container-high py-1 px-1 rounded">
                          Not provided
                        </div>
                      )}
                    </div>

                    {/* Pillar 4 */}
                    <div className="p-3 bg-surface-container-low rounded-xl text-center border border-outline-variant/20">
                      <span className="text-[10px] font-semibold text-on-surface-variant">Financial Buffer</span>
                      {result.financialSubscore !== undefined ? (
                        <>
                          <div className="text-lg font-extrabold text-primary mt-1">
                            {result.financialSubscore}
                          </div>
                          <span className="text-[9px] text-outline font-bold">20% Weight</span>
                        </>
                      ) : (
                        <div className="mt-2 text-[10px] text-outline font-semibold bg-surface-container-high py-1 px-1 rounded">
                          Not provided
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Climate Risk Drivers & Protective Factors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-200/60 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-orange-800 font-bold text-xs">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        <span>Key Environmental Risks</span>
                      </div>
                      <ul className="space-y-1 text-xs text-orange-950">
                        {result.topRiskFactors.map((r, i) => (
                          <li key={i} className="flex items-start gap-1 leading-snug">
                            <span className="text-orange-500 font-bold shrink-0">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        <span>Resilience Buffers</span>
                      </div>
                      <ul className="space-y-1 text-xs text-emerald-950">
                        {result.topProtectiveFactors.map((p, i) => (
                          <li key={i} className="flex items-start gap-1 leading-snug">
                            <span className="text-emerald-500 font-bold shrink-0">•</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Independent Insurance Guidance */}
                  <div className="p-3 rounded-xl bg-secondary/10 border border-secondary/20 text-xs text-on-surface-variant flex items-start gap-2">
                    <span className="material-symbols-outlined text-[17px] text-secondary mt-0.5">shield</span>
                    <div>
                      <span className="font-bold text-primary">Advisory Recommendation: </span>
                      <span>{result.insuranceSuggestion}</span>
                    </div>
                  </div>
                </div>

                {/* Surrounding Area & Neighbourhood Context Card */}
                {hazardIntelligence && (
                  <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2.5">
                      <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-secondary">explore</span>
                        <span>Surrounding Territory & Neighbourhood Intelligence</span>
                      </h3>
                      {hazardIntelligence.isNearestBenchmark && (
                        <span className="text-[10px] text-outline font-semibold">
                          Nearest benchmark (~{hazardIntelligence.benchmarkDistanceKm}km away)
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {hazardIntelligence.territoryRiskSummary}
                    </p>

                    {/* Point vs Neighbourhood Comparison Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
                        <span className="text-[10px] text-outline font-semibold">Flood Risk</span>
                        <div className="font-bold text-primary mt-0.5">
                          Point: {Math.round(hazardIntelligence.targetHazard.flood_hazard_index * 100)}%
                        </div>
                        <span className="text-[10px] text-on-surface-variant">
                          Neighbourhood: {hazardIntelligence.neighbourhoodAverages.avgFlood}%
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
                        <span className="text-[10px] text-outline font-semibold">Drought Risk</span>
                        <div className="font-bold text-primary mt-0.5">
                          Point: {Math.round(hazardIntelligence.targetHazard.drought_hazard_index * 100)}%
                        </div>
                        <span className="text-[10px] text-on-surface-variant">
                          Neighbourhood: {hazardIntelligence.neighbourhoodAverages.avgDrought}%
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
                        <span className="text-[10px] text-outline font-semibold">Heat Stress</span>
                        <div className="font-bold text-primary mt-0.5">
                          Point: {Math.round(hazardIntelligence.targetHazard.heat_stress_index * 100)}%
                        </div>
                        <span className="text-[10px] text-on-surface-variant">
                          Neighbourhood: {hazardIntelligence.neighbourhoodAverages.avgHeat}%
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
                        <span className="text-[10px] text-outline font-semibold">Peak Surrounding Threat</span>
                        <div className="font-bold text-amber-700 mt-0.5">
                          {hazardIntelligence.neighbourhoodAverages.peakFlood}% Flood
                        </div>
                        <span className="text-[10px] text-outline">
                          {hazardIntelligence.neighbourhoodDistricts[0]?.district || 'Adjacent'} basin
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Weather Forecast Widget */}
                {weatherSummary && (
                  <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-5 shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                        Live 7-Day Weather Forecast ({district})
                      </h3>
                      {weatherSummary.isCached && (
                        <span className="text-[10px] text-outline font-semibold">
                          Open-Meteo Cached Feed
                        </span>
                      )}
                    </div>
                    <WeatherForecastWidget weather={weatherSummary} loading={false} />
                  </div>
                )}

                {/* POST-CHECK ACTION TOOLBAR */}
                <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/25 flex flex-wrap items-center justify-between gap-2.5 shadow-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Action 1: Save as New Customer */}
                    <button
                      type="button"
                      onClick={() => setIsCustomerModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">person_add</span>
                      <span>Save as New Customer</span>
                    </button>

                    {/* Action 2: Attach to Existing Customer */}
                    <button
                      type="button"
                      onClick={() => setAttachModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high border border-outline-variant/30 text-primary text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">attachment</span>
                      <span>Attach to Customer</span>
                    </button>

                    {/* Action 3: Print / Export Summary */}
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3.5 py-2 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high border border-outline-variant/30 text-primary text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      <span>Print Summary</span>
                    </button>
                  </div>

                  {/* Reset action */}
                  <button
                    type="button"
                    onClick={() => {
                      setResult(null)
                      setLocationName('')
                    }}
                    className="px-3 py-1.5 rounded-xl text-outline hover:text-primary text-xs font-semibold transition-all"
                  >
                    Run Another Check
                  </button>
                </div>

                {/* Mandatory Advisory Disclaimer */}
                <div className="text-center text-[11px] text-outline pt-2">
                  Advisory only. The bank makes the lending decision.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* History Drawer */}
      <RiskCheckHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectCheck={handleSelectHistoricalCheck}
      />

      {/* Save as New Customer Modal (pre-populated with evaluated inputs) */}
      <CustomerFormModal
        isOpen={isCustomerModalOpen}
        mode="create"
        hazards={allHazards}
        initialLocation={{
          latitude,
          longitude,
          district,
          state,
        }}
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={(_cust, _score, msg) => {
          showToast(msg || 'Customer registered from pre-loan assessment!')
          setIsCustomerModalOpen(false)
        }}
      />

      {/* Attach to Existing Customer Modal */}
      {attachModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full border border-outline-variant/30 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">attachment</span>
                <span>Attach Assessment to Customer</span>
              </h3>
              <button
                onClick={() => setAttachModalOpen(false)}
                className="text-outline hover:text-primary"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Link this pre-loan check snapshot ({activeCheckRecord?.score}/100) to an existing customer file:
            </p>

            <select
              value={selectedCustomerToAttach}
              onChange={(e) => setSelectedCustomerToAttach(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/35 text-xs text-on-surface"
            >
              <option value="">-- Choose active customer --</option>
              {existingCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name} ({c.borrower_name} - {c.district})
                </option>
              ))}
            </select>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setAttachModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAttachCheck}
                disabled={!selectedCustomerToAttach}
                className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-container disabled:opacity-40"
              >
                Confirm Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
