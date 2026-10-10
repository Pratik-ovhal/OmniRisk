import { supabase } from './supabaseClient'
import type { RegionalHazard } from '../types/database.types'
import { calculateDistanceMeters } from './customerService'

export interface NeighbourHazardContext {
  district: string
  state: string
  distanceKm: number
  floodHazard: number
  droughtHazard: number
  heatStress: number
  cycloneStorm: number
}

export interface AreaHazardIntelligence {
  targetHazard: RegionalHazard
  isNearestBenchmark: boolean
  benchmarkDistanceKm?: number
  neighbourhoodDistricts: NeighbourHazardContext[]
  neighbourhoodAverages: {
    avgFlood: number
    avgDrought: number
    avgHeat: number
    avgCyclone: number
    peakFlood: number
    peakDrought: number
  }
  territoryRiskSummary: string
}

/**
 * Surrounding Area & Neighbourhood Hazard Intelligence Service
 * Evaluates district-level climate benchmarks and adjacent territory exposure (200km radius)
 */
export async function getAreaHazardIntelligence(
  latitude: number,
  longitude: number,
  districtName?: string
): Promise<AreaHazardIntelligence> {
  // 1. Fetch all regional hazards from Supabase
  const { data, error } = await supabase.from('regional_hazards').select('*')
  const allHazards = (data || []) as RegionalHazard[]

  if (error || allHazards.length === 0) {
    // Baseline safe fallback if database offline
    const fallbackHazard: RegionalHazard = {
      id: 0,
      district: districtName || 'Local Territory',
      state: 'Regional Territory',
      country: 'India',
      latitude,
      longitude,
      flood_hazard_index: 0.35,
      drought_hazard_index: 0.35,
      heat_stress_index: 0.35,
      cyclone_storm_index: 0.15,
      updated_at: new Date().toISOString(),
    }
    return {
      targetHazard: fallbackHazard,
      isNearestBenchmark: true,
      neighbourhoodDistricts: [],
      neighbourhoodAverages: {
        avgFlood: 35,
        avgDrought: 35,
        avgHeat: 35,
        avgCyclone: 15,
        peakFlood: 35,
        peakDrought: 35,
      },
      territoryRiskSummary: 'Regional benchmark baseline applied; neighbouring territory metrics currently offline.',
    }
  }

  // 2. Identify target district hazard (by exact/close name or nearest geographic coordinates)
  let targetHazard: RegionalHazard | undefined
  let isNearest = false
  let nearestDistKm = 0

  if (districtName && districtName.trim()) {
    const clean = districtName.trim().toLowerCase()
    targetHazard = allHazards.find((h) => h.district.toLowerCase() === clean)
  }

  if (!targetHazard) {
    // Find geographically nearest hazard benchmark
    let minDistanceMeters = Infinity
    for (const h of allHazards) {
      const dist = calculateDistanceMeters(latitude, longitude, h.latitude, h.longitude)
      if (dist < minDistanceMeters) {
        minDistanceMeters = dist
        targetHazard = h
      }
    }
    isNearest = true
    nearestDistKm = Math.round(minDistanceMeters / 1000)
  }

  if (!targetHazard) {
    targetHazard = allHazards[0]
  }

  // 3. Find neighbouring districts within 250km radius
  const neighbours: NeighbourHazardContext[] = []
  for (const h of allHazards) {
    if (h.id === targetHazard.id) continue
    const distMeters = calculateDistanceMeters(latitude, longitude, h.latitude, h.longitude)
    const distKm = Math.round(distMeters / 1000)
    if (distKm <= 350) {
      neighbours.push({
        district: h.district,
        state: h.state,
        distanceKm: distKm,
        floodHazard: Math.round(h.flood_hazard_index * 100),
        droughtHazard: Math.round(h.drought_hazard_index * 100),
        heatStress: Math.round(h.heat_stress_index * 100),
        cycloneStorm: Math.round(h.cyclone_storm_index * 100),
      })
    }
  }

  neighbours.sort((a, b) => a.distanceKm - b.distanceKm)

  // 4. Compute neighbourhood averages and peaks
  const pool = neighbours.length > 0 ? neighbours : [{
    district: targetHazard.district,
    state: targetHazard.state,
    distanceKm: 0,
    floodHazard: Math.round(targetHazard.flood_hazard_index * 100),
    droughtHazard: Math.round(targetHazard.drought_hazard_index * 100),
    heatStress: Math.round(targetHazard.heat_stress_index * 100),
    cycloneStorm: Math.round(targetHazard.cyclone_storm_index * 100),
  }]

  const avgFlood = Math.round(pool.reduce((acc, n) => acc + n.floodHazard, 0) / pool.length)
  const avgDrought = Math.round(pool.reduce((acc, n) => acc + n.droughtHazard, 0) / pool.length)
  const avgHeat = Math.round(pool.reduce((acc, n) => acc + n.heatStress, 0) / pool.length)
  const avgCyclone = Math.round(pool.reduce((acc, n) => acc + n.cycloneStorm, 0) / pool.length)

  const peakFlood = Math.max(...pool.map((n) => n.floodHazard))
  const peakDrought = Math.max(...pool.map((n) => n.droughtHazard))

  // 5. Build territorial narrative
  let territoryRiskSummary = ''
  const pointFlood = Math.round(targetHazard.flood_hazard_index * 100)
  if (peakFlood >= 70 && pointFlood >= 60) {
    territoryRiskSummary = `Critical regional flood zone: Located within a high-vulnerability river/basin corridor where neighbouring territories average ${avgFlood}% flood exposure.`
  } else if (peakFlood >= 65 && pointFlood < 50) {
    territoryRiskSummary = `Moderate buffer zone: Target location has moderate flood baseline (${pointFlood}%), but lies within proximity of high-peril adjacent basins (${peakFlood}% peak risk).`
  } else if (avgDrought >= 60) {
    territoryRiskSummary = `Regional arid belt: Surrounding neighbourhood exhibits elevated multi-year drought frequencies (averaging ${avgDrought}%).`
  } else {
    territoryRiskSummary = `Temperate inland territory: Surrounding neighbourhood hazards remain balanced with standard seasonal volatility (flood avg: ${avgFlood}%, drought avg: ${avgDrought}%).`
  }

  return {
    targetHazard,
    isNearestBenchmark: isNearest,
    benchmarkDistanceKm: isNearest ? nearestDistKm : undefined,
    neighbourhoodDistricts: neighbours.slice(0, 4),
    neighbourhoodAverages: {
      avgFlood,
      avgDrought,
      avgHeat,
      avgCyclone,
      peakFlood,
      peakDrought,
    },
    territoryRiskSummary,
  }
}
