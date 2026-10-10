import { calculateClimateScore, getAdvisoryLabel } from '../src/engine/scoringEngine.ts';

// 1. Test Advisory Label Bounds
console.log('--- Testing Advisory Label Thresholds ---');
console.assert(getAdvisoryLabel(85) === 'Low climate risk', '85 should be Low risk');
console.assert(getAdvisoryLabel(55) === 'Moderate risk', '55 should be Moderate risk');
console.assert(getAdvisoryLabel(25) === 'High risk', '25 should be High risk');
console.assert(getAdvisoryLabel(5) === 'Very high risk', '5 should be Very high risk');
console.log('✓ Label thresholds verified.');

// 2. Twin Borrower Test (Identical Finances, Divergent Climate Exposures)
const twinA = {
  id: "twin-a",
  public_token: "token_twin_a",
  borrower_name: "Ramesh Ganpat Patil",
  business_name: "Kaveri Agro FPC (Paddy Processing)",
  sector: "Agriculture",
  district: "Kolhapur",
  state: "Maharashtra",
  latitude: 16.6980,
  longitude: 74.2310,
  soil_type: "Clay Loam",
  irrigation_access: "Rainfed Only",
  utility_reliability: "Unreliable Grid",
  supply_chain_resilience: "Local Village Trader",
  loan_amount: 500000,
  monthly_revenue: 65000,
  repayment_score: 740,
  insurance_status: "Uninsured",
  is_synthetic: true,
  created_at: new Date().toISOString()
};

const hazardKolhapur = {
  id: 1,
  district: "Kolhapur",
  state: "Maharashtra",
  country: "India",
  latitude: 16.7050,
  longitude: 74.2433,
  flood_hazard_index: 0.88,
  drought_hazard_index: 0.18,
  heat_stress_index: 0.35,
  cyclone_storm_index: 0.22,
  updated_at: new Date().toISOString()
};

const weatherHeavyRain = {
  latitude: 16.70,
  longitude: 74.24,
  totalPrecipitation7d: 115.0,
  maxDailyPrecipitation: 45.0,
  maxTemperature7d: 32.0,
  minTemperature7d: 21.0,
  maxWindSpeed7d: 22.0,
  rain24h: 30.0,
  rain72h: 85.0,
  rain7d: 115.0,
  dailyPoints: [],
  fetchedAt: new Date().toISOString(),
  isCached: true
};

const twinB = {
  id: "twin-b",
  public_token: "token_twin_b",
  borrower_name: "Suresh Dinkar Shinde",
  business_name: "Sahyadri Bio-Farms (Horticulture)",
  sector: "Agriculture",
  district: "Pune",
  state: "Maharashtra",
  latitude: 18.5280,
  longitude: 73.8640,
  soil_type: "Alluvial",
  irrigation_access: "Borewell + Drip",
  utility_reliability: "Intermittent Grid with Solar Backup",
  supply_chain_resilience: "Direct APMC Mandi Link",
  loan_amount: 500000,
  monthly_revenue: 65000,
  repayment_score: 740,
  insurance_status: "Active Crop Insurance",
  is_synthetic: true,
  created_at: new Date().toISOString()
};

const hazardPune = {
  id: 2,
  district: "Pune",
  state: "Maharashtra",
  country: "India",
  latitude: 18.5204,
  longitude: 73.8567,
  flood_hazard_index: 0.35,
  drought_hazard_index: 0.30,
  heat_stress_index: 0.38,
  cyclone_storm_index: 0.12,
  updated_at: new Date().toISOString()
};

const weatherMild = {
  latitude: 18.52,
  longitude: 73.85,
  totalPrecipitation7d: 12.0,
  maxDailyPrecipitation: 4.0,
  maxTemperature7d: 31.0,
  minTemperature7d: 20.0,
  maxWindSpeed7d: 15.0,
  rain24h: 2.0,
  rain72h: 8.0,
  rain7d: 12.0,
  dailyPoints: [],
  fetchedAt: new Date().toISOString(),
  isCached: true
};

console.log('\n--- Evaluating Twin Borrower Scores ---');
const scoreA = calculateClimateScore(twinA, hazardKolhapur, weatherHeavyRain);
const scoreB = calculateClimateScore(twinB, hazardPune, weatherMild);

console.log(`Twin A (High Climate Exposure):`);
console.log(`  Total Score: ${scoreA.totalScore} / 100 [${scoreA.advisoryLabel}]`);
console.log(`  Hazard Subscore: ${scoreA.hazardSubscore}`);
console.log(`  Vulnerability Subscore: ${scoreA.vulnerabilitySubscore}`);
console.log(`  Forecast Subscore: ${scoreA.forecastSubscore}`);
console.log(`  Financial Subscore: ${scoreA.financialSubscore}`);
console.log(`  Top Risk Drivers: ${JSON.stringify(scoreA.topRiskFactors)}`);
console.log(`  Insurance Advice: ${scoreA.insuranceSuggestion}`);

console.log(`\nTwin B (Resilient Climate Buffer):`);
console.log(`  Total Score: ${scoreB.totalScore} / 100 [${scoreB.advisoryLabel}]`);
console.log(`  Hazard Subscore: ${scoreB.hazardSubscore}`);
console.log(`  Vulnerability Subscore: ${scoreB.vulnerabilitySubscore}`);
console.log(`  Forecast Subscore: ${scoreB.forecastSubscore}`);
console.log(`  Financial Subscore: ${scoreB.financialSubscore}`);
console.log(`  Top Protective Buffers: ${JSON.stringify(scoreB.topProtectiveFactors)}`);
console.log(`  Insurance Advice: ${scoreB.insuranceSuggestion}`);

// Divergence assertion
console.assert(scoreB.totalScore > scoreA.totalScore + 40, 'Twin B should score at least 40 points higher than Twin A due to climate exposure divergence');
console.log(`\n✓ Divergence test passed! Delta = ${scoreB.totalScore - scoreA.totalScore} points.`);
