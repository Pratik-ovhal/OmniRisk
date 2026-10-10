import { ShieldCheck, Info, Umbrella, AlertCircle } from 'lucide-react'
import type { Borrower, RegionalHazard } from '../../types/database.types'
import type { WeatherSummary } from '../../types/weather.types'

interface InsuranceAdviceProps {
  borrower: Borrower
  hazard?: RegionalHazard | null
  weather?: WeatherSummary | null
  insuranceSuggestion: string
}

interface SchemeItem {
  id: string
  title: string
  category: string
  subsidyBadge: string
  description: string
  trigger: string
  isRecommended: boolean
}

export default function InsuranceAdvice({
  borrower,
  hazard,
  weather,
  insuranceSuggestion,
}: InsuranceAdviceProps) {
  // Determine relevant schemes based on environmental profile
  const isFloodExposed = (hazard?.flood_hazard_index ?? 0) >= 0.65 || (weather?.totalPrecipitation7d ?? 0) >= 70
  const isDroughtExposed = (hazard?.drought_hazard_index ?? 0) >= 0.65
  const isHeatExposed = (hazard?.heat_stress_index ?? 0) >= 0.70
  const isMSME = borrower.sector === 'Light Manufacturing' || borrower.sector === 'Retail' || borrower.sector === 'Agri-processing'

  const schemes: SchemeItem[] = [
    {
      id: 'pmfby',
      title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
      category: 'Government Subsidized Crop Cover',
      subsidyBadge: 'Govt Subsidized (1.5% - 2% Farmer Share)',
      description: 'Comprehensive yield loss protection from pre-sowing to post-harvest stages against flood, unseasonal inundation, and natural perils.',
      trigger: 'Loss assessment via Crop Cutting Experiments (CCE) and localized calamity satellite surveying.',
      isRecommended: isFloodExposed || !isMSME,
    },
    {
      id: 'wbcis',
      title: 'Weather-Based Crop Insurance Scheme (WBCIS)',
      category: 'Parametric Weather Index',
      subsidyBadge: 'Direct Bank Account Settlement',
      description: 'Parametric index insurance indemnifying farmers against weather shocks such as rainfall deficit, consecutive dry days, and unseasonal temperatures.',
      trigger: 'Automated IMD / Automatic Weather Station (AWS) data trigger without waiting for manual crop damage appraisal.',
      isRecommended: isDroughtExposed || isHeatExposed,
    },
    {
      id: 'parametric_flood',
      title: 'Parametric Excess Rainfall & Inundation Cover',
      category: 'Rapid Liquidity Rider',
      subsidyBadge: 'Payout within 72 hours of trigger',
      description: 'Pre-agreed instant payout when 72-hour rainfall exceeds danger thresholds (e.g., >80mm in 24 hours), enabling immediate farm rehabilitation.',
      trigger: 'Satellite gridded rainfall / Open-Meteo & IMD radar threshold exceedance.',
      isRecommended: isFloodExposed,
    },
    {
      id: 'msme_asset',
      title: 'MSME Climate Perils & Business Interruption Cover',
      category: 'Commercial Asset Shield',
      subsidyBadge: 'Machinery & Finished Stock',
      description: 'Covers physical damage to grain mills, warehouse inventory, solar arrays, and refrigeration equipment due to urban waterlogging or storm winds.',
      trigger: 'Material physical damage surveyor verification + operational outage support.',
      isRecommended: isMSME || borrower.utility_reliability === 'Unreliable Grid',
    },
  ]

  return (
    <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
            <Umbrella className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary">Independent Climate Protection Guidance</h2>
            <p className="text-xs text-on-surface-variant">
              Personalized risk hedges tailored to {borrower.business_name}
            </p>
          </div>
        </div>

        {/* Decoupled Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold self-start sm:self-auto border border-outline-variant/40">
          <Info className="w-3.5 h-3.5 text-secondary" />
          <span>Decoupled • Advisory Only</span>
        </div>
      </div>

      {/* Primary Contextual Suggestion Banner */}
      <div className="p-4 rounded-2xl bg-secondary/5 border border-secondary/20 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-secondary">
            Primary Advisory Recommendation
          </div>
          <p className="text-sm font-medium text-primary leading-relaxed">
            {insuranceSuggestion}
          </p>
        </div>
      </div>

      {/* Grid of Recommended Schemes */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
          Available Protection Schemes for Your Sector ({borrower.sector})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schemes.map((scheme) => (
            <div
              key={scheme.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                scheme.isRecommended
                  ? 'border-secondary/40 bg-secondary/[0.02] shadow-sm'
                  : 'border-outline-variant/30 bg-surface-container-low/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {scheme.isRecommended ? (
                      <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-outline-variant" />
                    )}
                    <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">
                      {scheme.category}
                    </span>
                  </div>

                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant border border-outline-variant/30">
                    {scheme.subsidyBadge}
                  </span>
                </div>

                <h4 className="font-bold text-primary text-sm mb-1.5">{scheme.title}</h4>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-3">
                  {scheme.description}
                </p>
              </div>

              <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between text-[11px]">
                <span className="text-on-surface-variant line-clamp-1 mr-2">
                  <strong>Trigger:</strong> {scheme.trigger}
                </span>
                {scheme.isRecommended && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold shrink-0 text-[10px]">
                    Recommended
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Non-Lending Mandate Disclaimer Box */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-950 leading-relaxed">
          <strong>Strict Non-Lending Mandate & Policy Neutrality:</strong> OmniRisk is an environmental awareness advisory. Insurance adoption is completely optional and evaluated independently through licensed insurers. The bank does not condition loan sanction on specific insurance products.
        </div>
      </div>
    </div>
  )
}
