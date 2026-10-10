import { useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { EnrichedBorrower } from './BorrowerTable'
import type { RegionalHazard } from '../../types/database.types'
import RiskBadge from './RiskBadge'

interface RiskMapProps {
  borrowers: EnrichedBorrower[]
  hazards: RegionalHazard[]
  onSelectBorrower?: (borrower: EnrichedBorrower) => void
}

// Function to generate customized SVG marker pins with color-coded risk tiers
function createRiskMarkerIcon(score: number) {
  let color = '#f59e0b' // amber
  if (score >= 75) color = '#10b981' // emerald
  else if (score >= 40) color = '#f59e0b' // amber
  else if (score >= 10) color = '#f97316' // orange
  else color = '#ef4444' // red

  const html = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: ${color}; opacity: 0.25; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: relative; width: 22px; height: 22px; border-radius: 50%; background: ${color}; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 10px; font-weight: 800; font-family: Inter, sans-serif;">
        ${score}
      </div>
    </div>
  `

  return L.divIcon({
    html,
    className: 'custom-risk-pin',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -14],
  })
}

export default function RiskMap({
  borrowers,
  hazards,
  onSelectBorrower,
}: RiskMapProps) {
  const [filterMode, setFilterMode] = useState<'ALL' | 'HIGH_RISK' | 'FLOOD' | 'DROUGHT'>('ALL')

  // Filter borrowers based on selected overlay
  const filteredBorrowers = useMemo(() => {
    return borrowers.filter((b) => {
      const score = b.climateScore?.total_score ?? 50
      if (filterMode === 'HIGH_RISK') {
        return score < 40
      }
      if (filterMode === 'FLOOD') {
        const h = hazards.find((haz) => haz.district.toLowerCase() === b.district.toLowerCase())
        return (h?.flood_hazard_index ?? 0) >= 0.70
      }
      if (filterMode === 'DROUGHT') {
        const h = hazards.find((haz) => haz.district.toLowerCase() === b.district.toLowerCase())
        return (h?.drought_hazard_index ?? 0) >= 0.70
      }
      return true
    })
  }, [borrowers, hazards, filterMode])

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col">
      {/* Header and Controls */}
      <div className="p-4 border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-primary flex items-center gap-2">
            GIS Climate Vulnerability Map
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
              {filteredBorrowers.length} Markers Shown
            </span>
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Geographic risk distribution with color-coded advisory resilience pins (0-100).
          </p>
        </div>

        {/* Layer Filters */}
        <div className="flex items-center bg-surface-container-low p-1 rounded-xl gap-1">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'ALL'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            All Accounts
          </button>
          <button
            onClick={() => setFilterMode('HIGH_RISK')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'HIGH_RISK'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-orange-700 hover:bg-orange-100'
            }`}
          >
            High Risk (&lt;40)
          </button>
          <button
            onClick={() => setFilterMode('FLOOD')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'FLOOD'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-blue-700 hover:bg-blue-100'
            }`}
          >
            Flood Plains
          </button>
          <button
            onClick={() => setFilterMode('DROUGHT')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'DROUGHT'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 hover:bg-amber-100'
            }`}
          >
            Drought Belt
          </button>
        </div>
      </div>

      {/* Map Legend Bar */}
      <div className="px-4 py-2 bg-surface-container-low/80 border-b border-outline-variant/15 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-semibold text-on-surface-variant">Score Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] text-on-surface-variant">75-100 Low Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-[11px] text-on-surface-variant">40-74 Moderate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span className="text-[11px] text-on-surface-variant">10-39 High Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            <span className="text-[11px] text-on-surface-variant">0-9 Very High</span>
          </div>
        </div>

        <span className="text-[11px] text-secondary font-medium hidden sm:inline">
          OpenStreetMap Tiles • Leaflet GIS
        </span>
      </div>

      {/* Leaflet Map Canvas */}
      <div className="h-[480px] w-full relative z-0">
        <MapContainer
          center={[17.80, 76.50]}
          zoom={6}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {filteredBorrowers.map((b) => {
            const score = b.climateScore?.total_score ?? 50
            const label = b.climateScore?.advisory_label ?? 'Moderate risk'
            const icon = createRiskMarkerIcon(score)

            return (
              <Marker
                key={b.id}
                position={[b.latitude, b.longitude]}
                icon={icon}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-1 max-w-[240px] text-on-surface font-sans">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-surface-container-high text-on-surface-variant uppercase">
                        {b.sector}
                      </span>
                      <RiskBadge score={score} label={label} size="sm" />
                    </div>

                    <h4 className="font-bold text-xs text-primary leading-tight">
                      {b.business_name}
                    </h4>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      {b.borrower_name} • {b.district}
                    </p>

                    <div className="my-2 pt-1.5 border-t border-outline-variant/30 text-[11px] space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-outline">Loan Exposure:</span>
                        <span className="font-bold text-primary">{formatCurrency(b.loan_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-outline">Irrigation:</span>
                        <span className="font-medium text-primary">{b.irrigation_access}</span>
                      </div>
                    </div>

                    {b.climateScore?.top_risk_factors?.[0] && (
                      <p className="text-[10px] text-orange-900 bg-orange-50 p-1.5 rounded border border-orange-200/50 mb-2 leading-tight">
                        <strong>Primary Risk:</strong> {b.climateScore.top_risk_factors[0]}
                      </p>
                    )}

                    {onSelectBorrower && (
                      <button
                        type="button"
                        onClick={() => onSelectBorrower(b)}
                        className="w-full py-1 text-center rounded bg-primary text-white text-[11px] font-semibold hover:bg-primary-container transition-all"
                      >
                        Inspect Risk Details
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}
