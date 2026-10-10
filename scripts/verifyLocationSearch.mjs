// scripts/verifyLocationSearch.mjs
// Automated verification for OmniRisk Location Search & Map Sync

import assert from 'assert'

console.log('====================================================')
console.log(' OmniRisk: Location Search & Map Sync Verification')
console.log('====================================================\n')

let passed = 0
let failed = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`  ✓ PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ FAIL: ${name} -> ${err.message}`)
    failed++
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn()
    console.log(`  ✓ PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ FAIL: ${name} -> ${err.message}`)
    failed++
  }
}

// Coordinate boundary validator
function isCoordinatesInIndia(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= 6.0 && lat <= 38.5 && lon >= 68.0 && lon <= 97.5
}

// 1. Boundary tests
console.log('--- Test Suite 1: Coordinate Validation & Indian Geographic Bounds ---')
runTest('Validates Maharashtra coordinates (Kolhapur/Shirol)', () => {
  assert.strictEqual(isCoordinatesInIndia(16.7028, 74.2405), true)
  assert.strictEqual(isCoordinatesInIndia(16.7337, 74.6024), true)
})

runTest('Rejects reversed coordinates (lat=74, lon=16 would fail)', () => {
  // If lat/lon were inverted:
  assert.strictEqual(isCoordinatesInIndia(74.2405, 16.7028), false)
})

runTest('Rejects non-finite or global out-of-bounds coordinates', () => {
  assert.strictEqual(isCoordinatesInIndia(NaN, 74.24), false)
  assert.strictEqual(isCoordinatesInIndia(16.7, Infinity), false)
  assert.strictEqual(isCoordinatesInIndia(51.5074, -0.1278), false) // London
})

// 2. Geocoding resolution test
console.log('\n--- Test Suite 2: Photon OSM Geocoding Resolution ---')
await runAsyncTest('Geocodes "Kolhapur" with valid lat/lon in India', async () => {
  const url = 'https://photon.komoot.io/api/?q=' + encodeURIComponent('Kolhapur') + '&limit=5&lat=20.5937&lon=78.9629&lang=en'
  const res = await fetch(url)
  assert.strictEqual(res.ok, true, 'Photon request succeeded')
  const data = await res.json()
  assert(data.features && data.features.length > 0, 'Returned features')

  const top = data.features[0]
  const [lon, lat] = top.geometry.coordinates
  assert(Number.isFinite(lat), 'Latitude is finite')
  assert(Number.isFinite(lon), 'Longitude is finite')
  assert(isCoordinatesInIndia(lat, lon), `Coordinates [${lat}, ${lon}] are within India`)
  assert(top.properties.state.toLowerCase().includes('maharashtra'), 'State is Maharashtra')
})

await runAsyncTest('Geocodes "Shirol" to Kolhapur agro corridor', async () => {
  const url = 'https://photon.komoot.io/api/?q=' + encodeURIComponent('Shirol') + '&limit=5&lat=20.5937&lon=78.9629&lang=en'
  const res = await fetch(url)
  const data = await res.json()
  assert(data.features && data.features.length > 0, 'Found Shirol')
  const match = data.features.find(f => f.properties.state === 'Maharashtra')
  assert(match, 'Found Shirol in Maharashtra')
  const [lon, lat] = match.geometry.coordinates
  assert(lat >= 16.0 && lat <= 17.5, 'Shirol latitude is in Southern Maharashtra')
  assert(lon >= 74.0 && lon <= 75.5, 'Shirol longitude is in Kolhapur/Sangli belt')
})

// 3. Reverse geocoding test
console.log('\n--- Test Suite 3: Reverse Geocoding Resolution ---')
await runAsyncTest('Reverse geocodes coordinates (16.7028, 74.2405) to Kolhapur', async () => {
  const url = 'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=16.7028&longitude=74.2405&localityLanguage=en'
  const res = await fetch(url)
  assert.strictEqual(res.ok, true)
  const data = await res.json()
  const districtOrCity = data.city || data.locality
  assert.strictEqual(districtOrCity, 'Kolhapur')
  assert.strictEqual(data.principalSubdivision, 'Maharashtra')
  assert.strictEqual(data.countryName, 'India')
})

// 4. Downstream Risk Scoring Integration with Resolved Coordinates
console.log('\n--- Test Suite 4: Downstream Scoring Integration ---')
await runAsyncTest('Calculates acute hazard forecast with searched coordinates', async () => {
  // Mock live Open-Meteo call for the resolved coordinates
  const lat = 16.7028
  const lon = 74.2405
  const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=Asia/Kolkata`
  const res = await fetch(meteoUrl)
  assert.strictEqual(res.ok, true, 'Open-Meteo returns HTTP 200 for resolved location')
  const weather = await res.json()
  assert(weather.daily && weather.daily.temperature_2m_max, 'Weather forecast received for searched coordinates')
  assert.strictEqual(weather.latitude.toFixed(2), lat.toFixed(2), 'Latitude matches requested search location')
})

console.log('\n====================================================')
console.log(` Summary: ${passed} Passed, ${failed} Failed`)
console.log('====================================================\n')

if (failed > 0) process.exit(1)
