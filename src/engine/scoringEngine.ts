import type { Borrower, RegionalHazard, AdvisoryLabel, RiskCheckInput } from '../types/database.types'
import type { WeatherSummary } from '../types/weather.types'
import { FACTOR_WEIGHTS } from './factorWeights'
import { generateScoreExplanation } from './explanationGenerator'

export interface CalculationResult {
  totalScore: number
  advisoryLabel: AdvisoryLabel
  hazardSubscore: number
  vulnerabilitySubscore: number
  forecastSubscore: number
  financialSubscore: number
  satelliteBonus: number
  topRiskFactors: string[]
  topProtectiveFactors: string[]
  insuranceSuggestion: string
}

/**
 * Resolves score (0-100) to standard advisory label
 * 75-100: Low climate risk
 * 40-74: Moderate risk
 * 10-39: High risk
 * 0-9: Very high risk
 */
export function getAdvisoryLabel(score: number): AdvisoryLabel {
  if (score >= 75) return 'Low climate risk'
  if (score >= 40) return 'Moderate risk'
  if (score >= 10) return 'High risk'
  return 'Very high risk'
}

/**
 * Core transparent climate risk scoring algorithm (0 - 100)
 * Higher is better/safer resilience.
 */
export function calculateClimateScore(
  borrower: Borrower,
  hazard: RegionalHazard,
  weather: WeatherSummary | null
): CalculationResult {
  // 1. Regional Hazard Resilience Subscore (30% weight)
  // Actuarial Peak-Peril Principle: Primary acute hazard dominates regional vulnerability
  const peakPeril = Math.max(
    hazard.flood_hazard_index,
    hazard.drought_hazard_index,
    hazard.heat_stress_index,
    hazard.cyclone_storm_index
  )
  const secondaryPerilsAvg = (
    hazard.flood_hazard_index +
    hazard.drought_hazard_index +
    hazard.heat_stress_index +
    hazard.cyclone_storm_index - peakPeril
  ) / 3

  const compositeHazard = (peakPeril * 0.65) + (secondaryPerilsAvg * 0.35)
  const hazardSubscore = Math.max(0, Math.min(100, Math.round((1 - compositeHazard) * 100)))

  // 2. Business & Farm Vulnerability Subscore (25% weight)
  let irrigationPoints = 30
  if (borrower.irrigation_access === 'Borewell + Drip') irrigationPoints = 100
  else if (borrower.irrigation_access === 'Canal Irrigated') irrigationPoints = 80
  else if (borrower.irrigation_access === 'Rainfed Only') irrigationPoints = 15

  let soilPoints = 50
  if (borrower.soil_type === 'Alluvial') soilPoints = 90
  else if (borrower.soil_type === 'Black Cotton') soilPoints = 65
  else if (borrower.soil_type === 'Red Sandy') soilPoints = 55
  else if (borrower.soil_type === 'Clay Loam') {
    // Clay loam is vulnerable to waterlogging in flood zones
    soilPoints = hazard.flood_hazard_index > 0.5 ? 20 : 60
  }

  let utilityPoints = 40
  if (borrower.utility_reliability === '24x7 Grid') utilityPoints = 100
  else if (borrower.utility_reliability === 'Intermittent Grid with Solar Backup') utilityPoints = 90
  else if (borrower.utility_reliability === 'Unreliable Grid') utilityPoints = 20

  let supplyChainPoints = 40
  if (borrower.supply_chain_resilience === 'Interstate Cold Chain') supplyChainPoints = 100
  else if (borrower.supply_chain_resilience === 'Direct APMC Mandi Link') supplyChainPoints = 85
  else if (borrower.supply_chain_resilience === 'Local Village Trader') supplyChainPoints = 25

  const vulnerabilitySubscore = Math.round(
    irrigationPoints * 0.35 +
    soilPoints * 0.20 +
    utilityPoints * 0.25 +
    supplyChainPoints * 0.20
  )

  // 3. Live 7-Day Forecast Resilience Subscore (25% weight)
  let forecastSubscore = 75 // Neutral baseline
  if (weather) {
    let rainScore = 95
    if (weather.totalPrecipitation7d > 120) rainScore = 10
    else if (weather.totalPrecipitation7d > 80) rainScore = 25
    else if (weather.totalPrecipitation7d > 50) rainScore = 50
    else if (weather.totalPrecipitation7d > 20) rainScore = 80

    // Dry spell penalty in drought zone
    if (weather.totalPrecipitation7d < 5 && hazard.drought_hazard_index > 0.6) {
      rainScore = 25
    }

    let tempScore = 95
    if (weather.maxTemperature7d >= 44) tempScore = 20
    else if (weather.maxTemperature7d >= 41) tempScore = 50
    else if (weather.maxTemperature7d >= 38) tempScore = 75

    let windScore = 95
    if (weather.maxWindSpeed7d >= 55) windScore = 20
    else if (weather.maxWindSpeed7d >= 40) windScore = 60

    // Acute weather trigger dominates resilience
    if (weather.totalPrecipitation7d > 80 || weather.maxTemperature7d >= 42) {
      forecastSubscore = Math.round(rainScore * 0.75 + tempScore * 0.15 + windScore * 0.10)
    } else {
      forecastSubscore = Math.round(rainScore * 0.50 + tempScore * 0.35 + windScore * 0.15)
    }
  }

  // 4. Financial Resilience Buffer (20% weight)
  // Credit track record (scaled 300-900 to 0-100)
  const creditPoints = Math.max(0, Math.min(100, Math.round(((borrower.repayment_score - 300) / 600) * 100)))

  // Debt coverage cushion: annual revenue vs loan amount
  const annualRev = borrower.monthly_revenue * 12
  const coverageRatio = annualRev / Math.max(1, borrower.loan_amount)
  const debtCushion = Math.min(100, Math.round(coverageRatio * 40))

  // Insurance buffer
  const insurancePoints = (borrower.insurance_status === 'Active Crop Insurance' || borrower.insurance_status === 'Asset Insured') ? 95 : 20

  const financialSubscore = Math.round(
    creditPoints * 0.40 +
    debtCushion * 0.35 +
    insurancePoints * 0.25
  )

  // 5. Satellite Vegetation Moisture Bonus (±5 pts)
  // High soil moisture + healthy canopy modifier
  const satelliteBonus = (borrower.irrigation_access === 'Borewell + Drip' && vulnerabilitySubscore > 70) ? 4.0 : 0.0

  // 6. Weighted Sum & Clamping
  const rawTotal = (
    hazardSubscore * FACTOR_WEIGHTS.LOCATION_HAZARD +
    vulnerabilitySubscore * FACTOR_WEIGHTS.BUSINESS_VULNERABILITY +
    forecastSubscore * FACTOR_WEIGHTS.LIVE_FORECAST +
    financialSubscore * FACTOR_WEIGHTS.FINANCIAL_RESILIENCE +
    satelliteBonus
  )

  const totalScore = Math.max(0, Math.min(100, Math.round(rawTotal)))
  const advisoryLabel = getAdvisoryLabel(totalScore)

  // 7. Explanations & Independent Insurance Advice
  const explanation = generateScoreExplanation(borrower, hazard, weather, {
    hazardSubscore,
    vulnerabilitySubscore,
    forecastSubscore,
    financialSubscore,
    satelliteBonus,
    totalScore,
    advisoryLabel
  })

  return {
    totalScore,
    advisoryLabel,
    hazardSubscore,
    vulnerabilitySubscore,
    forecastSubscore,
    financialSubscore,
    satelliteBonus,
    topRiskFactors: explanation.topRiskFactors,
    topProtectiveFactors: explanation.topProtectiveFactors,
    insuranceSuggestion: explanation.insuranceSuggestion
  }
}

export interface DualModeCalculationResult {
  checkType: 'AREA_ONLY' | 'AREA_AND_BUSINESS'
  totalScore: number
  advisoryLabel: AdvisoryLabel
  dataCompleteness: number
  hazardSubscore: number
  forecastSubscore: number
  vulnerabilitySubscore?: number
  financialSubscore?: number
  satelliteBonus?: number
  topRiskFactors: string[]
  topProtectiveFactors: string[]
  insuranceSuggestion: string
}

/**
 * Dual-Mode Climate Risk Evaluator for Pre-Loan Checks
 * - Area-Only Mode: When business inputs are omitted, scales 30% hazard + 25% forecast to 0-100 (55% completeness)
 * - Area + Business Mode: Executes 100% 5-pillar calculation (100% completeness)
 */
export function calculateDualModeScore(
  hazard: RegionalHazard,
  weather: WeatherSummary | null,
  businessInputs?: RiskCheckInput | null
): DualModeCalculationResult {
  const hasBusinessDetails = Boolean(
    businessInputs &&
      businessInputs.sector &&
      businessInputs.loan_amount !== undefined &&
      businessInputs.monthly_revenue !== undefined
  )

  if (hasBusinessDetails && businessInputs) {
    // Mode: Area + Business (100% Data Completeness)
    const syntheticBorrower: Borrower = {
      id: 'pre_loan_assessment',
      public_token: 'check_token',
      borrower_name: 'Prospective Enterprise',
      business_name: 'Prospective Enterprise',
      sector: businessInputs.sector || 'Agriculture',
      sub_activity: businessInputs.sub_activity || '',
      district: hazard.district,
      state: hazard.state,
      latitude: hazard.latitude,
      longitude: hazard.longitude,
      soil_type: businessInputs.soil_type || 'Alluvial',
      irrigation_access: businessInputs.irrigation_access || 'Borewell + Drip',
      utility_reliability: businessInputs.utility_reliability || '24x7 Grid',
      supply_chain_resilience: businessInputs.supply_chain_resilience || 'Direct APMC Mandi Link',
      loan_amount: Number(businessInputs.loan_amount) || 500000,
      monthly_revenue: Number(businessInputs.monthly_revenue) || 60000,
      repayment_score: Number(businessInputs.repayment_score) || 720,
      insurance_status: businessInputs.insurance_status || 'Uninsured',
      is_synthetic: true,
      created_at: new Date().toISOString(),
    }

    const fullResult = calculateClimateScore(syntheticBorrower, hazard, weather)
    return {
      checkType: 'AREA_AND_BUSINESS',
      totalScore: fullResult.totalScore,
      advisoryLabel: fullResult.advisoryLabel,
      dataCompleteness: 100,
      hazardSubscore: fullResult.hazardSubscore,
      forecastSubscore: fullResult.forecastSubscore,
      vulnerabilitySubscore: fullResult.vulnerabilitySubscore,
      financialSubscore: fullResult.financialSubscore,
      satelliteBonus: fullResult.satelliteBonus,
      topRiskFactors: fullResult.topRiskFactors,
      topProtectiveFactors: fullResult.topProtectiveFactors,
      insuranceSuggestion: fullResult.insuranceSuggestion,
    }
  }

  // Mode: Area-Only Baseline (55% Data Completeness)
  // 1. Regional Hazard Subscore (30% weight)
  const peakPeril = Math.max(
    hazard.flood_hazard_index,
    hazard.drought_hazard_index,
    hazard.heat_stress_index,
    hazard.cyclone_storm_index
  )
  const secondaryPerilsAvg = (
    hazard.flood_hazard_index +
    hazard.drought_hazard_index +
    hazard.heat_stress_index +
    hazard.cyclone_storm_index - peakPeril
  ) / 3
  const compositeHazard = (peakPeril * 0.65) + (secondaryPerilsAvg * 0.35)
  const hazardSubscore = Math.max(0, Math.min(100, Math.round((1 - compositeHazard) * 100)))

  // 2. Live Forecast Subscore (25% weight)
  let forecastSubscore = 80
  if (weather) {
    let penalty = 0
    if (weather.rain7d > 100) penalty += 40
    else if (weather.rain7d > 60) penalty += 20
    else if (weather.rain7d < 5 && hazard.drought_hazard_index > 0.5) penalty += 15

    if (weather.maxTemperature7d > 42) penalty += 25
    else if (weather.maxTemperature7d > 39) penalty += 12

    if (weather.maxWindSpeed7d > 55) penalty += 25

    forecastSubscore = Math.max(10, Math.min(100, 100 - penalty))
  }

  // Normalize: 30% hazard + 25% forecast scaled to 0 - 100
  // Weight pool = 0.55
  const rawNormalized = (hazardSubscore * 0.30 + forecastSubscore * 0.25) / 0.55
  const totalScore = Math.max(0, Math.min(100, Math.round(rawNormalized)))
  const advisoryLabel = getAdvisoryLabel(totalScore)

  // Top Area Risk Factors
  const topRiskFactors: string[] = []
  if (hazard.flood_hazard_index >= 0.6) {
    topRiskFactors.push(`Elevated regional flood vulnerability index (${Math.round(hazard.flood_hazard_index * 100)}%) in ${hazard.district}`)
  }
  if (hazard.drought_hazard_index >= 0.6) {
    topRiskFactors.push(`High historical drought frequency index (${Math.round(hazard.drought_hazard_index * 100)}%) for district territory`)
  }
  if (weather && weather.rain7d > 60) {
    topRiskFactors.push(`Significant 7-day cumulative rainfall forecast (${weather.rain7d}mm) near geographic coordinates`)
  }
  if (hazard.heat_stress_index >= 0.6) {
    topRiskFactors.push(`High summer heatwave risk index (${Math.round(hazard.heat_stress_index * 100)}%) affecting workforce and perishables`)
  }
  if (topRiskFactors.length === 0) {
    topRiskFactors.push(`Baseline location climate exposure for ${hazard.district} territory`)
  }

  // Top Area Protective Factors
  const topProtectiveFactors: string[] = []
  if (hazard.flood_hazard_index < 0.4) {
    topProtectiveFactors.push(`Low historical flood risk exposure (${Math.round(hazard.flood_hazard_index * 100)}%) for this geographic zone`)
  }
  if (hazard.cyclone_storm_index < 0.3) {
    topProtectiveFactors.push(`Inland geography minimizes severe coastal cyclone exposure (${Math.round(hazard.cyclone_storm_index * 100)}%)`)
  }
  if (weather && weather.rain7d <= 30 && weather.maxTemperature7d < 38) {
    topProtectiveFactors.push('Mild 7-day meteorological outlook across all key climate parameters')
  }
  if (topProtectiveFactors.length === 0) {
    topProtectiveFactors.push('Regional agricultural ecosystem has standard seasonal recovery benchmark')
  }

  const insuranceSuggestion = hazard.flood_hazard_index > 0.5
    ? 'Consider advising future enterprise on parametric flood loss coverage before loan disbursement.'
    : 'Baseline area assessment suggests standard agricultural / MSME property peril insurance.'

  return {
    checkType: 'AREA_ONLY',
    totalScore,
    advisoryLabel,
    dataCompleteness: 55,
    hazardSubscore,
    forecastSubscore,
    topRiskFactors,
    topProtectiveFactors,
    insuranceSuggestion,
  }
}
