import RiskBadge from '../bank/RiskBadge'
import type { AdvisoryLabel } from '../../types/database.types'

interface ScoreGaugeProps {
  score: number
  label: AdvisoryLabel | string
}

export default function ScoreGauge({ score, label }: ScoreGaugeProps) {
  // SVG semi-circle gauge calculation
  // Radius = 90, Circumference of half circle = Math.PI * 90 = ~282.74
  const radius = 80
  const circumference = Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  let gaugeColor = '#f59e0b'
  if (score >= 75) gaugeColor = '#10b981'
  else if (score >= 40) gaugeColor = '#f59e0b'
  else if (score >= 10) gaugeColor = '#f97316'
  else gaugeColor = '#ef4444'

  return (
    <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
      {/* Subtle background glow */}
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ backgroundColor: gaugeColor }}
      />

      <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
        Climate Resilience Score
      </span>

      {/* Radial Gauge SVG */}
      <div className="relative w-56 h-32 flex items-end justify-center mb-2">
        <svg
          className="w-56 h-56 transform -rotate-180 absolute top-0"
          viewBox="0 0 200 200"
        >
          {/* Background Arc */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="#eceef1"
            strokeWidth="16"
            strokeDasharray={circumference}
            strokeDashoffset="0"
            strokeLinecap="round"
          />

          {/* Value Progress Arc */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={gaugeColor}
            strokeWidth="16"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Score Counter */}
        <div className="flex flex-col items-center justify-center pb-2 z-10">
          <span className="text-5xl font-black text-primary tracking-tight">
            {score}
          </span>
          <span className="text-xs font-bold text-outline uppercase tracking-wider">
            out of 100
          </span>
        </div>
      </div>

      {/* Advisory Badge */}
      <div className="mt-2 mb-3">
        <RiskBadge score={score} label={label} size="lg" />
      </div>

      {/* Explicit Advisory Mandate Banner */}
      <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20 max-w-md w-full text-xs text-on-surface-variant leading-relaxed">
        <strong className="text-primary font-bold">Awareness & Advisory Tool:</strong> This score reflects environmental climate exposure and resilience buffers. It is not a loan approval or rejection decision.
      </div>
    </div>
  )
}
