import { ShieldAlert, Info } from 'lucide-react'

interface SyntheticDataBannerProps {
  compact?: boolean
}

export default function SyntheticDataBanner({ compact = false }: SyntheticDataBannerProps) {
  if (compact) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1 text-center text-[11px] text-amber-900 font-medium flex items-center justify-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <span>
          <strong>Advisory Environment:</strong> Synthetic MSME profiles coupled with live Open-Meteo & World Bank CCKP feeds.
        </span>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/15 border-b border-amber-500/25 px-4 sm:px-6 py-2">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-amber-950 font-medium">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>ADVISORY & AWARENESS SIMULATION:</strong> Enterprise records are synthetically modeled with verified coordinates. Live 7-day weather is dynamically fetched from Open-Meteo.
          </span>
        </div>
        <div className="shrink-0 text-[11px] text-amber-800 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
          Strict Non-Lending Mandate
        </div>
      </div>
    </div>
  )
}
