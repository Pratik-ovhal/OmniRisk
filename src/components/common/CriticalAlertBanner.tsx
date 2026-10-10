import { useState } from 'react'
import type { AlertWithBorrower } from '../../api/alertService'

interface CriticalAlertBannerProps {
  alerts: AlertWithBorrower[]
  onViewAll?: () => void
}

export default function CriticalAlertBanner({ alerts, onViewAll }: CriticalAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL')
  if (dismissed || criticalAlerts.length === 0) return null

  const topAlert = criticalAlerts[0]

  return (
    <div className="bg-error text-white px-4 py-3 rounded-2xl shadow-md flex items-center justify-between gap-4 mb-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[20px] text-white">crisis_alert</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
              High Severity Trigger
            </span>
            <span className="text-sm font-bold truncate max-w-xl">
              {topAlert.headline}
            </span>
          </div>
          <p className="text-xs text-white/90 mt-0.5 hidden sm:block">
            {criticalAlerts.length} MSME loan accounts currently exposed to active climate peril triggers.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="px-3 py-1.5 rounded-lg bg-white text-error font-bold text-xs hover:bg-white/90 transition-all shadow-sm"
          >
            Review {criticalAlerts.length} Alerts
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all"
          title="Dismiss banner"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  )
}
