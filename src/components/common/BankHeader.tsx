import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase, signOut } from '../../api/supabaseClient'
import type { Profile } from '../../types/database.types'

interface BankHeaderProps {
  activeAlertCount?: number
}

export default function BankHeader({ activeAlertCount = 0 }: BankHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (data) {
          setProfile(data as Profile)
        } else {
          // Default fallback if profile table record not yet returned
          setProfile({
            id: user.id,
            full_name: user.user_metadata?.full_name || 'Rajesh Kumar (Risk Officer)',
            bank_name: user.user_metadata?.bank_name || 'State Bank Agri & MSME Directorate',
            branch_code: user.user_metadata?.branch_code || 'SME-MUM-402',
            role: 'bank_officer',
            created_at: new Date().toISOString()
          })
        }
      }
    }
    loadProfile()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="sticky top-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30 shadow-[0_1px_6px_rgba(0,0,0,0.03)]">
      {/* Top Officer & Bank Identity Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm group-hover:bg-primary-container transition-all">
                <span className="material-symbols-outlined text-[22px]">shield_with_heart</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-primary tracking-tight">OmniRisk</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-secondary-container/50 text-secondary uppercase tracking-wider">
                    Bank
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant font-medium">Climate Intelligence</span>
              </div>
            </Link>

            {/* Institution Badge */}
            <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-outline-variant/40">
              <span className="material-symbols-outlined text-outline text-[18px]">account_balance</span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-primary truncate max-w-[200px]">
                  {profile?.bank_name || 'State Bank Agri & MSME Directorate'}
                </span>
                <span className="text-[10px] text-on-surface-variant font-medium">
                  Branch: {profile?.branch_code || 'SME-MUM-402'}
                </span>
              </div>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            <Link
              to="/dashboard"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isActive('/dashboard')
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">groups</span>
              <span>Portfolio & Customers</span>
            </Link>

            <Link
              to="/pre-loan-check"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isActive('/pre-loan-check')
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">radar</span>
              <span>Pre-Loan Risk Check</span>
            </Link>

            <Link
              to="/demo-twin"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                isActive('/demo-twin')
                  ? 'bg-secondary text-white shadow-xs'
                  : 'text-secondary hover:bg-secondary-container/40'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">compare_arrows</span>
              <span>Demo Twin</span>
            </Link>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* Live Weather Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/30 text-secondary text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              <span className="truncate max-w-[130px]">Open-Meteo Synced</span>
            </div>

            {/* Active Alerts Count Pill */}
            {activeAlertCount > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-error-container text-on-error-container text-xs font-bold animate-pulse">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                <span>{activeAlertCount} Alerts</span>
              </div>
            )}

            {/* Officer Avatar & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-outline-variant/30">
              <div className="w-8 h-8 rounded-full bg-primary-container text-primary-fixed flex items-center justify-center font-bold text-xs ring-2 ring-primary/20">
                RK
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-semibold text-primary truncate max-w-[120px]">
                  {profile?.full_name?.split(' ')[0] || 'Rajesh'} (Officer)
                </span>
                <span className="text-[10px] text-on-surface-variant">Active</span>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out of bank officer session"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-error hover:bg-error-container/30 transition-all ml-1"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
