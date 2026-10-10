import type { Borrower } from '../../types/database.types'

interface ArchiveConfirmModalProps {
  isOpen: boolean
  customer: Borrower | null
  onClose: () => void
  onConfirm: () => Promise<void>
  loading?: boolean
}

export default function ArchiveConfirmModal({
  isOpen,
  customer,
  onClose,
  onConfirm,
  loading = false,
}: ArchiveConfirmModalProps) {
  if (!isOpen || !customer) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full border border-outline-variant/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-outline-variant/20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">archive</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-primary">Archive Customer Profile</h3>
            <p className="text-xs text-on-surface-variant">Soft-delete from active portfolio</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="ml-auto text-outline hover:text-primary transition-colors p-1 rounded-lg"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <div className="font-bold text-sm text-primary">{customer.business_name}</div>
            <div className="text-on-surface-variant mt-0.5 flex items-center gap-2">
              <span>Proprietor: <strong className="text-primary">{customer.borrower_name}</strong></span>
              <span>•</span>
              <span>{customer.district}, {customer.state}</span>
            </div>
          </div>

          <div className="space-y-2 text-on-surface-variant leading-relaxed">
            <p>
              Are you sure you want to archive this customer?
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px] text-outline">
              <li>Customer will be hidden from the active lending directory and GIS Risk Map.</li>
              <li>Past climate risk evaluations and <strong className="text-primary">score history are permanently preserved</strong>.</li>
              <li>You can view and <strong className="text-primary">restore this customer at any time</strong> via the &ldquo;Archived&rdquo; tab.</li>
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-[11px] flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] text-blue-700 mt-0.5">info</span>
            <span>
              Advisory only. Archiving is an internal portfolio management action; the bank makes all lending decisions.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-surface-container-low border-t border-outline-variant/20 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                <span>Archiving...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">archive</span>
                <span>Confirm Archive</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
