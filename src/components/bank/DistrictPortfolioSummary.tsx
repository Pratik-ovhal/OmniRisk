import type { EnrichedBorrower } from './BorrowerTable'
import type { RegionalHazard } from '../../types/database.types'
import RiskBadge from './RiskBadge'

interface DistrictPortfolioSummaryProps {
  borrowers: EnrichedBorrower[]
  hazards: RegionalHazard[]
  onSelectDistrict?: (districtName: string) => void
}

export default function DistrictPortfolioSummary({
  borrowers,
  hazards,
  onSelectDistrict,
}: DistrictPortfolioSummaryProps) {
  // Aggregate by district
  const districtMap = new Map<
    string,
    {
      district: string
      state: string
      borrowerCount: number
      totalLoanAmount: number
      totalScore: number
      primaryHazard: string
    }
  >()

  borrowers.forEach((b) => {
    const key = b.district
    const hazard = hazards.find(
      (h) => h.district.toLowerCase() === b.district.toLowerCase()
    )

    let primaryHazard = 'Balanced Climate'
    if (hazard) {
      if (hazard.flood_hazard_index >= 0.7) primaryHazard = 'Riverine Flood Peril'
      else if (hazard.drought_hazard_index >= 0.7) primaryHazard = 'Drought & Water Deficit'
      else if (hazard.heat_stress_index >= 0.75) primaryHazard = 'Extreme Heat Peril'
      else if (hazard.cyclone_storm_index >= 0.6) primaryHazard = 'Coastal Cyclone Surge'
    }

    const current = districtMap.get(key) || {
      district: b.district,
      state: b.state,
      borrowerCount: 0,
      totalLoanAmount: 0,
      totalScore: 0,
      primaryHazard,
    }

    current.borrowerCount += 1
    current.totalLoanAmount += b.loan_amount
    current.totalScore += b.climateScore?.total_score ?? 50
    districtMap.set(key, current)
  })

  const districtSummaries = Array.from(districtMap.values()).map((d) => ({
    ...d,
    averageScore: Math.round(d.totalScore / d.borrowerCount),
  }))

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`
    return `₹${amount.toLocaleString('en-IN')}`
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-5">
      <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 mb-4">
        <div>
          <h2 className="text-base font-bold text-primary flex items-center gap-2">
            Regional District Exposure Analysis
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
              {districtSummaries.length} Districts
            </span>
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Geographic risk aggregation cross-referenced with World Bank climate hazards.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {districtSummaries.map((ds) => (
          <div
            key={ds.district}
            onClick={() => onSelectDistrict && onSelectDistrict(ds.district)}
            className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high/60 transition-all border border-outline-variant/25 cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-bold text-sm text-primary group-hover:text-secondary transition-colors">
                    {ds.district}
                  </h3>
                  <span className="text-[11px] text-on-surface-variant font-medium">
                    {ds.state}
                  </span>
                </div>
                <RiskBadge score={ds.averageScore} size="sm" />
              </div>

              <div className="space-y-1.5 my-3 text-xs">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Monitored MSMEs:</span>
                  <span className="font-bold text-primary">{ds.borrowerCount} accounts</span>
                </div>
                <div className="flex justify-between text-on-surface-variant">
                  <span>Portfolio Volume:</span>
                  <span className="font-bold text-primary">{formatCurrency(ds.totalLoanAmount)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px]">
              <span className="text-outline font-medium">Dominant Peril:</span>
              <span
                className={`font-semibold ${
                  ds.primaryHazard.includes('Flood')
                    ? 'text-error'
                    : ds.primaryHazard.includes('Drought')
                    ? 'text-amber-700'
                    : ds.primaryHazard.includes('Heat')
                    ? 'text-orange-700'
                    : 'text-secondary'
                }`}
              >
                {ds.primaryHazard}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
