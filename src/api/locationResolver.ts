export interface GeocodeResult {
  displayName: string
  name: string
  district: string
  state: string
  country: string
  latitude: number
  longitude: number
  boundingBox?: [number, number, number, number]
  isWithinIndia: boolean
}

// In-memory cache to prevent redundant network requests and respect usage policies
const geocodeCache = new Map<string, GeocodeResult[]>()
const reverseCache = new Map<string, GeocodeResult>()

let lastRequestTime = 0

/**
 * Enforces delay between consecutive geocoding requests to prevent rate limiting
 */
async function enforceRateLimit(delayMs = 400): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < delayMs) {
    await new Promise((resolve) => setTimeout(resolve, delayMs - elapsed))
  }
  lastRequestTime = Date.now()
}

/**
 * Checks whether coordinates lie roughly within Indian territorial boundaries
 */
export function isCoordinatesInIndia(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= 6.0 && lat <= 38.5 && lon >= 68.0 && lon <= 97.5
}

/**
 * Normalizes district names from diverse address keys
 */
function extractDistrict(address: any): string {
  if (!address) return 'Unknown District'
  return (
    address.state_district ||
    address.district ||
    address.county ||
    address.city ||
    address.town ||
    address.subdistrict ||
    address.municipality ||
    'Unknown District'
  )
}

/**
 * Normalizes state names from address keys
 */
function extractState(address: any): string {
  if (!address) return 'Unknown State'
  return address.state || address.province || address.region || 'India'
}

/**
 * Geocodes an address, village, city, or district name via OpenStreetMap data.
 * Uses Photon OSM (Komoot's open CORS geocoder) as primary client-side engine,
 * with Vite Nominatim proxy and direct Nominatim as robust fallbacks.
 */
export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim()
  if (!trimmed || trimmed.length < 2) return []

  const cacheKey = trimmed.toLowerCase()
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!
  }

  await enforceRateLimit()

  // 1. Primary: Photon OSM API (Komoot OpenStreetMap search, fully CORS-enabled)
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      trimmed
    )}&limit=6&lat=20.5937&lon=78.9629&lang=en`

    const response = await fetch(photonUrl, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()
      if (data && Array.isArray(data.features) && data.features.length > 0) {
        const results: GeocodeResult[] = []

        for (const feature of data.features) {
          const coords = feature.geometry?.coordinates
          if (!Array.isArray(coords) || coords.length < 2) continue

          // NOTE: GeoJSON standard format is [longitude, latitude]
          const lon = parseFloat(Number(coords[0]).toFixed(4))
          const lat = parseFloat(Number(coords[1]).toFixed(4))

          if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
          if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue

          const p = feature.properties || {}
          const name = p.name || p.street || trimmed
          const rawDistrict = p.district || p.county || p.city || p.locality || ''
          const district = rawDistrict.replace(/ District$/i, '').trim() || 'Unknown District'
          const state = (p.state || 'India').trim()
          const country = (p.country || 'India').trim()

          const displayParts = [name]
          if (district && district !== 'Unknown District' && district !== name) {
            displayParts.push(district)
          }
          if (state && state !== district && state !== name) {
            displayParts.push(state)
          }
          if (country && country !== state) {
            displayParts.push(country)
          }
          const displayName = displayParts.join(', ')

          results.push({
            displayName,
            name,
            district,
            state,
            country,
            latitude: lat,
            longitude: lon,
            isWithinIndia: isCoordinatesInIndia(lat, lon),
          })
        }

        if (results.length > 0) {
          geocodeCache.set(cacheKey, results)
          return results
        }
      }
    }
  } catch {
    // Proceed to fallback
  }

  // 2. Secondary fallback: Vite Nominatim proxy or direct Nominatim
  const candidateUrls = [
    `/api/nominatim/search?q=${encodeURIComponent(trimmed)}&format=json&addressdetails=1&limit=5&countrycodes=in`,
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      trimmed
    )}&format=json&addressdetails=1&limit=5&countrycodes=in`,
  ]

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) continue

      const data = await response.json()
      if (!Array.isArray(data) || data.length === 0) continue

      const results: GeocodeResult[] = []
      for (const item of data) {
        const lat = parseFloat(parseFloat(item.lat).toFixed(4))
        const lon = parseFloat(parseFloat(item.lon).toFixed(4))
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue

        const district = extractDistrict(item.address)
        const state = extractState(item.address)
        const country = item.address?.country || 'India'

        results.push({
          displayName: item.display_name,
          name: item.name || trimmed,
          district: district.replace(/ District$/i, '').trim(),
          state: state.trim(),
          country,
          latitude: lat,
          longitude: lon,
          boundingBox: item.boundingbox ? item.boundingbox.map(Number) : undefined,
          isWithinIndia: isCoordinatesInIndia(lat, lon),
        })
      }

      if (results.length > 0) {
        geocodeCache.set(cacheKey, results)
        return results
      }
    } catch {
      // Continue to next candidate
    }
  }

  return []
}

/**
 * Reverse-geocodes latitude and longitude into an address, district, and state.
 * Uses BigDataCloud client reverse API as primary open provider with Nominatim as fallback.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<GeocodeResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  const roundedLat = parseFloat(lat.toFixed(4))
  const roundedLon = parseFloat(lon.toFixed(4))
  const cacheKey = `${roundedLat},${roundedLon}`

  if (reverseCache.has(cacheKey)) {
    return reverseCache.get(cacheKey)!
  }

  await enforceRateLimit()

  // 1. Primary: BigDataCloud Open Client Reverse Geocoder (CORS enabled, fast)
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${roundedLat}&longitude=${roundedLon}&localityLanguage=en`
    const response = await fetch(bdcUrl)

    if (response.ok) {
      const data = await response.json()
      if (data && (data.locality || data.city || data.principalSubdivision)) {
        const rawDistrict = (data.city || data.locality || '').replace(/ District$/i, '').trim()
        const district = rawDistrict || 'Unknown District'
        const state = (data.principalSubdivision || 'India').trim()
        const country = (data.countryName || 'India').trim()
        const name = data.locality || data.city || (district !== 'Unknown District' ? district : `${state} Region`)

        const parts = [name]
        if (district && district !== 'Unknown District' && district !== name) {
          parts.push(district)
        }
        if (state && state !== district && state !== name) {
          parts.push(state)
        }
        if (country && country !== state) {
          parts.push(country)
        }

        const result: GeocodeResult = {
          displayName: parts.join(', '),
          name,
          district,
          state,
          country,
          latitude: roundedLat,
          longitude: roundedLon,
          isWithinIndia: isCoordinatesInIndia(roundedLat, roundedLon),
        }

        reverseCache.set(cacheKey, result)
        return result
      }
    }
  } catch {
    // Proceed to fallback
  }

  // 2. Fallback: Vite Nominatim proxy or direct Nominatim
  const candidateUrls = [
    `/api/nominatim/reverse?lat=${roundedLat}&lon=${roundedLon}&format=json&addressdetails=1`,
    `https://nominatim.openstreetmap.org/reverse?lat=${roundedLat}&lon=${roundedLon}&format=json&addressdetails=1`,
  ]

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) continue

      const item = await response.json()
      if (!item || item.error) continue

      const district = extractDistrict(item.address).replace(/ District$/i, '').trim()
      const state = extractState(item.address).trim()
      const country = item.address?.country || 'India'

      const result: GeocodeResult = {
        displayName: item.display_name,
        name: item.name || `${district}, ${state}`,
        district,
        state,
        country,
        latitude: roundedLat,
        longitude: roundedLon,
        isWithinIndia: isCoordinatesInIndia(roundedLat, roundedLon),
      }

      reverseCache.set(cacheKey, result)
      return result
    } catch {
      // Continue
    }
  }

  return null
}
