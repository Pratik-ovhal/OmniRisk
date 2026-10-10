import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../api/supabaseClient'

export default function BankLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Redirect target after login
  const from = (location.state as any)?.from?.pathname || '/dashboard'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        throw error
      }

      if (data.session) {
        navigate(from, { replace: true })
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    setEmail('officer@omnirisk.com')
    setPassword('BankOfficer2026!')
    setErrorMsg(null)
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-outline-variant/30 bg-surface-container-lowest/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-[24px]">shield_with_heart</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-primary">OmniRisk</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-secondary-container/40 text-secondary uppercase tracking-wider">
                  Bank Portal
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">Climate Exposure & Resilience Scoring</p>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span>Live Weather & Historical Hazard Synced</span>
          </div>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant/40 p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-container text-primary-fixed mb-3 shadow-inner">
              <span className="material-symbols-outlined text-[30px]">account_balance</span>
            </div>
            <h1 className="text-2xl font-bold text-primary">Bank Officer Login</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Sign in to evaluate borrower climate vulnerability and real-time alerts.
            </p>
          </div>

          {/* Quick Demo Fill Button */}
          <div className="mb-5 p-3 rounded-xl bg-surface-container-low border border-secondary/20 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-secondary flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                Hackathon Demo Access
              </div>
              <p className="text-[11px] text-on-surface-variant">Click to load Lead Risk Officer credentials</p>
            </div>
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-white hover:bg-secondary-container hover:text-on-secondary-container transition-all active:scale-95 shadow-sm"
            >
              Autofill Demo
            </button>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-error-container text-on-error-container text-xs flex items-start gap-2 animate-shake">
              <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Bank Officer Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@omnirisk.com"
                  className="w-full px-4 py-2.5 pl-10 rounded-xl bg-surface-container-low border border-outline-variant text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all"
                />
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-outline">
                  badge
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 pl-10 rounded-xl bg-surface-container-low border border-outline-variant text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all"
                />
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-outline">
                  lock
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-container transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Authenticating Officer...
                  </>
                ) : (
                  <>
                    <span>Enter Officer Dashboard</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Regulatory Advisory Footnote */}
          <div className="mt-6 pt-5 border-t border-outline-variant/30 text-center">
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              <strong className="font-semibold text-primary">Advisory & Awareness System:</strong> OmniRisk scores assist loan officers in identifying climate perils. Lending decisions remain strictly with the lending institution.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 px-6 text-center text-xs text-on-surface-variant border-t border-outline-variant/20 bg-surface-container-lowest/50">
        OmniRisk Advisory Platform • Demonstration Prototype with Synthetic MSME Data
      </footer>
    </div>
  )
}
