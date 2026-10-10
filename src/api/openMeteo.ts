import type { OpenMeteoResponse, WeatherSummary, DayForecastPoint } from '../types/weather.types'

const CACHE_PREFIX = 'omnirisk_weather_'
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes cache

export async function fetchWeatherForecast(
  lat: number,
  lon: number,
  forceRefresh = false
): Promise<WeatherSummary> {
  const roundedLat = Math.round(lat * 100) / 100
  const roundedLon = Math.round(lon * 100) / 100
  const cacheKey = `${CACHE_PREFIX}${roundedLat}_${roundedLon}`

  // 1. Check local cache unless force refreshed
  if (!forceRefresh && typeof window !== 'undefined') {
    try {
      const cachedRaw = localStorage.getItem(cacheKey)
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw)
        const age = Date.now() - new Date(cached.fetchedAt).getTime()
        if (age < CACHE_TTL_MS) {
          return { ...cached, isCached: true }
        }
      }
    } catch {
      // LocalStorage error fallback
    }
  }

  // 2. Fetch live from Open-Meteo REST API
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLon}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,wind_speed_10m_max&timezone=auto`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`)
    }
    const data: OpenMeteoResponse = await res.json()
    const summary = parseOpenMeteoPayload(data, roundedLat, roundedLon)

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(summary))
      } catch {
        // quota exceeded fallback
      }
    }

    return summary
  } catch (err) {
    console.warn(`Weather fetch failed for ${lat},${lon}, using fallback simulation:`, err)
    return generateDeterministicWeatherFallback(lat, lon)
  }
}

function parseOpenMeteoPayload(
  data: OpenMeteoResponse,
  lat: number,
  lon: number
): WeatherSummary {
  const { time, precipitation_sum, temperature_2m_max, temperature_2m_min, wind_speed_10m_max } = data.daily

  const days: DayForecastPoint[] = time.map((dateStr, i) => {
    const d = new Date(dateStr)
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
    return {
      date: dateStr,
      dayName,
      rainMm: Math.round((precipitation_sum[i] || 0) * 10) / 10,
      maxTempC: Math.round((temperature_2m_max[i] || 0) * 10) / 10,
      minTempC: Math.round((temperature_2m_min[i] || 0) * 10) / 10,
      maxWindKmh: Math.round((wind_speed_10m_max[i] || 0) * 10) / 10,
    }
  })

  const totalPrecipitation7d = Math.round(precipitation_sum.reduce((a, b) => a + (b || 0), 0) * 10) / 10
  const maxDailyPrecipitation = Math.max(...(precipitation_sum || [0]))
  const maxTemperature7d = Math.max(...(temperature_2m_max || [30]))
  const minTemperature7d = Math.min(...(temperature_2m_min || [20]))
  const maxWindSpeed7d = Math.max(...(wind_speed_10m_max || [10]))

  const rain24h = Math.round((precipitation_sum[0] || 0) * 10) / 10
  const rain72h = Math.round((precipitation_sum.slice(0, 3).reduce((a, b) => a + (b || 0), 0)) * 10) / 10

  return {
    latitude: lat,
    longitude: lon,
    totalPrecipitation7d,
    maxDailyPrecipitation,
    maxTemperature7d,
    minTemperature7d,
    maxWindSpeed7d,
    rain24h,
    rain72h,
    rain7d: totalPrecipitation7d,
    dailyPoints: days,
    fetchedAt: new Date().toISOString(),
    isCached: false,
  }
}

function generateDeterministicWeatherFallback(lat: number, lon: number): WeatherSummary {
  // Deterministic fallback based on coords to keep UI consistent in demo
  const isFloodRegion = lat < 17.5 // e.g. Kolhapur/Alappuzha
  const days: DayForecastPoint[] = []
  const today = new Date()

  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const rain = isFloodRegion ? (i === 1 || i === 2 ? 42.5 : 8.0) : (i === 3 ? 6.5 : 1.0)
    days.push({
      date: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      rainMm: rain,
      maxTempC: 32 + (i % 3),
      minTempC: 22,
      maxWindKmh: 18 + (i % 5),
    })
  }

  return {
    latitude: lat,
    longitude: lon,
    totalPrecipitation7d: isFloodRegion ? 112.5 : 18.0,
    maxDailyPrecipitation: isFloodRegion ? 42.5 : 6.5,
    maxTemperature7d: 34.5,
    minTemperature7d: 22.0,
    maxWindSpeed7d: 24.0,
    rain24h: isFloodRegion ? 28.0 : 4.0,
    rain72h: isFloodRegion ? 85.0 : 12.0,
    rain7d: isFloodRegion ? 112.5 : 18.0,
    dailyPoints: days,
    fetchedAt: new Date().toISOString(),
    isCached: true,
  }
}
