import type { Borrower, RegionalHazard, AlertSeverity } from '../types/database.types'
import type { WeatherSummary } from '../types/weather.types'

export interface GeneratedAlert {
  borrower_id: string
  severity: AlertSeverity
  hazard_type: string
  headline: string
  details: string
  forecast_metric: string
}

export function evaluateClimateAlerts(
  borrower: Borrower,
  hazard: RegionalHazard,
  weather: WeatherSummary | null
): GeneratedAlert[] {
  if (!weather) return []

  const alerts: GeneratedAlert[] = []

  // 1. Extreme Rainfall / Flash Flood Alert
  if (hazard.flood_hazard_index >= 0.70 && weather.totalPrecipitation7d >= 75) {
    alerts.push({
      borrower_id: borrower.id,
      severity: 'CRITICAL',
      hazard_type: 'Excess Rainfall / Riverine Inundation',
      headline: `Critical Flood Warning: ${weather.totalPrecipitation7d}mm Forecast in ${hazard.district}`,
      details: `${borrower.business_name} operates in the flood-prone ${hazard.district} river basin with ${borrower.soil_type} soil. Upcoming precipitation exceeds soil saturation capacity.`,
      forecast_metric: `${weather.totalPrecipitation7d}mm cumulative rain projected over next 7 days (Peak 24h: ${weather.rain24h}mm)`
    })
  } else if (hazard.flood_hazard_index >= 0.50 && weather.totalPrecipitation7d >= 45) {
    alerts.push({
      borrower_id: borrower.id,
      severity: 'WARNING',
      hazard_type: 'Monsoon Surge / Soil Waterlogging',
      headline: `Elevated Rain Watch: ${weather.totalPrecipitation7d}mm Forecast in ${hazard.district}`,
      details: `Significant rainfall expected over 72h. Recommend monitoring drainage channels and warehouse perimeter.`,
      forecast_metric: `${weather.totalPrecipitation7d}mm 7-day rainfall`
    })
  }

  // 2. Severe Agricultural Drought / Dry Spell Alert
  if (hazard.drought_hazard_index >= 0.75 && weather.totalPrecipitation7d <= 8 && borrower.irrigation_access === 'Rainfed Only') {
    alerts.push({
      borrower_id: borrower.id,
      severity: 'CRITICAL',
      hazard_type: 'Severe Dry Spell / Moisture Deficit',
      headline: `Severe Drought Stress: Near-Zero Rain Projected in ${hazard.district}`,
      details: `${borrower.borrower_name}'s rainfed farming operation faces critical soil moisture deficit. Lack of backup irrigation threatens vegetative crop yield.`,
      forecast_metric: `Only ${weather.totalPrecipitation7d}mm rain over next 7 days in chronic drought corridor`
    })
  } else if (hazard.drought_hazard_index >= 0.60 && weather.totalPrecipitation7d <= 12) {
    alerts.push({
      borrower_id: borrower.id,
      severity: 'WARNING',
      hazard_type: 'Sub-Normal Precipitation Watch',
      headline: `Dry Spell Advisory in ${hazard.district}`,
      details: `Forecasted dry window may require supplementary water rationing for standing crops.`,
      forecast_metric: `${weather.totalPrecipitation7d}mm rain forecasted across 7 days`
    })
  }

  // 3. Extreme Heatwave Alert
  if (weather.maxTemperature7d >= 43 && hazard.heat_stress_index >= 0.70) {
    alerts.push({
      borrower_id: borrower.id,
      severity: 'CRITICAL',
      hazard_type: 'Extreme Heatwave Stress',
      headline: `Dangerous Heatwave: Peak ${weather.maxTemperature7d}°C in ${hazard.district}`,
      details: `Prolonged heatwave poses acute thermal shock to horticultural crops, livestock, and cold-chain compressors.`,
      forecast_metric: `Peak temperature expected to hit ${weather.maxTemperature7d}°C`
    })
  } else if (weather.maxTemperature7d >= 40) {
    alerts.push({
      borrower_id: borrower.id,
      severity: 'INFO',
      hazard_type: 'Elevated Summer Temperatures',
      headline: `Warm Spell Watch (${weather.maxTemperature7d}°C) in ${hazard.district}`,
      details: `Higher daytime temperatures; verify refrigeration and shade netting.`,
      forecast_metric: `Maximum 7-day temperature ${weather.maxTemperature7d}°C`
    })
  }

  // 4. Gale Storm / Cyclone Gust Alert
  if (weather.maxWindSpeed7d >= 50 && hazard.cyclone_storm_index >= 0.50) {
    alerts.push({
      borrower_id: borrower.id,
      severity: 'CRITICAL',
      hazard_type: 'Severe Coastal Gale / Cyclone Surge',
      headline: `Severe Storm Alert: Gusts up to ${weather.maxWindSpeed7d} km/h in ${hazard.district}`,
      details: `High wind velocities capable of damaging polyhouses, tin roofs, and standing banana/sugarcane crops.`,
      forecast_metric: `Peak wind velocity ${weather.maxWindSpeed7d} km/h`
    })
  }

  return alerts
}
