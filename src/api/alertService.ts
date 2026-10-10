import { supabase } from './supabaseClient'
import { fetchWeatherForecast } from './openMeteo'
import { evaluateClimateAlerts } from '../engine/alertRules'
import type { Borrower, RegionalHazard, ClimateAlert } from '../types/database.types'

export interface AlertWithBorrower extends ClimateAlert {
  borrower?: Borrower
}

export async function fetchActiveAlerts(): Promise<AlertWithBorrower[]> {
  try {
    const { data, error } = await supabase
      .from('climate_alerts')
      .select(`
        *,
        borrower:borrowers(*)
      `)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching alerts:', error.message)
      return []
    }

    return (data || []) as AlertWithBorrower[]
  } catch (err) {
    console.error('Alert fetch failed:', err)
    return []
  }
}

export async function resolveAlert(alertId: string): Promise<boolean> {
  const { error } = await supabase
    .from('climate_alerts')
    .update({ is_resolved: true })
    .eq('id', alertId)

  if (error) {
    console.error('Error resolving alert:', error.message)
    return false
  }
  return true
}

/**
 * Scan all borrowers and sync new climate alerts based on live forecasts
 */
export async function syncPortfolioAlerts(
  borrowers: Borrower[],
  hazards: RegionalHazard[]
): Promise<number> {
  const hazardMap = new Map<string, RegionalHazard>()
  hazards.forEach(h => hazardMap.set(h.district.toLowerCase(), h))

  let newAlertCount = 0

  for (const b of borrowers) {
    const hazard = hazardMap.get(b.district.toLowerCase())
    if (!hazard) continue

    // Fetch live forecast for borrower
    const weather = await fetchWeatherForecast(b.latitude, b.longitude)
    const candidateAlerts = evaluateClimateAlerts(b, hazard, weather)

    for (const ca of candidateAlerts) {
      // Check if alert already exists for this borrower & hazard_type recently
      const { data: existing } = await supabase
        .from('climate_alerts')
        .select('id')
        .eq('borrower_id', b.id)
        .eq('hazard_type', ca.hazard_type)
        .eq('is_resolved', false)
        .limit(1)

      if (!existing || existing.length === 0) {
        const { error: insErr } = await supabase
          .from('climate_alerts')
          .insert({
            borrower_id: b.id,
            severity: ca.severity,
            hazard_type: ca.hazard_type,
            headline: ca.headline,
            details: ca.details,
            forecast_metric: ca.forecast_metric,
            is_resolved: false,
          })

        if (!insErr) {
          newAlertCount++
        }
      }
    }
  }

  return newAlertCount
}
