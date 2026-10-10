export const FACTOR_WEIGHTS = {
  LOCATION_HAZARD: 0.30,       // 30% World Bank historical climate risk
  BUSINESS_VULNERABILITY: 0.25,// 25% Soil, irrigation, utility, supply chain
  LIVE_FORECAST: 0.25,         // 25% Open-Meteo 7-day live weather
  FINANCIAL_RESILIENCE: 0.20,  // 20% Income buffer, repayment record, insurance
}

export const SATELLITE_MAX_BONUS = 5 // Up to ±5 pts bonus

export interface ScoreWeights {
  hazardWeight: number
  vulnerabilityWeight: number
  forecastWeight: number
  financialWeight: number
}
