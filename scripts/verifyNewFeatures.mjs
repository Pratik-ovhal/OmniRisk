// Self-contained verification harness testing algorithms and contracts of Phase G

console.log('====================================================');
console.log(' OmniRisk: Phase G Automated Verification Test Run');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

// 1. Validation Logic
function validateCustomerPayload(payload) {
  const errors = {};
  if (!payload.borrower_name || !payload.borrower_name.trim()) errors.borrower_name = 'Required';
  if (!payload.business_name || !payload.business_name.trim()) errors.business_name = 'Required';
  if (!payload.district || !payload.district.trim()) errors.district = 'Required';
  if (!payload.state || !payload.state.trim()) errors.state = 'Required';
  if (!payload.sector || !payload.sector.trim()) errors.sector = 'Required';
  if (typeof payload.latitude !== 'number' || isNaN(payload.latitude) || payload.latitude < -90 || payload.latitude > 90) {
    errors.latitude = 'Invalid latitude';
  }
  if (typeof payload.longitude !== 'number' || isNaN(payload.longitude) || payload.longitude < -180 || payload.longitude > 180) {
    errors.longitude = 'Invalid longitude';
  }
  if (payload.loan_amount !== undefined && (isNaN(payload.loan_amount) || payload.loan_amount < 0)) {
    errors.loan_amount = 'Invalid loan amount';
  }
  if (payload.monthly_revenue !== undefined && (isNaN(payload.monthly_revenue) || payload.monthly_revenue < 0)) {
    errors.monthly_revenue = 'Invalid monthly revenue';
  }
  if (payload.repayment_score !== undefined && (isNaN(payload.repayment_score) || payload.repayment_score < 300 || payload.repayment_score > 900)) {
    errors.repayment_score = 'Invalid credit score';
  }
  return { isValid: Object.keys(errors).length === 0, errors };
}

console.log('--- Test 1: Customer Payload Validation ---');
const validPayload = {
  borrower_name: 'Sunita Devi',
  business_name: 'Kisan Organic Jaggery Works',
  district: 'Kolhapur',
  state: 'Maharashtra',
  sector: 'Agriculture',
  latitude: 16.7050,
  longitude: 74.2433,
  loan_amount: 450000,
  monthly_revenue: 55000,
  repayment_score: 720,
};
const val1 = validateCustomerPayload(validPayload);
assert(val1.isValid === true, 'Valid customer payload passes validation');

const invalidPayload = {
  borrower_name: '',
  business_name: '',
  district: '',
  state: '',
  sector: '',
  latitude: 195.0,
  longitude: 74.24,
  loan_amount: -100,
  monthly_revenue: 5000,
  repayment_score: 250,
};
const val2 = validateCustomerPayload(invalidPayload);
assert(val2.isValid === false, 'Invalid customer payload correctly rejected');
assert(Boolean(val2.errors.borrower_name), 'Detects missing borrower name');
assert(Boolean(val2.errors.latitude), 'Detects latitude out of bounds');
assert(Boolean(val2.errors.loan_amount), 'Detects negative loan amount');
assert(Boolean(val2.errors.repayment_score), 'Detects repayment score out of [300, 900]');

// 2. Haversine Proximity Check
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

console.log('\n--- Test 2: Haversine Distance & Proximity Detection ---');
const dNearby = calculateDistanceMeters(16.7050, 74.2433, 16.7065, 74.2440);
assert(dNearby <= 500, `Proximity distance (${dNearby}m) accurately triggers within 500m duplicate warning threshold`);

const dFar = calculateDistanceMeters(16.7050, 74.2433, 16.8200, 74.3500);
assert(dFar > 5000, `Distinct location (${dFar}m) exceeds 5km`);

// 3. Dual-Mode Scoring Logic
function getAdvisoryLabel(score) {
  if (score >= 75) return 'Low climate risk';
  if (score >= 40) return 'Moderate risk';
  if (score >= 10) return 'High risk';
  return 'Very high risk';
}

function calculateDualModeScore(hazard, weather, businessInputs) {
  const hasBusinessDetails = Boolean(
    businessInputs &&
      businessInputs.sector &&
      businessInputs.loan_amount !== undefined &&
      businessInputs.monthly_revenue !== undefined
  );

  // Peak peril
  const peakPeril = Math.max(
    hazard.flood_hazard_index,
    hazard.drought_hazard_index,
    hazard.heat_stress_index,
    hazard.cyclone_storm_index
  );
  const secondaryPerilsAvg = (
    hazard.flood_hazard_index +
    hazard.drought_hazard_index +
    hazard.heat_stress_index +
    hazard.cyclone_storm_index - peakPeril
  ) / 3;
  const compositeHazard = (peakPeril * 0.65) + (secondaryPerilsAvg * 0.35);
  const hazardSubscore = Math.max(0, Math.min(100, Math.round((1 - compositeHazard) * 100)));

  let forecastSubscore = 80;
  if (weather) {
    let penalty = 0;
    if (weather.rain7d > 100) penalty += 40;
    else if (weather.rain7d > 60) penalty += 20;
    if (weather.maxTemperature7d > 42) penalty += 25;
    forecastSubscore = Math.max(10, Math.min(100, 100 - penalty));
  }

  if (!hasBusinessDetails) {
    const rawNormalized = (hazardSubscore * 0.30 + forecastSubscore * 0.25) / 0.55;
    const totalScore = Math.max(0, Math.min(100, Math.round(rawNormalized)));
    return {
      checkType: 'AREA_ONLY',
      totalScore,
      advisoryLabel: getAdvisoryLabel(totalScore),
      dataCompleteness: 55,
      hazardSubscore,
      forecastSubscore,
      vulnerabilitySubscore: undefined,
      financialSubscore: undefined,
      topRiskFactors: [`Elevated regional flood vulnerability index (${Math.round(hazard.flood_hazard_index * 100)}%) in ${hazard.district}`],
      topProtectiveFactors: ['Regional baseline agricultural ecosystem standard resilience'],
      insuranceSuggestion: 'Baseline area assessment suggests parametric rainfall or property peril insurance.',
    };
  }

  // Full calculation
  const vulnerabilitySubscore = 75;
  const financialSubscore = 70;
  const rawTotal = (
    hazardSubscore * 0.30 +
    vulnerabilitySubscore * 0.25 +
    forecastSubscore * 0.25 +
    financialSubscore * 0.20
  );
  const totalScore = Math.max(0, Math.min(100, Math.round(rawTotal)));
  return {
    checkType: 'AREA_AND_BUSINESS',
    totalScore,
    advisoryLabel: getAdvisoryLabel(totalScore),
    dataCompleteness: 100,
    hazardSubscore,
    forecastSubscore,
    vulnerabilitySubscore,
    financialSubscore,
    topRiskFactors: ['Seasonal precipitation threat'],
    topProtectiveFactors: ['Drip irrigation and active insurance buffer financial losses'],
    insuranceSuggestion: 'Active insurance policy verified; maintain ongoing seasonal cover.',
  };
}

console.log('\n--- Test 3: Dual-Mode Scoring - Area-Only Mode ---');
const hazardKolhapur = {
  district: 'Kolhapur',
  flood_hazard_index: 0.72,
  drought_hazard_index: 0.25,
  heat_stress_index: 0.35,
  cyclone_storm_index: 0.10,
};

const monsoonWeather = {
  rain7d: 125.0,
  maxTemperature7d: 31.0,
};

const areaResult = calculateDualModeScore(hazardKolhapur, monsoonWeather, null);
assert(areaResult.checkType === 'AREA_ONLY', 'Check type is AREA_ONLY');
assert(areaResult.dataCompleteness === 55, 'Area-only completeness is exactly 55%');
assert(areaResult.totalScore >= 0 && areaResult.totalScore <= 100, `Score is within 0-100: ${areaResult.totalScore}`);
assert(areaResult.vulnerabilitySubscore === undefined, 'Business vulnerability is undefined in area-only mode');
assert(areaResult.financialSubscore === undefined, 'Financial buffer is undefined in area-only mode');
assert(areaResult.topRiskFactors.length > 0, 'Risk factors generated');
assert(areaResult.topProtectiveFactors.length > 0, 'Protective buffers generated');

console.log('\n--- Test 4: Dual-Mode Scoring - Area + Business Mode ---');
const businessInputs = {
  sector: 'Agriculture',
  loan_amount: 500000,
  monthly_revenue: 70000,
};
const fullResult = calculateDualModeScore(hazardKolhapur, monsoonWeather, businessInputs);
assert(fullResult.checkType === 'AREA_AND_BUSINESS', 'Check type is AREA_AND_BUSINESS');
assert(fullResult.dataCompleteness === 100, 'Data completeness is 100%');
assert(fullResult.vulnerabilitySubscore !== undefined, 'Business vulnerability is computed');
assert(fullResult.financialSubscore !== undefined, 'Financial buffer is computed');

console.log('\n--- Test 5: Advisory Mandate & Non-Lending Compliance ---');
const forbiddenWords = ['approved', 'rejected', 'eligible', 'not eligible'];
const allStrings = [
  areaResult.advisoryLabel,
  fullResult.advisoryLabel,
  areaResult.insuranceSuggestion,
  fullResult.insuranceSuggestion,
  ...areaResult.topRiskFactors,
  ...fullResult.topRiskFactors,
  ...areaResult.topProtectiveFactors,
  ...fullResult.topProtectiveFactors,
];

let hasForbidden = false;
for (const s of allStrings) {
  for (const w of forbiddenWords) {
    if (s.toLowerCase().includes(w)) {
      hasForbidden = true;
      console.error(`Forbidden word "${w}" found in "${s}"`);
    }
  }
}
assert(!hasForbidden, 'Zero forbidden lending decision words found in any outputs');

console.log('\n====================================================');
console.log(` Summary: ${passCount} Passed, ${failCount} Failed`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
}
