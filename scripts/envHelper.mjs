import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

/**
 * Loads environment variables from .env.local or .env for node scripts
 */
export function getSupabaseEnv() {
  const envFiles = ['.env.local', '.env']
  for (const file of envFiles) {
    const fullPath = path.join(rootDir, file)
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8')
      for (const line of content.split('\n')) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
        if (match) {
          const key = match[1]
          let value = (match[2] || '').trim()
          if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
          if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
          if (!process.env[key]) process.env[key] = value
        }
      }
    }
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!url || !anonKey) {
    console.error('Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Please verify .env.local exists.')
  }

  return { url, anonKey, serviceRoleKey }
}
