import { useState } from 'react'
import type { WeatherSummary } from '../../types/weather.types'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface WeatherForecastWidgetProps {
  weather: WeatherSummary | null
  loading?: boolean
  onRefresh?: () => void
  compact?: boolean
}

export type ForecastHorizon = '24h' | '72h' | '7d'

export default function WeatherForecastWidget({
  weather,
  loading = false,
  onRefresh,
  compact = false,
}: WeatherForecastWidgetProps) {
  const [horizon, setHorizon] = useState<ForecastHorizon>('7d')

  if (loading || !weather) {
    return (
      <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 animate-pulse">
        <div className="h-4 bg-surface-container-high rounded w-1/3 mb-4"></div>
        <div className="h-16 bg-surface-container-low rounded-xl mb-3"></div>
        <div className="h-24 bg-surface-container-low rounded-xl"></div>
      </div>
    )
  }

  const getRainForHorizon = () => {
    switch (horizon) {
      case '24h':
        return weather.rain24h
      case '72h':
        return weather.rain72h
      case '7d':
      default:
        return weather.rain7d
    }
  }

  const isRainHigh = getRainForHorizon() > 50

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex flex-col justify-between">
      {/* Top Sync & Refresh Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
          </span>
          <span className="text-xs font-semibold text-secondary">Open-Meteo Synced</span>
          <span className="text-[11px] text-on-surface-variant hidden sm:inline">
            • {weather.isCached ? 'Cached' : 'Live'}
          </span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-primary hover:bg-surface-container-highest transition-all text-xs font-medium active:scale-95"
            title="Refresh forecast from Open-Meteo"
          >
            <span className="material-symbols-outlined text-[15px]">sync</span>
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* Horizon Toggle */}
      <div className="flex items-center bg-surface-container-low p-1 rounded-xl mb-4">
        {(['24h', '72h', '7d'] as ForecastHorizon[]).map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHorizon(h)}
            className={`flex-1 py-1.5 text-center rounded-lg text-xs font-semibold transition-all ${
              horizon === h
                ? 'bg-surface-container-lowest text-secondary shadow-sm'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            {h === '24h' ? '24 Hours' : h === '72h' ? '72 Hours' : '7 Days'}
          </button>
        ))}
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="bg-surface-container-low rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] text-on-surface-variant font-medium">Precipitation</span>
          <div className="mt-1">
            <span className={`text-lg font-bold ${isRainHigh ? 'text-error' : 'text-primary'}`}>
              {getRainForHorizon()}
            </span>
            <span className="text-[11px] font-medium text-on-surface-variant ml-0.5">mm</span>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] text-on-surface-variant font-medium">Peak Temp</span>
          <div className="mt-1">
            <span className="text-lg font-bold text-primary">{weather.maxTemperature7d}°</span>
            <span className="text-[11px] font-medium text-on-surface-variant ml-0.5">C</span>
          </div>
        </div>

        <div className="bg-surface-container-low rounded-xl p-3 flex flex-col justify-between">
          <span className="text-[11px] text-on-surface-variant font-medium">Max Wind</span>
          <div className="mt-1">
            <span className="text-lg font-bold text-primary">{weather.maxWindSpeed7d}</span>
            <span className="text-[11px] font-medium text-on-surface-variant ml-0.5">km/h</span>
          </div>
        </div>
      </div>

      {/* 7-Day Rainfall Trend Chart */}
      {!compact && (
        <div className="mt-1 pt-3 border-t border-outline-variant/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              7-Day Daily Rainfall (mm)
            </span>
            <span className="text-[10px] text-secondary font-medium">Open-Meteo High-Res</span>
          </div>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weather.dailyPoints} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="dayName" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#74777e' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-primary text-white p-2 rounded-lg text-xs shadow-lg">
                          <p className="font-bold">{data.dayName} ({data.date})</p>
                          <p>Rain: {data.rainMm} mm</p>
                          <p>Max Temp: {data.maxTempC}°C</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="rainMm" radius={[4, 4, 0, 0]}>
                  {weather.dailyPoints.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.rainMm > 25 ? '#ef4444' : entry.rainMm > 10 ? '#f59e0b' : '#006a61'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
