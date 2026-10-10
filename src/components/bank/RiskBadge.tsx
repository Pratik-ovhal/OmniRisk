import type { AdvisoryLabel } from '../../types/database.types'

interface RiskBadgeProps {
  score?: number
  label?: AdvisoryLabel | string
  size?: 'sm' | 'md' | 'lg'
  showScore?: boolean
}

export default function RiskBadge({
  score,
  label,
  size = 'md',
  showScore = true,
}: RiskBadgeProps) {
  // Determine tier
  let tier: 'low' | 'moderate' | 'high' | 'critical' = 'moderate'
  let displayLabel = label || 'Moderate risk'

  if (score !== undefined) {
    if (score >= 75) {
      tier = 'low'
      displayLabel = 'Low climate risk'
    } else if (score >= 40) {
      tier = 'moderate'
      displayLabel = 'Moderate risk'
    } else if (score >= 10) {
      tier = 'high'
      displayLabel = 'High risk'
    } else {
      tier = 'critical'
      displayLabel = 'Very high risk'
    }
  } else if (label) {
    if (label.includes('Low')) tier = 'low'
    else if (label.includes('Moderate')) tier = 'moderate'
    else if (label.includes('Very high')) tier = 'critical'
    else if (label.includes('High')) tier = 'high'
  }

  const styles = {
    low: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      dot: 'bg-emerald-500',
    },
    moderate: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
      dot: 'bg-amber-500',
    },
    high: {
      bg: 'bg-orange-50 text-orange-700 border-orange-200/80',
      dot: 'bg-orange-500',
    },
    critical: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200/80',
      dot: 'bg-rose-600',
    },
  }[tier]

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  }[size]

  return (
    <span
      className={`inline-flex items-center font-bold rounded-full border ${styles.bg} ${sizeClasses} whitespace-nowrap shadow-2xs`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`}></span>
      <span>{displayLabel}</span>
      {showScore && score !== undefined && (
        <span className="font-extrabold ml-0.5">({score})</span>
      )}
    </span>
  )
}
