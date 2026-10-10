import { useState, useMemo } from 'react'
import type { Borrower, ClimateScore } from '../../types/database.types'
import RiskBadge from './RiskBadge'

export interface EnrichedBorrower extends Borrower {
  climateScore?: ClimateScore
  rain7d?: number
}

interface BorrowerTableProps {
  borrowers: EnrichedBorrower[]
  onSelectBorrower: (borrower: EnrichedBorrower) => void
  onAddBorrower?: () => void
  onEditBorrower?: (borrower: EnrichedBorrower) => void
  onArchiveBorrower?: (borrower: EnrichedBorrower) => void
  onRestoreBorrower?: (borrower: EnrichedBorrower) => void
}

export default function BorrowerTable({
  borrowers,
  onSelectBorrower,
  onAddBorrower,
  onEditBorrower,
  onArchiveBorrower,
  onRestoreBorrower,
}: BorrowerTableProps) {
  // Tab: active vs archived
  const [viewTab, setViewTab] = useState<'active' | 'archived'>('active')

  // Search & Filters
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('ALL')
  const [riskFilter, setRiskFilter] = useState('ALL')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'district' | 'loan_amount' | 'score' | 'created_at'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Separate active and archived counts
  const activeCount = useMemo(() => borrowers.filter((b) => !b.is_archived).length, [borrowers])
  const archivedCount = useMemo(() => borrowers.filter((b) => b.is_archived).length, [borrowers])

  // Filter pipeline
  const filtered = useMemo(() => {
    return borrowers.filter((b) => {
      // 1. Tab check
      if (viewTab === 'active' && b.is_archived) return false
      if (viewTab === 'archived' && !b.is_archived) return false

      // 2. Search
      const q = search.trim().toLowerCase()
      if (q) {
        const matchesSearch =
          b.borrower_name.toLowerCase().includes(q) ||
          b.business_name.toLowerCase().includes(q) ||
          b.district.toLowerCase().includes(q) ||
          (b.contact_number && b.contact_number.includes(q))
        if (!matchesSearch) return false
      }

      // 3. Sector
      if (sectorFilter !== 'ALL' && b.sector !== sectorFilter) return false

      // 4. Risk Tier
      if (riskFilter !== 'ALL') {
        const score = b.climateScore?.total_score ?? 50
        if (riskFilter === 'LOW' && score < 75) return false
        if (riskFilter === 'MODERATE' && (score < 40 || score >= 75)) return false
        if (riskFilter === 'HIGH' && (score < 10 || score >= 40)) return false
        if (riskFilter === 'CRITICAL' && score >= 10) return false
      }

      return true
    })
  }, [borrowers, viewTab, search, sectorFilter, riskFilter])

  // Sort pipeline
  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      let comp = 0
      if (sortBy === 'name') {
        comp = a.business_name.localeCompare(b.business_name)
      } else if (sortBy === 'district') {
        comp = a.district.localeCompare(b.district)
      } else if (sortBy === 'loan_amount') {
        comp = (a.loan_amount || 0) - (b.loan_amount || 0)
      } else if (sortBy === 'score') {
        const sA = a.climateScore?.total_score ?? 50
        const sB = b.climateScore?.total_score ?? 50
        comp = sA - sB
      } else {
        comp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      return sortOrder === 'desc' ? -comp : comp
    })
    return list
  }, [filtered, sortBy, sortOrder])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedList = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, safePage, pageSize])

  const handleSort = (column: 'name' | 'district' | 'loan_amount' | 'score' | 'created_at') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const copyBorrowerLink = (token: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}/borrower/${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2500)
  }

  const formatCurrency = (amt: number) => `₹${amt.toLocaleString('en-IN')}`

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden flex flex-col">
      {/* Top Filter and Tab Bar */}
      <div className="p-5 border-b border-outline-variant/20 flex flex-col gap-4">
        {/* Header & Tab Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-primary flex items-center gap-2">
              Customer Portfolio Management
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                {filtered.length} showing
              </span>
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Real-time advisory scoring based on environmental exposure & resilience buffers.
            </p>
          </div>

          {/* Active / Archived Tab Toggle */}
          <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl border border-outline-variant/30 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setViewTab('active')
                setCurrentPage(1)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewTab === 'active'
                  ? 'bg-surface-container-lowest text-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              <span>Active Portfolio</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-container-high font-bold">
                {activeCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewTab('archived')
                setCurrentPage(1)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewTab === 'archived'
                  ? 'bg-surface-container-lowest text-amber-700 shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">archive</span>
              <span>Archived</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
                {archivedCount}
              </span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-outline-variant/15">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Box */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search proprietor, enterprise, district..."
                className="w-full px-3.5 py-1.5 pl-9 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-outline">
                search
              </span>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2 text-outline hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>

            {/* Sector Filter */}
            <select
              value={sectorFilter}
              onChange={(e) => {
                setSectorFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
            >
              <option value="ALL">All Sectors</option>
              <option value="Agriculture">Agriculture</option>
              <option value="Agri-processing">Agri-processing</option>
              <option value="Rural Retail">Rural Retail</option>
              <option value="Handloom/Textile">Handloom/Textile</option>
              <option value="Light Manufacturing">Light Manufacturing</option>
            </select>

            {/* Risk Tier Filter */}
            <select
              value={riskFilter}
              onChange={(e) => {
                setRiskFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/40 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="LOW">Low Risk (75-100)</option>
              <option value="MODERATE">Moderate Risk (40-74)</option>
              <option value="HIGH">High Risk (10-39)</option>
              <option value="CRITICAL">Very High Risk (0-9)</option>
            </select>
          </div>

          {/* Add Customer Button */}
          {onAddBorrower && (
            <button
              onClick={onAddBorrower}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ml-auto"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Register Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-surface-container-low/60 text-on-surface-variant font-semibold border-b border-outline-variant/20 uppercase tracking-wider text-[11px]">
              {/* Enterprise / Borrower Sort */}
              <th
                onClick={() => handleSort('name')}
                className="py-3 px-4 cursor-pointer hover:text-primary transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>Borrower & Enterprise</span>
                  <span className="material-symbols-outlined text-[14px]">
                    {sortBy === 'name' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                  </span>
                </div>
              </th>

              {/* District Sort */}
              <th
                onClick={() => handleSort('district')}
                className="py-3 px-4 cursor-pointer hover:text-primary transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>District / State</span>
                  <span className="material-symbols-outlined text-[14px]">
                    {sortBy === 'district' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                  </span>
                </div>
              </th>

              <th className="py-3 px-4">Sector & Infrastructure</th>

              {/* Loan Amount Sort */}
              <th
                onClick={() => handleSort('loan_amount')}
                className="py-3 px-4 text-right cursor-pointer hover:text-primary transition-colors select-none"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Loan Amount</span>
                  <span className="material-symbols-outlined text-[14px]">
                    {sortBy === 'loan_amount' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                  </span>
                </div>
              </th>

              <th className="py-3 px-4 text-center">Live 7d Rain</th>

              {/* Climate Risk Score Sort */}
              <th
                onClick={() => handleSort('score')}
                className="py-3 px-4 text-center cursor-pointer hover:text-primary transition-colors select-none"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Climate Risk Score</span>
                  <span className="material-symbols-outlined text-[14px]">
                    {sortBy === 'score' ? (sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
                  </span>
                </div>
              </th>

              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/15 text-on-surface">
            {paginatedList.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[32px] text-outline mb-1">
                    search_off
                  </span>
                  <p className="font-semibold text-sm">
                    {viewTab === 'archived' ? 'No archived customers found' : 'No customers match the selected filters'}
                  </p>
                  <p className="text-xs text-outline mt-0.5">Try resetting search or filters.</p>
                </td>
              </tr>
            ) : (
              paginatedList.map((b) => {
                const score = b.climateScore?.total_score ?? 50
                const label = b.climateScore?.advisory_label ?? 'Moderate risk'

                return (
                  <tr
                    key={b.id}
                    onClick={() => onSelectBorrower(b)}
                    className="hover:bg-surface-container-low/70 transition-colors cursor-pointer group"
                  >
                    {/* Borrower & Enterprise */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-primary group-hover:text-secondary transition-colors">
                        {b.business_name}
                      </div>
                      <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">person</span>
                        <span>{b.borrower_name}</span>
                        {b.is_synthetic && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-container-high text-outline uppercase font-semibold">
                            Synthetic
                          </span>
                        )}
                      </div>
                    </td>

                    {/* District */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-primary">{b.district}</div>
                      <div className="text-[11px] text-on-surface-variant">{b.state}</div>
                    </td>

                    {/* Sector & Key Infrastructure */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-primary">{b.sector}</div>
                      <div className="text-[11px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                        <span>{b.irrigation_access}</span>
                        <span>•</span>
                        <span>{b.insurance_status}</span>
                      </div>
                    </td>

                    {/* Loan Amount */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-primary">{formatCurrency(b.loan_amount)}</div>
                      <div className="text-[10px] text-on-surface-variant">
                        Rev: {formatCurrency(b.monthly_revenue)}/mo
                      </div>
                    </td>

                    {/* Live 7d Rain */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                          (b.rain7d || 0) > 75
                            ? 'bg-error-container text-on-error-container font-bold'
                            : (b.rain7d || 0) > 30
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">rainy</span>
                        <span>{b.rain7d !== undefined ? `${b.rain7d} mm` : '18 mm'}</span>
                      </span>
                    </td>

                    {/* Risk Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <RiskBadge score={score} label={label} size="sm" />
                    </td>

                    {/* Row Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Edit Button */}
                        {onEditBorrower && !b.is_archived && (
                          <button
                            type="button"
                            onClick={() => onEditBorrower(b)}
                            title="Edit Customer Profile"
                            className="p-1 rounded-lg text-outline hover:text-primary hover:bg-surface-container-high transition-all"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                        )}

                        {/* Archive or Restore Button */}
                        {b.is_archived ? (
                          onRestoreBorrower && (
                            <button
                              type="button"
                              onClick={() => onRestoreBorrower(b)}
                              title="Restore to Active Portfolio"
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">unarchive</span>
                              <span>Restore</span>
                            </button>
                          )
                        ) : (
                          onArchiveBorrower && (
                            <button
                              type="button"
                              onClick={() => onArchiveBorrower(b)}
                              title="Archive Customer"
                              className="p-1 rounded-lg text-outline hover:text-amber-700 hover:bg-amber-50 transition-all"
                            >
                              <span className="material-symbols-outlined text-[16px]">archive</span>
                            </button>
                          )
                        )}

                        {/* Portal Link */}
                        <button
                          type="button"
                          onClick={(e) => copyBorrowerLink(b.public_token, e)}
                          title="Copy Borrower Awareness Portal Link"
                          className="px-2 py-1 rounded-lg text-xs font-semibold bg-surface-container-low hover:bg-surface-container-high text-primary transition-all flex items-center gap-1 ml-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {copiedToken === b.public_token ? 'check' : 'link'}
                          </span>
                          <span>{copiedToken === b.public_token ? 'Copied' : 'Portal'}</span>
                        </button>

                        {/* Expand Chevron */}
                        <button
                          type="button"
                          onClick={() => onSelectBorrower(b)}
                          className="p-1 rounded-lg text-outline hover:text-primary hover:bg-surface-container-high transition-all"
                          title="Inspect Detailed Risk Breakdown"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            chevron_right
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 bg-surface-container-low border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="px-2 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-xs font-semibold text-primary focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-outline ml-2">
            Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
          </span>
        </div>

        {/* Page navigation buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="p-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-primary hover:bg-surface-container-high disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Previous Page"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>

          <span className="px-2 font-semibold text-primary">
            Page {safePage} of {totalPages}
          </span>

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="p-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-primary hover:bg-surface-container-high disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Next Page"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  )
}
