import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[OmniRisk Security] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables. Ensure .env.local is configured.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Authentication helpers
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error fetching session:', error.message)
    return null
  }
  return data.session
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error getting current user:', error.message)
    return null
  }
  return data.user
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('Error signing out:', error.message)
    throw error
  }
}
