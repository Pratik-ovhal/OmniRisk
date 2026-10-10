import { useState, useEffect } from 'react'
import type { RiskCheck, RiskCheckFilter } from '../../types/database.types'
import { fetchRiskChecks } from '../../api/riskCheckService'
import RiskBadge from './RiskBadge'

interface RiskCheckHistoryProps {
  isOpen: boolean
  onClose: () => void
  onSelectCheck: (check: RiskCheck) => void
}

export default function RiskCheckHistory({
  isOpen,
  onClose,
  onSelectCheck,
}: RiskCheckHistoryProps) {
  const [checks, setChecks] = useState<RiskCheck[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<'ALL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'AREA_ONLY' | 'AREA_AND_BUSINESS'>('ALL')

  useEffect(() => {
    if (!isOpen) return
    loadHistory()
  }, [isOpen, tierFilter, typeFilter])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const filter: RiskCheckFilter = {
        riskTier: tierFilter,
        checkType: typeFilter,
        search: search.trim() || undefined,
      }
      const data = await fetchRiskChecks(filter)
      setChecks(data)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadHistory()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-primary/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface-container-lowest w-full max-w-lg h-full border-l border-outline-variant/30 shadow-2xl flex flex-col animate-slideLeft">
        {/* Header */}
        <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">history</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-primary">Pre-Loan Risk Check History</h3>
              <p className="text-xs text-on-surface-variant">Audit trail of past location assessments</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-surface-container-low border-b border-outline-variant/15 space-y-2.5">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search location or district..."
              className="w-full px-3 py-1.5 pl-8 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
            />
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-[15px] text-outline">
              search
            </span>
          </form>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-[11px] font-semibold text-primary"
            >
              <option value="ALL">All Check Types</option>
              <option value="AREA_ONLY">Area-Only Checks</option>
              <option value="AREA_AND_BUSINESS">Area + Business</option>
            </select>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-[11px] font-semibold text-primary"
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="LOW">Low Risk</option>
              <option value="MODERATE">Moderate Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="CRITICAL">Very High Risk</option>
            </select>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="p-12 text-center text-on-surface-variant">
              <div className="w-8 h-8 border-3 border-secondary/20 border-t-secondary rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-semibold">Loading audit history...</p>
            </div>
          ) : checks.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[32px] text-outline mb-1">history_toggle_off</span>
              <p className="text-xs font-semibold">No assessment records found</p>
              <p className="text-[11px] text-outline mt-0.5">Run a new pre-loan check to generate logs.</p>
            </div>
          ) : (
            checks.map((check) => (
              <div
                key={check.id}
                onClick={() => {
                  onSelectCheck(check)
                  onClose()
                }}
                className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/25 cursor-pointer transition-all hover:shadow-xs group"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <h4 className="font-bold text-xs text-primary group-hover:text-secondary transition-colors">
                      {check.location_name}
                    </h4>
                    <p className="text-[11px] text-on-surface-variant">
                      {check.district}, {check.state}
                    </p>
                  </div>
                  <RiskBadge score={check.score} label={check.advisory_label} size="sm" />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15 text-[10px] text-outline">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.2 rounded bg-surface-container-lowest font-semibold text-primary">
                      {check.check_type === 'AREA_ONLY' ? 'Area-Only (55%)' : 'Area + Business (100%)'}
                    </span>
                    <span>
                      Hazard: {check.subscores_snapshot.hazardSubscore}
                    </span>
                  </div>
                  <span>
                    {new Date(check.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-surface-container-low border-t border-outline-variant/20 text-center text-[10px] text-outline">
          Advisory only. Pre-loan check snapshots are preserved for institutional audit.
        </div>
      </div>
    </div>
  )
}
