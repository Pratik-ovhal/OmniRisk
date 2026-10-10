import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import type { EnrichedBorrower } from './BorrowerTable'
import type { RegionalHazard, ScoreHistory, ClimateAlert, RiskCheck } from '../../types/database.types'
import type { WeatherSummary } from '../../types/weather.types'
import { fetchWeatherForecast } from '../../api/openMeteo'
import { fetchCustomerById } from '../../api/customerService'
import RiskBadge from './RiskBadge'
import WeatherForecastWidget from '../common/WeatherForecastWidget'

interface BorrowerDetailModalProps {
  borrower: EnrichedBorrower | null
  hazard?: RegionalHazard
  onClose: () => void
  onEdit?: (borrower: EnrichedBorrower) => void
  onArchive?: (borrower: EnrichedBorrower) => void
}

export default function BorrowerDetailModal({
  borrower,
  hazard,
  onClose,
  onEdit,
  onArchive,
}: BorrowerDetailModalProps) {
  const navigate = useNavigate()
  const [weather, setWeather] = useState<WeatherSummary | null>(null)
  const [loadingWeather, setLoadingWeather] = useState(false)
  const [copied, setCopied] = useState(false)

  // Loaded relational data
  const [scoreHistory, setScoreHistory] = useState<ScoreHistory[]>([])
  const [alerts, setAlerts] = useState<ClimateAlert[]>([])
  const [riskChecks, setRiskChecks] = useState<RiskCheck[]>([])

  useEffect(() => {
    if (borrower) {
      setLoadingWeather(true)
      fetchWeatherForecast(borrower.latitude, borrower.longitude)
        .then((w) => setWeather(w))
        .catch(console.error)
        .finally(() => setLoadingWeather(false))

      // Load deep details (history, alerts, risk checks)
      fetchCustomerById(borrower.id)
        .then((res) => {
          setScoreHistory(res.scoreHistory || [])
          setAlerts(res.alerts || [])
          setRiskChecks(res.riskChecks || [])
        })
        .catch((err) => {
          console.warn('Could not load extra relational customer details:', err.message)
        })
    }
  }, [borrower])

  if (!borrower) return null

  const score = borrower.climateScore?.total_score ?? 50
  const label = borrower.climateScore?.advisory_label ?? 'Moderate risk'
  const portalUrl = `${window.location.origin}/borrower/${borrower.public_token}`

  const copyLink = () => {
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const formatCurrency = (amt: number) => `₹${amt.toLocaleString('en-IN')}`

  // Format chart history data
  const chartData = scoreHistory.length > 0
    ? scoreHistory.slice().reverse().map((sh, idx) => ({
        date: new Date(sh.recorded_at).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
        }),
        score: sh.score,
        step: `Check #${idx + 1}`,
      }))
    : [
        { date: 'Initial', score: score, step: 'Base' },
        { date: 'Current', score: score, step: 'Current' },
      ]

  const handleRunRiskCheck = () => {
    onClose()
    navigate('/pre-loan-check', {
      state: {
        prefillCustomer: borrower,
        latitude: borrower.latitude,
        longitude: borrower.longitude,
        district: borrower.district,
        state: borrower.state,
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-primary/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-surface-container-lowest rounded-2xl max-w-4xl w-full border border-outline-variant/30 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-5 md:p-6 border-b border-outline-variant/20 flex items-start justify-between gap-4 bg-surface-container-lowest shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant uppercase">
                {borrower.sector}
              </span>
              <span className="text-xs text-outline">•</span>
              <span className="text-xs font-medium text-on-surface-variant">
                {borrower.district}, {borrower.state}
              </span>
              {borrower.is_archived && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                  Archived Customer
                </span>
              )}
              {borrower.is_synthetic && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container-high text-outline uppercase">
                  Synthetic Dataset
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-primary mt-1">
              {borrower.business_name}
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Proprietor: <strong className="text-primary">{borrower.borrower_name}</strong>
              {borrower.sub_activity && ` • ${borrower.sub_activity}`}
              {borrower.contact_number && ` • Tel: ${borrower.contact_number}`}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <RiskBadge score={score} label={label} size="lg" />
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container-high transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 md:px-6 py-2.5 bg-surface-container-low border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(borrower)}
                className="px-3 py-1.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high border border-outline-variant/30 text-primary text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-[15px]">edit</span>
                <span>Edit Profile</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRunRiskCheck}
              className="px-3 py-1.5 rounded-xl bg-secondary/15 hover:bg-secondary/25 text-secondary border border-secondary/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[15px]">radar</span>
              <span>Run Pre-Loan Risk Check</span>
            </button>

            {onArchive && !borrower.is_archived && (
              <button
                type="button"
                onClick={() => onArchive(borrower)}
                className="px-3 py-1.5 rounded-xl text-amber-700 hover:bg-amber-50 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <span className="material-symbols-outlined text-[15px]">archive</span>
                <span>Archive</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-lowest hover:bg-surface-container-high border border-outline-variant/30 text-primary flex items-center gap-1.5 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px]">
                {copied ? 'check' : 'share'}
              </span>
              <span>{copied ? 'Copied Link!' : 'Awareness Portal'}</span>
            </button>
            <a
              href={`/borrower/${borrower.public_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1"
            >
              <span>Open</span>
              <span className="material-symbols-outlined text-[13px]">open_in_new</span>
            </a>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 md:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Active Climate Alerts Tray */}
          {alerts.length > 0 && (
            <div className="p-4 rounded-xl bg-error-container/20 border border-error-container/40 space-y-2">
              <div className="flex items-center gap-2 text-error font-bold text-xs uppercase tracking-wider">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                <span>Active Climate Alerts for this Location ({alerts.length})</span>
              </div>
              <div className="space-y-2">
                {alerts.map((al) => (
                  <div
                    key={al.id}
                    className="p-3 bg-surface-container-lowest rounded-xl border border-error-container/30 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-primary">{al.headline}</div>
                      <p className="text-on-surface-variant text-[11px] mt-0.5">{al.details}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-error/10 text-error shrink-0">
                      {al.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financials & Infrastructure Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-surface-container-low rounded-xl border border-outline-variant/25">
            <div>
              <span className="text-[11px] text-on-surface-variant font-medium">Loan Exposure</span>
              <div className="text-sm font-bold text-primary mt-0.5">{formatCurrency(borrower.loan_amount)}</div>
            </div>
            <div>
              <span className="text-[11px] text-on-surface-variant font-medium">Monthly Revenue</span>
              <div className="text-sm font-bold text-primary mt-0.5">{formatCurrency(borrower.monthly_revenue)}</div>
            </div>
            <div>
              <span className="text-[11px] text-on-surface-variant font-medium">Repayment Score</span>
              <div className="text-sm font-bold text-secondary mt-0.5">{borrower.repayment_score} / 900</div>
            </div>
            <div>
              <span className="text-[11px] text-on-surface-variant font-medium">Insurance Status</span>
              <div className="text-xs font-bold text-primary mt-1 truncate">{borrower.insurance_status}</div>
            </div>
          </div>

          {/* Infrastructure Specifications */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/20 text-xs">
            <div>
              <span className="text-[10px] text-outline font-semibold uppercase">Irrigation</span>
              <div className="font-semibold text-primary mt-0.5">{borrower.irrigation_access}</div>
            </div>
            <div>
              <span className="text-[10px] text-outline font-semibold uppercase">Soil Type</span>
              <div className="font-semibold text-primary mt-0.5">{borrower.soil_type}</div>
            </div>
            <div>
              <span className="text-[10px] text-outline font-semibold uppercase">Power Feeder</span>
              <div className="font-semibold text-primary mt-0.5">{borrower.utility_reliability}</div>
            </div>
            <div>
              <span className="text-[10px] text-outline font-semibold uppercase">Supply Chain</span>
              <div className="font-semibold text-primary mt-0.5">{borrower.supply_chain_resilience}</div>
            </div>
          </div>

          {/* Regional World Bank Hazard Benchmarks */}
          {hazard && (
            <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">public</span>
                World Bank Regional Hazards for {hazard.district}:
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="font-medium text-on-surface-variant">
                  Flood: <strong className="text-primary">{Math.round(hazard.flood_hazard_index * 100)}%</strong>
                </span>
                <span className="font-medium text-on-surface-variant">
                  Drought: <strong className="text-primary">{Math.round(hazard.drought_hazard_index * 100)}%</strong>
                </span>
                <span className="font-medium text-on-surface-variant">
                  Heat: <strong className="text-primary">{Math.round(hazard.heat_stress_index * 100)}%</strong>
                </span>
              </div>
            </div>
          )}

          {/* Score History Progression Timeline Chart */}
          <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/25 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">trending_up</span>
                <span>Historical Climate Risk Score Progression (Score History)</span>
              </h3>
              <span className="text-[11px] font-semibold text-outline">
                {scoreHistory.length} audit records logged
              </span>
            </div>

            <div className="h-44 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6c757d' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6c757d' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      fontSize: '11px',
                      border: '1px solid #dcdcdc',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="Climate Risk Score"
                    stroke="#006a61"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#006a61' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subscores Grid */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2.5">
              Multi-Factor Resilience Subscores (0 - 100)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-surface-container-low rounded-xl text-center border border-outline-variant/20">
                <span className="text-[11px] font-medium text-on-surface-variant">Location Hazard</span>
                <div className="text-lg font-extrabold text-primary mt-1">
                  {borrower.climateScore?.hazard_subscore ?? 60}
                </div>
                <span className="text-[10px] text-outline font-semibold">30% Weight</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl text-center border border-outline-variant/20">
                <span className="text-[11px] font-medium text-on-surface-variant">Farm Vulnerability</span>
                <div className="text-lg font-extrabold text-primary mt-1">
                  {borrower.climateScore?.vulnerability_subscore ?? 55}
                </div>
                <span className="text-[10px] text-outline font-semibold">25% Weight</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl text-center border border-outline-variant/20">
                <span className="text-[11px] font-medium text-on-surface-variant">7-Day Live Forecast</span>
                <div className="text-lg font-extrabold text-primary mt-1">
                  {borrower.climateScore?.forecast_subscore ?? 70}
                </div>
                <span className="text-[10px] text-outline font-semibold">25% Weight</span>
              </div>
              <div className="p-3 bg-surface-container-low rounded-xl text-center border border-outline-variant/20">
                <span className="text-[11px] font-medium text-on-surface-variant">Financial Buffer</span>
                <div className="text-lg font-extrabold text-primary mt-1">
                  {borrower.climateScore?.financial_subscore ?? 65}
                </div>
                <span className="text-[10px] text-outline font-semibold">20% Weight</span>
              </div>
            </div>
          </div>

          {/* Factor Explanations: Top Risks vs Top Protective */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Top Risk Drivers */}
            <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200/60">
              <div className="flex items-center gap-2 mb-2.5 text-orange-800">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                <h4 className="text-xs font-bold uppercase tracking-wider">Top Climate Risk Drivers</h4>
              </div>
              <ul className="space-y-2">
                {(borrower.climateScore?.top_risk_factors || [
                  'Exposure to local watershed runoff during seasonal monsoons',
                  'Rainfed irrigation increases susceptibility to moisture stress',
                ]).map((rf, i) => (
                  <li key={i} className="text-xs text-orange-950 flex items-start gap-1.5 leading-relaxed">
                    <span className="text-orange-500 font-bold shrink-0">•</span>
                    <span>{rf}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Top Protective Factors */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
              <div className="flex items-center gap-2 mb-2.5 text-emerald-800">
                <span className="material-symbols-outlined text-[18px]">verified</span>
                <h4 className="text-xs font-bold uppercase tracking-wider">Resilience Buffers</h4>
              </div>
              <ul className="space-y-2">
                {(borrower.climateScore?.top_protective_factors || [
                  'Consistent repayment history supports financial resilience buffer',
                  'Accessible local market linkages support revenue realization',
                ]).map((pf, i) => (
                  <li key={i} className="text-xs text-emerald-950 flex items-start gap-1.5 leading-relaxed">
                    <span className="text-emerald-500 font-bold shrink-0">•</span>
                    <span>{pf}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Linked Pre-Loan Risk Checks History */}
          {riskChecks.length > 0 && (
            <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-secondary">history</span>
                <span>Linked Pre-Loan Risk Checks ({riskChecks.length})</span>
              </h4>
              <div className="divide-y divide-outline-variant/15">
                {riskChecks.map((rc) => (
                  <div key={rc.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-primary">{rc.location_name}</span>
                      <span className="text-outline text-[11px] ml-2">
                        {new Date(rc.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container-high font-semibold text-on-surface-variant">
                        {rc.check_type === 'AREA_ONLY' ? 'Area-only' : 'Area + business'}
                      </span>
                      <RiskBadge score={rc.score} label={rc.advisory_label} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Independent Insurance Suggestion */}
          <div className="p-4 rounded-xl bg-secondary-container/20 border border-secondary/30">
            <div className="flex items-center gap-2 mb-1.5 text-secondary">
              <span className="material-symbols-outlined text-[18px]">health_and_safety</span>
              <h4 className="text-xs font-bold uppercase tracking-wider">Independent Advisory & Insurance Guidance</h4>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {borrower.climateScore?.insurance_suggestion ||
                'Recommend MSME Climate Perils Cover to hedge against unseasonal storms and localized weather shocks.'}
            </p>
            <p className="text-[10px] text-outline mt-1.5">
              *Advisory suggestion only. Keeps credit scoring neutral and decoupled from loan approval decisions.
            </p>
          </div>

          {/* Live Open-Meteo Weather Widget for Borrower Coordinates */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Live Weather Forecast for {borrower.district}
            </h3>
            <WeatherForecastWidget
              weather={weather}
              loading={loadingWeather}
              onRefresh={() => {
                setLoadingWeather(true)
                fetchWeatherForecast(borrower.latitude, borrower.longitude, true)
                  .then((w) => setWeather(w))
                  .finally(() => setLoadingWeather(false))
              }}
            />
          </div>
        </div>

        {/* Mandatory Advisory Disclaimer Footer */}
        <div className="p-4 bg-surface-container-low border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-outline text-center sm:text-left">
            Advisory only. The bank makes the lending decision.
          </p>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary-container transition-all"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  )
}
