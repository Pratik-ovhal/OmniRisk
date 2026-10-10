interface PortfolioMetricsProps {
  totalLoanAmount: number
  borrowerCount: number
  highRiskCount: number
  criticalAlertCount: number
  averageScore: number
}

export default function PortfolioMetricStrip({
  totalLoanAmount,
  borrowerCount,
  highRiskCount,
  criticalAlertCount,
  averageScore,
}: PortfolioMetricsProps) {
  // Format INR currency
  const formatInr = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} Lakh`
    }
    return `₹${amount.toLocaleString('en-IN')}`
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Metric 1: Total Portfolio */}
      <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
        <div className="flex items-center justify-between text-on-surface-variant mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Monitored Portfolio</span>
          <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
          </div>
        </div>
        <div>
          <div className="text-2xl font-extrabold text-primary tracking-tight">
            {formatInr(totalLoanAmount)}
          </div>
          <div className="text-xs text-on-surface-variant mt-1 flex items-center gap-1 font-medium">
            <span>{borrowerCount} MSME / Agri Accounts</span>
          </div>
        </div>
      </div>

      {/* Metric 2: Climate-Exposed High Risk */}
      <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
        <div className="flex items-center justify-between text-on-surface-variant mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">High Climate Exposure</span>
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
            <span className="material-symbols-outlined text-[18px]">crisis_alert</span>
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-orange-600 tracking-tight">
              {highRiskCount}
            </span>
            <span className="text-xs font-bold text-orange-700 bg-orange-100/60 px-2 py-0.5 rounded-full">
              {borrowerCount > 0 ? `${Math.round((highRiskCount / borrowerCount) * 100)}%` : '0%'}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Accounts requiring insurance & monitoring
          </p>
        </div>
      </div>

      {/* Metric 3: Active Weather Alerts */}
      <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
        <div className="flex items-center justify-between text-on-surface-variant mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Active Weather Triggers</span>
          <div className="w-8 h-8 rounded-lg bg-error-container/50 flex items-center justify-center text-error">
            <span className="material-symbols-outlined text-[18px]">warning</span>
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-error tracking-tight">
              {criticalAlertCount}
            </span>
            <span className="text-xs font-bold text-error bg-error-container px-2 py-0.5 rounded-full animate-pulse">
              Live Triggers
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            7-day rainfall or heat anomalies active
          </p>
        </div>
      </div>

      {/* Metric 4: Portfolio Resilience Score */}
      <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
        <div className="flex items-center justify-between text-on-surface-variant mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Avg Climate Score</span>
          <div className="w-8 h-8 rounded-lg bg-secondary-container/40 flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[18px]">speed</span>
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-primary tracking-tight">
              {averageScore}
            </span>
            <span className="text-xs text-on-surface-variant font-semibold">/ 100</span>
            <span className="text-xs font-bold text-secondary bg-secondary-container/40 px-2 py-0.5 rounded-full">
              {averageScore >= 75 ? 'Low Risk' : averageScore >= 40 ? 'Moderate' : 'High Risk'}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Portfolio weighted climate resilience
          </p>
        </div>
      </div>
    </div>
  )
}
