import { supabase } from './supabaseClient'
import type { RiskCheck, RiskCheckFilter, RiskCheckInput, CheckType, AdvisoryLabel } from '../types/database.types'

export interface SaveRiskCheckParams {
  locationName: string
  district: string
  state: string
  latitude: number
  longitude: number
  checkType: CheckType
  inputsSnapshot: RiskCheckInput
  score: number
  advisoryLabel: AdvisoryLabel
  dataCompleteness: number
  subscoresSnapshot: {
    hazardSubscore: number
    vulnerabilitySubscore?: number
    forecastSubscore: number
    financialSubscore?: number
    satelliteBonus?: number
  }
  customerId?: string | null
}

/**
 * Saves a pre-loan risk evaluation snapshot to the database
 */
export async function saveRiskCheck(params: SaveRiskCheckParams): Promise<RiskCheck> {
  // 1. Resolve officer and bank tenancy context
  let createdBy: string | null = null
  let bankId = 'OmniRisk Partner Bank'

  const { data: authData } = await supabase.auth.getUser()
  if (authData?.user) {
    createdBy = authData.user.id
    const { data: prof } = await supabase
      .from('profiles')
      .select('bank_name')
      .eq('id', authData.user.id)
      .maybeSingle()
    if (prof?.bank_name) {
      bankId = prof.bank_name
    }
  }

  // 2. Insert into risk_checks table
  const insertPayload = {
    bank_id: bankId,
    created_by: createdBy,
    customer_id: params.customerId || null,
    location_name: params.locationName.trim(),
    district: params.district.trim(),
    state: params.state.trim(),
    latitude: params.latitude,
    longitude: params.longitude,
    check_type: params.checkType,
    inputs_snapshot: params.inputsSnapshot,
    score: params.score,
    advisory_label: params.advisoryLabel,
    data_completeness: params.dataCompleteness,
    subscores_snapshot: params.subscoresSnapshot,
  }

  const { data, error } = await supabase
    .from('risk_checks')
    .insert(insertPayload)
    .select()
    .single()

  if (error || !data) {
    throw new Error('Failed to persist pre-loan risk check snapshot')
  }

  return data as RiskCheck
}

/**
 * Queries persisted risk check history with optional filtering
 */
export async function fetchRiskChecks(filter?: RiskCheckFilter): Promise<RiskCheck[]> {
  let query = supabase
    .from('risk_checks')
    .select('*')
    .order('created_at', { ascending: false })

  if (filter?.district && filter.district !== 'ALL') {
    query = query.ilike('district', `%${filter.district}%`)
  }

  if (filter?.checkType && filter.checkType !== 'ALL') {
    query = query.eq('check_type', filter.checkType)
  }

  if (filter?.dateFrom) {
    query = query.gte('created_at', filter.dateFrom)
  }

  if (filter?.dateTo) {
    query = query.lte('created_at', filter.dateTo)
  }

  const { data, error } = await query
  if (error || !data) {
    return []
  }

  let results = data as RiskCheck[]

  // Risk Tier filter
  if (filter?.riskTier && filter.riskTier !== 'ALL') {
    results = results.filter((rc) => {
      if (filter.riskTier === 'LOW') return rc.score >= 75
      if (filter.riskTier === 'MODERATE') return rc.score >= 40 && rc.score < 75
      if (filter.riskTier === 'HIGH') return rc.score >= 10 && rc.score < 40
      if (filter.riskTier === 'CRITICAL') return rc.score < 10
      return true
    })
  }

  // Text search
  if (filter?.search && filter.search.trim()) {
    const q = filter.search.trim().toLowerCase()
    results = results.filter(
      (rc) =>
        rc.location_name.toLowerCase().includes(q) ||
        rc.district.toLowerCase().includes(q) ||
        rc.state.toLowerCase().includes(q)
    )
  }

  return results
}

/**
 * Fetches a single pre-loan check by ID
 */
export async function fetchRiskCheckById(id: string): Promise<RiskCheck | null> {
  const { data, error } = await supabase
    .from('risk_checks')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return data as RiskCheck
}

/**
 * Links a previously run check to an existing borrower record
 */
export async function attachCheckToCustomer(checkId: string, customerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('risk_checks')
    .update({ customer_id: customerId })
    .eq('id', checkId)

  if (error) {
    throw new Error('Failed to attach check to customer')
  }

  return true
}
