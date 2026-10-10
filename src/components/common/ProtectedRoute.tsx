import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../../api/supabaseClient'
import type { User } from '@supabase/supabase-js'

interface ProtectedRouteProps {
  children?: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-on-surface">
        <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg mb-4 animate-bounce">
          <span className="material-symbols-outlined text-[28px]">shield_lock</span>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <span className="w-4 h-4 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin"></span>
          Verifying Bank Officer Session...
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
