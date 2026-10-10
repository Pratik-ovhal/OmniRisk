export interface DailyForecast {
  time: string[]
  precipitation_sum: number[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  wind_speed_10m_max: number[]
}

export interface OpenMeteoResponse {
  latitude: number
  longitude: number
  generationtime_ms: number
  utc_offset_seconds: number
  timezone: string
  timezone_abbreviation: string
  elevation: number
  daily: DailyForecast
}

export interface DayForecastPoint {
  date: string
  dayName: string
  rainMm: number
  maxTempC: number
  minTempC: number
  maxWindKmh: number
}

export interface WeatherSummary {
  latitude: number
  longitude: number
  totalPrecipitation7d: number
  maxDailyPrecipitation: number
  maxTemperature7d: number
  minTemperature7d: number
  maxWindSpeed7d: number
  rain24h: number
  rain72h: number
  rain7d: number
  dailyPoints: DayForecastPoint[]
  fetchedAt: string
  isCached: boolean
}
