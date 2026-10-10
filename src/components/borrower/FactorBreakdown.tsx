import { ShieldCheck, AlertTriangle, Droplets, Sun, Landmark, Leaf, TrendingUp } from 'lucide-react'

interface FactorBreakdownProps {
  topRiskFactors: string[]
  topProtectiveFactors: string[]
  subscores?: {
    hazardSubscore: number
    vulnerabilitySubscore: number
    forecastSubscore: number
    financialSubscore: number
    satelliteBonus: number
  }
}

export default function FactorBreakdown({
  topRiskFactors,
  topProtectiveFactors,
  subscores,
}: FactorBreakdownProps) {
  return (
    <div className="space-y-6">
      {/* 5-Pillar Score Resilience Pillars (if subscores provided) */}
      {subscores && (
        <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-primary text-base">Score Component Breakdown</h3>
              <p className="text-xs text-on-surface-variant">
                Transparent multi-factor resilience subscores (0–100 scale)
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
              100% Transparent
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pillar 1: Location Hazard */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-primary" /> Location Hazard
                </span>
                <span className="font-bold text-primary">30% weight</span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-primary">{subscores.hazardSubscore}</span>
                <span className="text-xs text-on-surface-variant">/ 100</span>
              </div>
              <div className="w-full bg-outline-variant/30 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    subscores.hazardSubscore >= 70
                      ? 'bg-emerald-500'
                      : subscores.hazardSubscore >= 40
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, subscores.hazardSubscore))}%` }}
                />
              </div>
              <span className="text-[11px] text-on-surface-variant mt-2">
                Historical flood & drought index
              </span>
            </div>

            {/* Pillar 2: Business & Farm Vulnerability */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-secondary" /> Farm Vulnerability
                </span>
                <span className="font-bold text-primary">25% weight</span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-primary">{subscores.vulnerabilitySubscore}</span>
                <span className="text-xs text-on-surface-variant">/ 100</span>
              </div>
              <div className="w-full bg-outline-variant/30 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    subscores.vulnerabilitySubscore >= 70
                      ? 'bg-emerald-500'
                      : subscores.vulnerabilitySubscore >= 40
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, subscores.vulnerabilitySubscore))}%` }}
                />
              </div>
              <span className="text-[11px] text-on-surface-variant mt-2">
                Irrigation, soil drainage & power backup
              </span>
            </div>

            {/* Pillar 3: Live 7-Day Forecast */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-500" /> Live Forecast
                </span>
                <span className="font-bold text-primary">25% weight</span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-primary">{subscores.forecastSubscore}</span>
                <span className="text-xs text-on-surface-variant">/ 100</span>
              </div>
              <div className="w-full bg-outline-variant/30 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    subscores.forecastSubscore >= 70
                      ? 'bg-emerald-500'
                      : subscores.forecastSubscore >= 40
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, subscores.forecastSubscore))}%` }}
                />
              </div>
              <span className="text-[11px] text-on-surface-variant mt-2">
                Open-Meteo 7-day precipitation & heat
              </span>
            </div>

            {/* Pillar 4: Financial Resilience */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" /> Financial Buffer
                </span>
                <span className="font-bold text-primary">20% weight</span>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-black text-primary">{subscores.financialSubscore}</span>
                <span className="text-xs text-on-surface-variant">/ 100</span>
              </div>
              <div className="w-full bg-outline-variant/30 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    subscores.financialSubscore >= 70
                      ? 'bg-emerald-500'
                      : subscores.financialSubscore >= 40
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, subscores.financialSubscore))}%` }}
                />
              </div>
              <span className="text-[11px] text-on-surface-variant mt-2">
                Repayment history & active insurance
              </span>
            </div>
          </div>

          {subscores.satelliteBonus > 0 && (
            <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
              <Leaf className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Remote Sensing Vegetation Bonus (+{subscores.satelliteBonus} pts):</strong> Satellite NDVI vegetation index indicates healthy ground biomass and active moisture retention.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Strengths & Vulnerabilities Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Protective Factors (Positive) */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 border border-emerald-200/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-primary text-base">Key Protective Strengths</h3>
                <p className="text-xs text-on-surface-variant">Factors improving your resilience score</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant mb-4">
              These operational choices and financial safeguards protect your business from climate disruptions:
            </p>

            <ul className="space-y-3">
              {topProtectiveFactors.map((factor, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs text-slate-800 leading-relaxed"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                    ✓
                  </span>
                  <div>{factor}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-100 text-[11px] text-emerald-800 font-medium">
            💡 Maintaining these buffers preserves your favorable resilience ranking with lenders.
          </div>
        </div>

        {/* Climate Vulnerabilities (Risk Drivers) */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 border border-amber-200/70 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-primary text-base">Climate Vulnerabilities</h3>
                <p className="text-xs text-on-surface-variant">Factors lowering your resilience score</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant mb-4">
              Environmental hazards and operational vulnerabilities that increase exposure to seasonal shocks:
            </p>

            <ul className="space-y-3">
              {topRiskFactors.map((factor, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-xs text-slate-800 leading-relaxed"
                >
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                    !
                  </span>
                  <div>{factor}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-200/60 text-[11px] text-amber-900 font-medium">
            🛡️ See the independent insurance guidance below to hedge against these specific risks.
          </div>
        </div>
      </div>
    </div>
  )
}
