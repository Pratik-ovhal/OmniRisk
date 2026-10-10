import { useState } from 'react'
import type { AlertWithBorrower } from '../../api/alertService'
import type { AlertSeverity } from '../../types/database.types'

interface AlertCenterProps {
  alerts: AlertWithBorrower[]
  onResolve?: (alertId: string) => void
  onSelectBorrower?: (borrowerId: string) => void
}

export default function AlertCenter({
  alerts,
  onResolve,
  onSelectBorrower,
}: AlertCenterProps) {
  const [filter, setFilter] = useState<AlertSeverity | 'ALL'>('ALL')

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL').length
  const warningCount = alerts.filter((a) => a.severity === 'WARNING').length
  const infoCount = alerts.filter((a) => a.severity === 'INFO').length

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'ALL') return true
    return a.severity === filter
  })

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-error-container text-on-error-container flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[20px]">notification_important</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-primary flex items-center gap-2">
              Climate Early Warning Center
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-error-container text-on-error-container">
                {alerts.length} Active
              </span>
            </h2>
            <p className="text-xs text-on-surface-variant">
              Correlating 7-day Open-Meteo forecasts with regional borrower vulnerability
            </p>
          </div>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center bg-surface-container-low p-1 rounded-xl">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'ALL'
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            All ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('CRITICAL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              filter === 'CRITICAL'
                ? 'bg-error text-white shadow-sm'
                : 'text-error hover:bg-error-container/40'
            }`}
          >
            Critical ({criticalCount})
          </button>
          <button
            onClick={() => setFilter('WARNING')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'WARNING'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-700 hover:bg-amber-100'
            }`}
          >
            Warning ({warningCount})
          </button>
          <button
            onClick={() => setFilter('INFO')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === 'INFO'
                ? 'bg-secondary text-white shadow-sm'
                : 'text-secondary hover:bg-secondary-container/40'
            }`}
          >
            Info ({infoCount})
          </button>
        </div>
      </div>

      {/* Alert List */}
      <div className="divide-y divide-outline-variant/15 max-h-[420px] overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[32px] text-outline mb-2">task_alt</span>
            <p className="text-sm font-semibold text-primary">No active alerts in this category</p>
            <p className="text-xs mt-1">All borrowers in this portfolio segment have benign climate conditions.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL'
            const isWarning = alert.severity === 'WARNING'

            const badgeBg = isCritical
              ? 'bg-error-container text-on-error-container border-error/20'
              : isWarning
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-secondary-container/40 text-secondary border-secondary/20'

            const icon = isCritical ? 'warning' : isWarning ? 'crisis_alert' : 'info'

            return (
              <div
                key={alert.id}
                className="p-4 hover:bg-surface-container-low/60 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${badgeBg}`}>
                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${badgeBg}`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs font-bold text-primary">{alert.headline}</span>
                    </div>

                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {alert.details}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-on-surface-variant">
                      <span className="font-semibold text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">thunderstorm</span>
                        {alert.forecast_metric}
                      </span>
                      {alert.borrower && (
                        <>
                          <span>•</span>
                          <span className="font-medium text-primary">
                            Borrower: {alert.borrower.business_name} ({alert.borrower.district})
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {onSelectBorrower && alert.borrower_id && (
                    <button
                      type="button"
                      onClick={() => onSelectBorrower(alert.borrower_id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-container-high hover:bg-surface-container-highest text-primary transition-all"
                    >
                      Inspect Risk
                    </button>
                  )}
                  {onResolve && (
                    <button
                      type="button"
                      onClick={() => onResolve(alert.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-outline hover:text-primary hover:bg-surface-container-low transition-all"
                      title="Dismiss alert"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
