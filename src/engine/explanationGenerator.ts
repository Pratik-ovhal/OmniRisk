import type { Borrower, RegionalHazard, AdvisoryLabel } from '../types/database.types'
import type { WeatherSummary } from '../types/weather.types'

export interface FactorItem {
  id: string
  text: string
  impact: number // Positive or negative magnitude
  category: 'HAZARD' | 'VULNERABILITY' | 'FORECAST' | 'FINANCIAL' | 'SATELLITE'
}

export function generateScoreExplanation(
  borrower: Borrower,
  hazard: RegionalHazard,
  weather: WeatherSummary | null,
  scores: {
    hazardSubscore: number
    vulnerabilitySubscore: number
    forecastSubscore: number
    financialSubscore: number
    satelliteBonus: number
    totalScore: number
    advisoryLabel: AdvisoryLabel
  }
) {
  const riskDrivers: FactorItem[] = []
  const protectiveBuffers: FactorItem[] = []

  // 1. Regional Hazard Drivers
  if (hazard.flood_hazard_index >= 0.70) {
    riskDrivers.push({
      id: 'high_flood_hazard',
      text: `High regional flood hazard zone (${Math.round(hazard.flood_hazard_index * 100)}% World Bank index) in ${hazard.district} river basin`,
      impact: -25,
      category: 'HAZARD'
    })
  } else if (hazard.flood_hazard_index <= 0.30) {
    protectiveBuffers.push({
      id: 'low_flood_hazard',
      text: `Elevated topography with minimal historical flood exposure (${Math.round(hazard.flood_hazard_index * 100)}% index)`,
      impact: 20,
      category: 'HAZARD'
    })
  }

  if (hazard.drought_hazard_index >= 0.70) {
    riskDrivers.push({
      id: 'high_drought_hazard',
      text: `Rain-shadow arid corridor with recurrent historical drought frequency (${Math.round(hazard.drought_hazard_index * 100)}% index)`,
      impact: -25,
      category: 'HAZARD'
    })
  }

  if (hazard.heat_stress_index >= 0.75) {
    riskDrivers.push({
      id: 'high_heat_stress',
      text: `Vulnerable to extreme seasonal heatwaves exceeding 44°C (${Math.round(hazard.heat_stress_index * 100)}% index)`,
      impact: -15,
      category: 'HAZARD'
    })
  }

  // 2. Business Vulnerability Drivers
  if (borrower.irrigation_access === 'Rainfed Only') {
    riskDrivers.push({
      id: 'rainfed_only',
      text: 'Entirely rainfed operation with zero backup irrigation infrastructure',
      impact: -25,
      category: 'VULNERABILITY'
    })
  } else if (borrower.irrigation_access === 'Borewell + Drip') {
    protectiveBuffers.push({
      id: 'drip_irrigation',
      text: 'Precision micro-drip irrigation with private borewell insulates against dry spells',
      impact: 25,
      category: 'VULNERABILITY'
    })
  }

  if (borrower.soil_type === 'Clay Loam' && hazard.flood_hazard_index > 0.60) {
    riskDrivers.push({
      id: 'soil_waterlogging',
      text: 'Heavy clay loam soil with slow drainage capacity exacerbates waterlogging risk',
      impact: -15,
      category: 'VULNERABILITY'
    })
  } else if (borrower.soil_type === 'Alluvial') {
    protectiveBuffers.push({
      id: 'alluvial_drainage',
      text: 'Fertile alluvial soil profile supports rapid natural moisture percolation',
      impact: 15,
      category: 'VULNERABILITY'
    })
  }

  if (borrower.utility_reliability === 'Unreliable Grid') {
    riskDrivers.push({
      id: 'unreliable_power',
      text: 'Unreliable electrical grid without backup risks disruption to refrigeration & processing',
      impact: -15,
      category: 'VULNERABILITY'
    })
  } else if (borrower.utility_reliability === 'Intermittent Grid with Solar Backup' || borrower.utility_reliability === '24x7 Grid') {
    protectiveBuffers.push({
      id: 'solar_backup',
      text: 'Solar backup or stable grid ensures operational continuity during extreme weather',
      impact: 20,
      category: 'VULNERABILITY'
    })
  }

  if (borrower.supply_chain_resilience === 'Local Village Trader') {
    riskDrivers.push({
      id: 'weak_supply_chain',
      text: 'Informal local village intermediary link leaves enterprise vulnerable to localized market washouts',
      impact: -15,
      category: 'VULNERABILITY'
    })
  } else if (borrower.supply_chain_resilience === 'Direct APMC Mandi Link' || borrower.supply_chain_resilience === 'Interstate Cold Chain') {
    protectiveBuffers.push({
      id: 'strong_supply_chain',
      text: 'Formal institutional marketing channel (APMC Mandi / Cold Chain) safeguards realization',
      impact: 20,
      category: 'VULNERABILITY'
    })
  }

  // 3. Live 7-Day Weather Forecast
  if (weather) {
    if (weather.totalPrecipitation7d > 80) {
      riskDrivers.push({
        id: 'heavy_forecast_rain',
        text: `Urgent: Forecast projects ${weather.totalPrecipitation7d}mm cumulative rainfall over next 7 days`,
        impact: -30,
        category: 'FORECAST'
      })
    } else if (weather.totalPrecipitation7d < 15 && hazard.drought_hazard_index > 0.50) {
      riskDrivers.push({
        id: 'dry_spell_forecast',
        text: `Prolonged dry spell: Less than ${weather.totalPrecipitation7d}mm rain expected over next 7 days in water-stressed zone`,
        impact: -15,
        category: 'FORECAST'
      })
    } else {
      protectiveBuffers.push({
        id: 'benign_weather',
        text: `Benign 7-day weather window: Moderate precipitation (${weather.totalPrecipitation7d}mm) and stable temperatures`,
        impact: 20,
        category: 'FORECAST'
      })
    }

    if (weather.maxTemperature7d >= 42) {
      riskDrivers.push({
        id: 'extreme_heatwave',
        text: `Heatwave alert: Peak forecasted temperatures reach ${weather.maxTemperature7d}°C`,
        impact: -20,
        category: 'FORECAST'
      })
    }
  }

  // 4. Financial Resilience Buffer
  if (borrower.insurance_status === 'Active Crop Insurance' || borrower.insurance_status === 'Asset Insured') {
    protectiveBuffers.push({
      id: 'active_insurance',
      text: `Formal insurance cover (${borrower.insurance_status}) provides rapid liquidity against crop or asset loss`,
      impact: 25,
      category: 'FINANCIAL'
    })
  } else {
    riskDrivers.push({
      id: 'uninsured_exposure',
      text: 'Enterprise is completely uninsured against climate perils, bearing 100% loss absorption',
      impact: -20,
      category: 'FINANCIAL'
    })
  }

  if (borrower.repayment_score >= 750) {
    protectiveBuffers.push({
      id: 'strong_credit_track',
      text: `Pristine credit discipline (score ${borrower.repayment_score}) provides financial headroom`,
      impact: 20,
      category: 'FINANCIAL'
    })
  } else if (borrower.repayment_score < 660) {
    riskDrivers.push({
      id: 'low_credit_headroom',
      text: `Tight credit headroom (repayment score ${borrower.repayment_score}) limits emergency borrowing capability`,
      impact: -15,
      category: 'FINANCIAL'
    })
  }

  // 5. Satellite bonus
  if (scores.satelliteBonus > 0) {
    protectiveBuffers.push({
      id: 'satellite_greenness',
      text: `Satellite vegetation index (NDVI) confirms healthy biomass moisture buffer (+${scores.satelliteBonus} pts)`,
      impact: 5,
      category: 'SATELLITE'
    })
  }

  // Sort and select top 3
  const topRiskFactors = riskDrivers
    .sort((a, b) => a.impact - b.impact) // Most negative first
    .slice(0, 3)
    .map(r => r.text)

  const topProtectiveFactors = protectiveBuffers
    .sort((a, b) => b.impact - a.impact) // Most positive first
    .slice(0, 3)
    .map(p => p.text)

  // Ensure non-empty fallbacks
  if (topRiskFactors.length === 0) {
    topRiskFactors.push('No acute climate vulnerabilities identified in current 7-day forecast cycle.')
  }
  if (topProtectiveFactors.length === 0) {
    topProtectiveFactors.push('Baseline local operational stability.')
  }

  // Independent Insurance Recommendation
  const insuranceSuggestion = generateDecoupledInsuranceAdvice(borrower, hazard, weather)

  return {
    topRiskFactors,
    topProtectiveFactors,
    insuranceSuggestion
  }
}

/**
 * Decoupled insurance recommendation logic
 * Generated strictly as an independent advisory tip without altering the climate score itself.
 */
export function generateDecoupledInsuranceAdvice(
  borrower: Borrower,
  hazard: RegionalHazard,
  weather: WeatherSummary | null
): string {
  if (borrower.insurance_status === 'Active Crop Insurance') {
    return 'Existing crop insurance is active. Recommend verifying parametric excess rainfall add-on rider before monsoon onset.'
  }

  if (hazard.flood_hazard_index >= 0.70 || (weather && weather.totalPrecipitation7d > 75)) {
    return 'Strongly recommend Parametric Excess Rainfall & Inundation Cover (Pradhan Mantri Fasal Bima Yojana + Private Parametric Rider) to safeguard against rapid riverine flood losses.'
  }

  if (hazard.drought_hazard_index >= 0.70) {
    return 'Recommend Weather-Based Crop Insurance Scheme (WBCIS) with dry-spell deficit index triggers, paired with subsidized micro-drip credit.'
  }

  if (hazard.heat_stress_index >= 0.70) {
    return 'Recommend Heat Stress Index Protection for horticultural crops and perishable cold chain inventory.'
  }

  if (borrower.sector === 'Light Manufacturing' || borrower.sector === 'Agri-processing') {
    return 'Recommend Comprehensive Business Interruption & Flood Asset Protection for machinery and finished inventory.'
  }

  return 'Recommend standard MSME Climate Perils Cover to hedge against unseasonal storms and localized weather shocks.'
}
