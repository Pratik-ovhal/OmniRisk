import { useState, useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { Borrower, RegionalHazard } from '../../types/database.types'
import {
  createCustomer,
  updateCustomer,
  checkDuplicateCustomer,
  validateCustomerPayload,
  type CreateCustomerPayload,
} from '../../api/customerService'
import { geocodeAddress, reverseGeocode, type GeocodeResult } from '../../api/locationResolver'
import { calculateClimateScore } from '../../engine/scoringEngine'
import RiskBadge from './RiskBadge'

interface CustomerFormModalProps {
  isOpen: boolean
  mode: 'create' | 'edit'
  customer?: Borrower | null
  initialLocation?: {
    latitude: number
    longitude: number
    district: string
    state: string
  }
  hazards: RegionalHazard[]
  onClose: () => void
  onSuccess: (customer: Borrower, score?: any, message?: string) => void
}

// Custom map marker icon
const pinIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: #006a61; opacity: 0.25; animation: ping 2s infinite;"></div>
      <div style="position: relative; width: 22px; height: 22px; border-radius: 50%; background: #006a61; border: 2.5px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px;">
        📍
      </div>
    </div>
  `,
  className: 'custom-customer-pin',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

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

  // Invalidate size when tab mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 200)
    return () => clearTimeout(timer)
  }, [map])

  return null
}

export default function CustomerFormModal({
  isOpen,
  mode,
  customer,
  initialLocation,
  hazards,
  onClose,
  onSuccess,
}: CustomerFormModalProps) {
  // Form State
  const [borrowerName, setBorrowerName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [sector, setSector] = useState('Agriculture')
  const [subActivity, setSubActivity] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [notes, setNotes] = useState('')

  // Location State
  const [district, setDistrict] = useState('Kolhapur')
  const [state, setState] = useState('Maharashtra')
  const [latitude, setLatitude] = useState(16.70)
  const [longitude, setLongitude] = useState(74.24)
  const [searchAddress, setSearchAddress] = useState('')
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<GeocodeResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Climate Resilience Attributes
  const [irrigationAccess, setIrrigationAccess] = useState('Borewell + Drip')
  const [soilType, setSoilType] = useState('Alluvial')
  const [utilityReliability, setUtilityReliability] = useState('24x7 Grid')
  const [supplyChainResilience, setSupplyChainResilience] = useState('Direct APMC Mandi Link')

  // Financials
  const [loanAmount, setLoanAmount] = useState('500000')
  const [monthlyRevenue, setMonthlyRevenue] = useState('65000')
  const [repaymentScore, setRepaymentScore] = useState('740')
  const [insuranceStatus, setInsuranceStatus] = useState('Active Crop Insurance')

  // Meta & UI States
  const [isSynthetic, setIsSynthetic] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'enterprise' | 'location' | 'resilience' | 'financials'>('enterprise')

  const searchDebounceRef = useRef<number | null>(null)
  const searchRequestIdRef = useRef<number>(0)

  // Initialize form values
  useEffect(() => {
    if (!isOpen) return

    if (mode === 'edit' && customer) {
      setBorrowerName(customer.borrower_name || '')
      setBusinessName(customer.business_name || '')
      setSector(customer.sector || 'Agriculture')
      setSubActivity(customer.sub_activity || '')
      setContactNumber(customer.contact_number || '')
      setNotes(customer.notes || '')
      setDistrict(customer.district || 'Kolhapur')
      setState(customer.state || 'Maharashtra')
      setLatitude(customer.latitude || 16.70)
      setLongitude(customer.longitude || 74.24)
      setIrrigationAccess(customer.irrigation_access || 'Borewell + Drip')
      setSoilType(customer.soil_type || 'Alluvial')
      setUtilityReliability(customer.utility_reliability || '24x7 Grid')
      setSupplyChainResilience(customer.supply_chain_resilience || 'Direct APMC Mandi Link')
      setLoanAmount(String(customer.loan_amount || 500000))
      setMonthlyRevenue(String(customer.monthly_revenue || 65000))
      setRepaymentScore(String(customer.repayment_score || 740))
      setInsuranceStatus(customer.insurance_status || 'Active Crop Insurance')
      setIsSynthetic(customer.is_synthetic !== undefined ? customer.is_synthetic : true)
    } else {
      // Create mode
      if (initialLocation) {
        setLatitude(initialLocation.latitude)
        setLongitude(initialLocation.longitude)
        setDistrict(initialLocation.district)
        setState(initialLocation.state)
      } else {
        setDistrict(hazards[0]?.district || 'Kolhapur')
        setState(hazards[0]?.state || 'Maharashtra')
        setLatitude(hazards[0]?.latitude || 16.70)
        setLongitude(hazards[0]?.longitude || 74.24)
      }
      setBorrowerName('')
      setBusinessName('')
      setSector('Agriculture')
      setSubActivity('')
      setContactNumber('')
      setNotes('')
      setIrrigationAccess('Borewell + Drip')
      setSoilType('Alluvial')
      setUtilityReliability('24x7 Grid')
      setSupplyChainResilience('Direct APMC Mandi Link')
      setLoanAmount('500000')
      setMonthlyRevenue('65000')
      setRepaymentScore('740')
      setInsuranceStatus('Active Crop Insurance')
      setIsSynthetic(true)
    }

    setFormErrors({})
    setDuplicateWarning(null)
  }, [isOpen, mode, customer, initialLocation, hazards])

  // Matched Regional Hazard
  const matchedHazard = useMemo(() => {
    return (
      hazards.find((h) => h.district.toLowerCase() === district.toLowerCase()) ||
      hazards[0] || {
        id: 0,
        district,
        state,
        country: 'India',
        latitude,
        longitude,
        flood_hazard_index: 0.35,
        drought_hazard_index: 0.35,
        heat_stress_index: 0.35,
        cyclone_storm_index: 0.15,
        updated_at: new Date().toISOString(),
      }
    )
  }, [hazards, district, state, latitude, longitude])

  // Live Score Preview Calculation
  const liveScore = useMemo(() => {
    const dummyBorrower: Borrower = {
      id: customer?.id || 'preview',
      public_token: customer?.public_token || 'preview_token',
      borrower_name: borrowerName || 'Prospective Borrower',
      business_name: businessName || 'Prospective Enterprise',
      sector,
      sub_activity: subActivity,
      district,
      state,
      latitude,
      longitude,
      soil_type: soilType,
      irrigation_access: irrigationAccess,
      utility_reliability: utilityReliability,
      supply_chain_resilience: supplyChainResilience,
      loan_amount: Number(loanAmount) || 0,
      monthly_revenue: Number(monthlyRevenue) || 0,
      repayment_score: Number(repaymentScore) || 700,
      insurance_status: insuranceStatus,
      is_synthetic: isSynthetic,
      created_at: new Date().toISOString(),
    }

    return calculateClimateScore(dummyBorrower, matchedHazard, null)
  }, [
    customer,
    borrowerName,
    businessName,
    sector,
    subActivity,
    district,
    state,
    latitude,
    longitude,
    soilType,
    irrigationAccess,
    utilityReliability,
    supplyChainResilience,
    loanAmount,
    monthlyRevenue,
    repaymentScore,
    insuranceStatus,
    isSynthetic,
    matchedHazard,
  ])

  // Duplicate Check Debounce
  useEffect(() => {
    if (!borrowerName || !businessName || borrowerName.length < 3) {
      setDuplicateWarning(null)
      return
    }

    const timer = setTimeout(async () => {
      const result = await checkDuplicateCustomer(
        borrowerName,
        businessName,
        latitude,
        longitude,
        customer?.id
      )
      if (result.isDuplicate) {
        setDuplicateWarning(result.duplicateReason || 'Potential duplicate enterprise detected nearby.')
      } else {
        setDuplicateWarning(null)
      }
    }, 600)

    return () => clearTimeout(timer)
  }, [borrowerName, businessName, latitude, longitude, customer?.id])

  // Handle Address Search with debounce and race-condition guard
  const handleAddressSearch = (query: string) => {
    setSearchAddress(query)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)

    if (query.trim().length < 2) {
      setAddressSuggestions([])
      setShowSuggestions(false)
      return
    }

    const currentReqId = ++searchRequestIdRef.current
    setIsSearchingAddress(true)
    searchDebounceRef.current = window.setTimeout(async () => {
      try {
        const results = await geocodeAddress(query)
        if (searchRequestIdRef.current === currentReqId) {
          setAddressSuggestions(results)
          setShowSuggestions(true)
        }
      } catch {
        if (searchRequestIdRef.current === currentReqId) {
          setAddressSuggestions([])
          setShowSuggestions(false)
        }
      } finally {
        if (searchRequestIdRef.current === currentReqId) {
          setIsSearchingAddress(false)
        }
      }
    }, 400)
  }

  const handleSelectSuggestion = (suggestion: GeocodeResult) => {
    if (!Number.isFinite(suggestion.latitude) || !Number.isFinite(suggestion.longitude)) return
    const validLat = parseFloat(suggestion.latitude.toFixed(4))
    const validLon = parseFloat(suggestion.longitude.toFixed(4))

    setLatitude(validLat)
    setLongitude(validLon)
    if (suggestion.district && suggestion.district !== 'Unknown District') {
      setDistrict(suggestion.district)
    }
    if (suggestion.state && suggestion.state !== 'Unknown State') {
      setState(suggestion.state)
    }
    setSearchAddress(suggestion.displayName)
    setShowSuggestions(false)
  }

  // Handle Map Pin Click/Drag
  const handleMapLocationSelect = async (newLat: number, newLon: number) => {
    const latFixed = parseFloat(newLat.toFixed(4))
    const lonFixed = parseFloat(newLon.toFixed(4))
    setLatitude(latFixed)
    setLongitude(lonFixed)

    // Reverse geocode
    const geo = await reverseGeocode(latFixed, lonFixed)
    if (geo) {
      if (geo.district && geo.district !== 'Unknown District') {
        setDistrict(geo.district)
      }
      if (geo.state && geo.state !== 'Unknown State') {
        setState(geo.state)
      }
      setSearchAddress(geo.displayName)
    }
  }

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormErrors({})

    const payload: CreateCustomerPayload = {
      borrower_name: borrowerName.trim(),
      business_name: businessName.trim(),
      sector,
      sub_activity: subActivity.trim(),
      district: district.trim(),
      state: state.trim(),
      latitude,
      longitude,
      soil_type: soilType,
      irrigation_access: irrigationAccess,
      utility_reliability: utilityReliability,
      supply_chain_resilience: supplyChainResilience,
      loan_amount: Number(loanAmount),
      monthly_revenue: Number(monthlyRevenue),
      repayment_score: Number(repaymentScore),
      insurance_status: insuranceStatus,
      contact_number: contactNumber.trim() || null,
      notes: notes.trim() || null,
      is_synthetic: isSynthetic,
    }

    const validation = validateCustomerPayload(payload)
    if (!validation.isValid) {
      setFormErrors(validation.errors)
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'edit' && customer) {
        const result = await updateCustomer(customer.id, payload)
        onSuccess(
          result.customer,
          result.score,
          result.recalculationTriggered
            ? `Customer updated. Climate score automatically recalculated (${liveScore.totalScore} / 100 - ${liveScore.advisoryLabel}).`
            : 'Customer updated successfully.'
        )
      } else {
        const result = await createCustomer(payload)
        onSuccess(
          result.customer,
          result.score,
          `Customer successfully registered with advisory score ${result.score.total_score}/100.`
        )
      }
      onClose()
    } catch (err: any) {
      setFormErrors({ form: err.message || 'Failed to save customer record' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-primary/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-surface-container-lowest rounded-2xl max-w-4xl w-full border border-outline-variant/30 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-lowest shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[22px]">
                {mode === 'edit' ? 'edit_note' : 'person_add'}
              </span>
            </div>
            <div>
              <h2 className="text-base font-bold text-primary flex items-center gap-2">
                {mode === 'edit' ? 'Edit Customer Profile' : 'Register New MSME / Agri Customer'}
                {isSynthetic && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container-high text-outline uppercase">
                    Synthetic Simulation
                  </span>
                )}
              </h2>
              <p className="text-xs text-on-surface-variant">
                {mode === 'edit'
                  ? 'Modifying climate or financial attributes triggers automatic score recalculation.'
                  : 'Register enterprise details and assess environmental resilience.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-outline hover:text-primary transition-colors p-1.5 rounded-xl hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Duplicate Warning Banner (Non-blocking) */}
        {duplicateWarning && (
          <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-900 text-xs flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-600">warning</span>
              <span>
                <strong>Advisory Warning:</strong> {duplicateWarning}
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded">
              Non-blocking
            </span>
          </div>
        )}

        {/* Section Navigation Tabs & Live Score Gauge Strip */}
        <div className="px-5 py-3 bg-surface-container-low border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
            {[
              { id: 'enterprise', label: '1. Enterprise', icon: 'business' },
              { id: 'location', label: '2. Location & GIS', icon: 'pin_drop' },
              { id: 'resilience', label: '3. Climate Resilience', icon: 'eco' },
              { id: 'financials', label: '4. Financials', icon: 'payments' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Live Projected Score Pill */}
          <div className="flex items-center gap-2.5 bg-surface-container-lowest px-3 py-1 rounded-xl border border-outline-variant/30">
            <span className="text-[11px] font-semibold text-on-surface-variant">Live Score:</span>
            <RiskBadge score={liveScore.totalScore} label={liveScore.advisoryLabel} size="sm" />
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 md:p-6 space-y-5 flex-1">
          {formErrors.form && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{formErrors.form}</span>
            </div>
          )}

          {/* TAB 1: Enterprise Profile */}
          {activeTab === 'enterprise' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Borrower / Proprietor Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    placeholder="e.g. Ramesh Patil"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                    required
                  />
                  {formErrors.borrower_name && (
                    <p className="text-[11px] text-error mt-1">{formErrors.borrower_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Business / Enterprise Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Patil Organic Jaggery Works"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                    required
                  />
                  {formErrors.business_name && (
                    <p className="text-[11px] text-error mt-1">{formErrors.business_name}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Economic Sector <span className="text-error">*</span>
                  </label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  >
                    <option value="Agriculture">Agriculture</option>
                    <option value="Agri-processing">Agri-processing</option>
                    <option value="Rural Retail">Rural Retail</option>
                    <option value="Handloom/Textile">Handloom/Textile</option>
                    <option value="Light Manufacturing">Light Manufacturing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Sub-activity / Crops / Operations
                  </label>
                  <input
                    type="text"
                    value={subActivity}
                    onChange={(e) => setSubActivity(e.target.value)}
                    placeholder="e.g. Sugarcane & Paddy Milling"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Contact Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="e.g. +91 98220 12345"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Officer Notes / Branch Reference
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Field verification conducted by SME-MUM team"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Geographic Location & Map Pin Picker */}
          {activeTab === 'location' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Address Search with Autocomplete */}
              <div className="relative">
                <label className="block text-xs font-semibold text-primary mb-1">
                  Search Address / Village / District (OpenStreetMap)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchAddress}
                    onChange={(e) => handleAddressSearch(e.target.value)}
                    onFocus={() => {
                      if (addressSuggestions.length > 0) setShowSuggestions(true)
                    }}
                    placeholder="Type town, mandi or village (e.g., Shirol, Kolhapur or Baramati)..."
                    className="w-full px-3.5 py-2 pl-9 pr-8 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  />
                  <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-[18px] text-outline">
                    {isSearchingAddress ? 'sync' : 'search'}
                  </span>
                  {searchAddress && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchAddress('')
                        setAddressSuggestions([])
                        setShowSuggestions(false)
                      }}
                      className="absolute right-2.5 top-2.5 text-outline hover:text-primary transition-colors"
                      title="Clear search"
                    >
                      <span className="material-symbols-outlined text-[15px]">close</span>
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 z-[1050] mt-1 bg-surface-container-lowest rounded-xl border border-outline-variant/40 shadow-xl overflow-hidden max-h-52 overflow-y-auto">
                    {addressSuggestions.length > 0 ? (
                      addressSuggestions.map((item, idx) => (
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
                            <div className="text-[10px] text-on-surface-variant truncate">
                              {item.displayName}
                            </div>
                            <div className="text-[9px] text-outline font-mono mt-0.5">
                              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)} &bull; {item.district}, {item.state}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : !isSearchingAddress && searchAddress.trim().length >= 2 ? (
                      <div className="px-3.5 py-3 text-center text-xs text-on-surface-variant">
                        No matching locations found for &ldquo;{searchAddress}&rdquo;. Try another village or town.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Interactive Mini-Map */}
              <div className="h-56 rounded-xl border border-outline-variant/30 overflow-hidden relative shadow-inner">
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
                  <MapClickHandler onLocationSelect={handleMapLocationSelect} />
                  <Marker
                    position={[latitude, longitude]}
                    icon={pinIcon}
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        const pos = e.target.getLatLng()
                        handleMapLocationSelect(pos.lat, pos.lng)
                      },
                    }}
                  />
                </MapContainer>
                <div className="absolute bottom-2 left-2 z-1000 bg-surface-container-lowest/90 backdrop-blur-xs px-2.5 py-1 rounded-lg text-[10px] font-semibold text-primary border border-outline-variant/30 pointer-events-none">
                  💡 Click map or drag pin to update GPS coordinates
                </div>
              </div>

              {/* Lat, Lon, District, State */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-primary mb-1">
                    Latitude <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-primary mb-1">
                    Longitude <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-primary mb-1">
                    District <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-primary mb-1">
                    State <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Climate Resilience Attributes */}
          {activeTab === 'resilience' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">bolt</span>
                  <strong>Score Impact:</strong> Infrastructure attributes directly modify the 25% Farm & Business Vulnerability pillar.
                </span>
                <span className="text-[10px] font-bold uppercase bg-secondary/20 px-2 py-0.5 rounded">
                  25% Pillar Weight
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1 flex items-center justify-between">
                    <span>Irrigation Access</span>
                    <span className="text-[10px] text-secondary font-semibold">⚡ Key Buffer</span>
                  </label>
                  <select
                    value={irrigationAccess}
                    onChange={(e) => setIrrigationAccess(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  >
                    <option value="Borewell + Drip">Borewell + Drip (High Resilience)</option>
                    <option value="Canal Irrigated">Canal Irrigated (Medium-High Resilience)</option>
                    <option value="Rainfed Only">Rainfed Only (High Climate Vulnerability)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1 flex items-center justify-between">
                    <span>Soil Drainage Capacity</span>
                    <span className="text-[10px] text-secondary font-semibold">⚡ Flood/Drought Mod</span>
                  </label>
                  <select
                    value={soilType}
                    onChange={(e) => setSoilType(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  >
                    <option value="Alluvial">Alluvial (Optimal Drainage & Water Retention)</option>
                    <option value="Clay Loam">Clay Loam (Moderate Drainage)</option>
                    <option value="Red Sandy">Red Sandy (Fast Leaching / Drought Vulnerable)</option>
                    <option value="Black Cotton">Black Cotton (Prone to Waterlogging)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1 flex items-center justify-between">
                    <span>Utility & Power Reliability</span>
                    <span className="text-[10px] text-secondary font-semibold">⚡ Heatwave Buffer</span>
                  </label>
                  <select
                    value={utilityReliability}
                    onChange={(e) => setUtilityReliability(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  >
                    <option value="24x7 Grid">24x7 Dedicated Industrial/Agri Feeder</option>
                    <option value="Intermittent Grid with Solar Backup">Intermittent Grid + Solar Pump / Backup</option>
                    <option value="Unreliable Grid">Unreliable Grid (&lt;6 hrs power daily)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1 flex items-center justify-between">
                    <span>Supply Chain Resilience</span>
                    <span className="text-[10px] text-secondary font-semibold">⚡ Offtake Security</span>
                  </label>
                  <select
                    value={supplyChainResilience}
                    onChange={(e) => setSupplyChainResilience(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  >
                    <option value="Direct APMC Mandi Link">Direct APMC Mandi Link / Institutional Offtake</option>
                    <option value="Interstate Cold Chain">Interstate Cold Chain / Contract Farming</option>
                    <option value="Local Village Trader">Local Village Trader / Single Road Access</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Financial Resilience Attributes */}
          {activeTab === 'financials' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">bolt</span>
                  <strong>Score Impact:</strong> Financial coverage ratio & insurance status govern the 20% Financial Buffer pillar.
                </span>
                <span className="text-[10px] font-bold uppercase bg-secondary/20 px-2 py-0.5 rounded">
                  20% Pillar Weight
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Proposed / Active Loan Amount (₹) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono"
                    required
                  />
                  {formErrors.loan_amount && (
                    <p className="text-[11px] text-error mt-1">{formErrors.loan_amount}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Average Monthly Revenue (₹) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    value={monthlyRevenue}
                    onChange={(e) => setMonthlyRevenue(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono"
                    required
                  />
                  {formErrors.monthly_revenue && (
                    <p className="text-[11px] text-error mt-1">{formErrors.monthly_revenue}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Credit Repayment Proxy Score (300 - 900) <span className="text-error">*</span>
                  </label>
                  <input
                    type="number"
                    min={300}
                    max={900}
                    value={repaymentScore}
                    onChange={(e) => setRepaymentScore(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-mono"
                    required
                  />
                  {formErrors.repayment_score && (
                    <p className="text-[11px] text-error mt-1">{formErrors.repayment_score}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Insurance Coverage Status
                  </label>
                  <select
                    value={insuranceStatus}
                    onChange={(e) => setInsuranceStatus(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  >
                    <option value="Active Crop Insurance">Active PMFBY / Crop Insurance</option>
                    <option value="Asset Insured">Asset / Machinery Insured</option>
                    <option value="Uninsured">Uninsured (Zero Climate Loss Protection)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Synthetic disclaimer toggle */}
          <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-on-surface-variant">
              <input
                type="checkbox"
                checked={isSynthetic}
                onChange={(e) => setIsSynthetic(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary/40 border-outline-variant"
              />
              <span>Mark as synthetic dataset record (for hackathon simulation)</span>
            </label>
          </div>
        </form>

        {/* Modal Footer with Advisory Disclaimer */}
        <div className="p-4 bg-surface-container-low border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-outline text-center sm:text-left">
            Advisory only. The bank makes the lending decision.
          </p>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-container shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">
                    {mode === 'edit' ? 'save' : 'check'}
                  </span>
                  <span>{mode === 'edit' ? 'Update & Recalculate' : 'Save Customer'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
