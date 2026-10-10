import { supabase } from './supabaseClient'
import type { Borrower, ClimateScore, RegionalHazard, ScoreHistory, ClimateAlert, RiskCheck, AdvisoryLabel } from '../types/database.types'
import { calculateClimateScore } from '../engine/scoringEngine'

export interface CustomerWithScore extends Borrower {
  climateScore?: ClimateScore
  rain7d?: number
}

export interface CustomerFilterOptions {
  includeArchived?: boolean
  onlyArchived?: boolean
  search?: string
  district?: string
  sector?: string
  riskTier?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'ALL'
  sortBy?: 'name' | 'district' | 'loan_amount' | 'created_at' | 'score'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface PaginatedCustomersResult {
  customers: CustomerWithScore[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  activeCount: number
  archivedCount: number
}

export interface CustomerValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export interface DuplicateCheckResult {
  isDuplicate: boolean
  duplicateReason?: string
  matchedCustomer?: Borrower
  distanceMeters?: number
}

export interface CreateCustomerPayload {
  borrower_name: string
  business_name: string
  sector: string
  sub_activity?: string
  district: string
  state: string
  latitude: number
  longitude: number
  soil_type?: string
  irrigation_access?: string
  utility_reliability?: string
  supply_chain_resilience?: string
  loan_amount: number
  monthly_revenue: number
  repayment_score: number
  insurance_status?: string
  contact_number?: string | null
  notes?: string | null
  is_synthetic?: boolean
}

export interface UpdateCustomerPayload extends Partial<CreateCustomerPayload> {}

/**
 * Calculates Haversine distance in meters between two geographic coordinates
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

/**
 * Validates customer form inputs according to business integrity rules
 */
export function validateCustomerPayload(payload: Partial<CreateCustomerPayload>): CustomerValidationResult {
  const errors: Record<string, string> = {}

  if (!payload.borrower_name || !payload.borrower_name.trim()) {
    errors.borrower_name = 'Borrower / Proprietor name is required'
  }
  if (!payload.business_name || !payload.business_name.trim()) {
    errors.business_name = 'Business / Enterprise name is required'
  }
  if (!payload.district || !payload.district.trim()) {
    errors.district = 'District is required'
  }
  if (!payload.state || !payload.state.trim()) {
    errors.state = 'State is required'
  }
  if (!payload.sector || !payload.sector.trim()) {
    errors.sector = 'Economic sector is required'
  }

  // Coordinate validation
  if (typeof payload.latitude !== 'number' || isNaN(payload.latitude) || payload.latitude < -90 || payload.latitude > 90) {
    errors.latitude = 'Valid latitude between -90 and 90 is required'
  }
  if (typeof payload.longitude !== 'number' || isNaN(payload.longitude) || payload.longitude < -180 || payload.longitude > 180) {
    errors.longitude = 'Valid longitude between -180 and 180 is required'
  }

  // Financial validation
  if (payload.loan_amount !== undefined && (isNaN(payload.loan_amount) || payload.loan_amount < 0)) {
    errors.loan_amount = 'Loan amount must be a non-negative number'
  }
  if (payload.monthly_revenue !== undefined && (isNaN(payload.monthly_revenue) || payload.monthly_revenue < 0)) {
    errors.monthly_revenue = 'Monthly revenue must be a non-negative number'
  }
  if (
    payload.repayment_score !== undefined &&
    (isNaN(payload.repayment_score) || payload.repayment_score < 300 || payload.repayment_score > 900)
  ) {
    errors.repayment_score = 'Credit repayment proxy score must be between 300 and 900'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Checks for potential duplicate customers within 500m radius or identical names.
 * Advisory check that does not block form submission.
 */
export async function checkDuplicateCustomer(
  name: string,
  businessName: string,
  latitude: number,
  longitude: number,
  excludeId?: string
): Promise<DuplicateCheckResult> {
  try {
    const { data, error } = await supabase
      .from('borrowers')
      .select('id, borrower_name, business_name, latitude, longitude, district')
      .eq('is_archived', false)

    if (error || !data) return { isDuplicate: false }

    const cleanName = name.trim().toLowerCase()
    const cleanBiz = businessName.trim().toLowerCase()

    for (const b of data as Borrower[]) {
      if (excludeId && b.id === excludeId) continue

      const bName = (b.borrower_name || '').trim().toLowerCase()
      const bBiz = (b.business_name || '').trim().toLowerCase()

      const distMeters = calculateDistanceMeters(latitude, longitude, b.latitude, b.longitude)

      // Check proximity within 500 meters
      if (distMeters <= 500) {
        return {
          isDuplicate: true,
          duplicateReason: `Another registered enterprise exists within ${distMeters}m (${b.business_name} in ${b.district})`,
          matchedCustomer: b,
          distanceMeters: distMeters,
        }
      }

      // Check exact or near-identical name match
      if (cleanName === bName && cleanBiz === bBiz) {
        return {
          isDuplicate: true,
          duplicateReason: `Identical proprietor and enterprise name already active in ${b.district}`,
          matchedCustomer: b,
          distanceMeters: distMeters,
        }
      }
    }

    return { isDuplicate: false }
  } catch {
    // Non-blocking fallback
    return { isDuplicate: false }
  }
}

/**
 * Fetches paginated, filterable customers with active climate scores
 */
export async function fetchCustomers(options: CustomerFilterOptions = {}): Promise<PaginatedCustomersResult> {
  const {
    includeArchived = false,
    onlyArchived = false,
    search,
    district,
    sector,
    riskTier,
    sortBy = 'created_at',
    sortOrder = 'desc',
    page = 1,
    pageSize = 10,
  } = options

  // 1. Fetch Borrowers
  let query = supabase.from('borrowers').select('*')

  if (onlyArchived) {
    query = query.eq('is_archived', true)
  } else if (!includeArchived) {
    query = query.eq('is_archived', false)
  }

  const { data: borrowersData, error: bError } = await query
  if (bError) throw new Error('Failed to retrieve borrower portfolio')

  const allBorrowers = (borrowersData || []) as Borrower[]

  // 2. Fetch Climate Scores
  const { data: scoresData } = await supabase.from('climate_scores').select('*')
  const scoreMap = new Map<string, ClimateScore>()
  ;(scoresData || []).forEach((s: any) => scoreMap.set(s.borrower_id, s))

  // 3. Count active vs archived across full dataset
  let activeCount = 0
  let archivedCount = 0
  allBorrowers.forEach((b) => {
    if (b.is_archived) archivedCount++
    else activeCount++
  })

  // 4. Enrich borrowers with score and rain projection
  let enriched: CustomerWithScore[] = allBorrowers.map((b) => {
    const score = scoreMap.get(b.id)
    return {
      ...b,
      climateScore: score,
      rain7d: (score?.forecast_subscore || 50) < 50 ? 112 : 18,
    }
  })

  // 5. Apply filters
  if (search && search.trim()) {
    const s = search.trim().toLowerCase()
    enriched = enriched.filter(
      (b) =>
        b.borrower_name.toLowerCase().includes(s) ||
        b.business_name.toLowerCase().includes(s) ||
        b.district.toLowerCase().includes(s) ||
        (b.contact_number && b.contact_number.includes(s))
    )
  }

  if (district && district !== 'ALL') {
    enriched = enriched.filter((b) => b.district.toLowerCase() === district.toLowerCase())
  }

  if (sector && sector !== 'ALL') {
    enriched = enriched.filter((b) => b.sector.toLowerCase() === sector.toLowerCase())
  }

  if (riskTier && riskTier !== 'ALL') {
    enriched = enriched.filter((b) => {
      const scoreVal = b.climateScore?.total_score ?? 50
      if (riskTier === 'LOW') return scoreVal >= 75
      if (riskTier === 'MODERATE') return scoreVal >= 40 && scoreVal < 75
      if (riskTier === 'HIGH') return scoreVal >= 10 && scoreVal < 40
      if (riskTier === 'CRITICAL') return scoreVal < 10
      return true
    })
  }

  // 6. Apply sorting
  enriched.sort((a, b) => {
    let comp = 0
    if (sortBy === 'name') {
      comp = a.borrower_name.localeCompare(b.borrower_name)
    } else if (sortBy === 'district') {
      comp = a.district.localeCompare(b.district)
    } else if (sortBy === 'loan_amount') {
      comp = (a.loan_amount || 0) - (b.loan_amount || 0)
    } else if (sortBy === 'score') {
      const sA = a.climateScore?.total_score ?? 50
      const sB = b.climateScore?.total_score ?? 50
      comp = sA - sB
    } else {
      // created_at
      comp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    return sortOrder === 'desc' ? -comp : comp
  })

  // 7. Paginate
  const totalCount = enriched.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const startIndex = (safePage - 1) * pageSize
  const paginatedList = enriched.slice(startIndex, startIndex + pageSize)

  return {
    customers: paginatedList,
    totalCount,
    page: safePage,
    pageSize,
    totalPages,
    activeCount,
    archivedCount,
  }
}

/**
 * Fetches comprehensive detail for a single customer
 */
export async function fetchCustomerById(id: string): Promise<{
  customer: Borrower
  climateScore?: ClimateScore
  scoreHistory: ScoreHistory[]
  alerts: ClimateAlert[]
  riskChecks: RiskCheck[]
}> {
  // 1. Borrower
  const { data: customer, error: bErr } = await supabase
    .from('borrowers')
    .select('*')
    .eq('id', id)
    .single()

  if (bErr || !customer) {
    throw new Error('Customer profile not found')
  }

  // 2. Climate Score
  const { data: score } = await supabase
    .from('climate_scores')
    .select('*')
    .eq('borrower_id', id)
    .maybeSingle()

  // 3. Score History
  const { data: history } = await supabase
    .from('score_history')
    .select('*')
    .eq('borrower_id', id)
    .order('recorded_at', { ascending: false })

  // 4. Alerts
  const { data: alerts } = await supabase
    .from('climate_alerts')
    .select('*')
    .eq('borrower_id', id)
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })

  // 5. Linked Risk Checks
  const { data: riskChecks } = await supabase
    .from('risk_checks')
    .select('*')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })

  return {
    customer: customer as Borrower,
    climateScore: score as ClimateScore | undefined,
    scoreHistory: (history || []) as ScoreHistory[],
    alerts: (alerts || []) as ClimateAlert[],
    riskChecks: (riskChecks || []) as RiskCheck[],
  }
}

/**
 * Registers a new customer, computes initial climate risk score, and logs score history
 */
export async function createCustomer(payload: CreateCustomerPayload): Promise<{
  customer: Borrower
  score: ClimateScore
  duplicateWarning?: string
}> {
  // 1. Validate
  const validation = validateCustomerPayload(payload)
  if (!validation.isValid) {
    const firstKey = Object.keys(validation.errors)[0]
    throw new Error(validation.errors[firstKey] || 'Validation failed')
  }

  // 2. Duplicate Check
  const dup = await checkDuplicateCustomer(
    payload.borrower_name,
    payload.business_name,
    payload.latitude,
    payload.longitude
  )

  // 3. Determine Auth & Tenancy Context
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

  const publicToken = `cst_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`

  // 4. Insert Borrower
  const insertPayload = {
    public_token: publicToken,
    borrower_name: payload.borrower_name.trim(),
    business_name: payload.business_name.trim(),
    sector: payload.sector,
    sub_activity: payload.sub_activity?.trim() || '',
    district: payload.district.trim(),
    state: payload.state.trim(),
    latitude: payload.latitude,
    longitude: payload.longitude,
    soil_type: payload.soil_type || 'Alluvial',
    irrigation_access: payload.irrigation_access || 'Borewell + Drip',
    utility_reliability: payload.utility_reliability || '24x7 Grid',
    supply_chain_resilience: payload.supply_chain_resilience || 'Direct APMC Mandi Link',
    loan_amount: Number(payload.loan_amount) || 0,
    monthly_revenue: Number(payload.monthly_revenue) || 0,
    repayment_score: Number(payload.repayment_score) || 700,
    insurance_status: payload.insurance_status || 'Uninsured',
    contact_number: payload.contact_number?.trim() || null,
    notes: payload.notes?.trim() || null,
    bank_id: bankId,
    created_by: createdBy,
    is_archived: false,
    is_synthetic: payload.is_synthetic !== undefined ? payload.is_synthetic : true,
  }

  const { data: newCustomer, error: bErr } = await supabase
    .from('borrowers')
    .insert(insertPayload)
    .select()
    .single()

  if (bErr || !newCustomer) {
    throw new Error('Failed to register customer record')
  }

  const createdBorrower = newCustomer as Borrower

  // 5. Look up Regional Hazard for scoring
  const { data: hazards } = await supabase.from('regional_hazards').select('*')
  const hazardList = (hazards || []) as RegionalHazard[]
  const matchedHazard =
    hazardList.find((h) => h.district.toLowerCase() === createdBorrower.district.toLowerCase()) ||
    hazardList[0] || {
      id: 0,
      district: createdBorrower.district,
      state: createdBorrower.state,
      country: 'India',
      latitude: createdBorrower.latitude,
      longitude: createdBorrower.longitude,
      flood_hazard_index: 0.35,
      drought_hazard_index: 0.35,
      heat_stress_index: 0.35,
      cyclone_storm_index: 0.15,
      updated_at: new Date().toISOString(),
    }

  // 6. Compute Climate Risk Score
  const calc = calculateClimateScore(createdBorrower, matchedHazard, null)

  const scorePayload = {
    borrower_id: createdBorrower.id,
    total_score: calc.totalScore,
    advisory_label: calc.advisoryLabel as AdvisoryLabel,
    hazard_subscore: calc.hazardSubscore,
    vulnerability_subscore: calc.vulnerabilitySubscore,
    forecast_subscore: calc.forecastSubscore,
    financial_subscore: calc.financialSubscore,
    satellite_bonus: calc.satelliteBonus,
    top_risk_factors: calc.topRiskFactors,
    top_protective_factors: calc.topProtectiveFactors,
    insurance_suggestion: calc.insuranceSuggestion,
  }

  const { data: insertedScore, error: sErr } = await supabase
    .from('climate_scores')
    .insert(scorePayload)
    .select()
    .single()

  if (sErr) {
    // Non-fatal, return calculated score
  }

  // 7. Audit Log in score_history
  await supabase.from('score_history').insert({
    borrower_id: createdBorrower.id,
    score: calc.totalScore,
    forecast_rainfall_7d: 18,
  })

  return {
    customer: createdBorrower,
    score: (insertedScore as ClimateScore) || {
      id: `score_${createdBorrower.id}`,
      ...scorePayload,
      calculated_at: new Date().toISOString(),
    },
    duplicateWarning: dup.isDuplicate ? dup.duplicateReason : undefined,
  }
}

/**
 * Updates customer profile and automatically recalculates climate score if risk-driving parameters changed
 */
export async function updateCustomer(
  id: string,
  payload: UpdateCustomerPayload
): Promise<{
  customer: Borrower
  score?: ClimateScore
  recalculationTriggered: boolean
}> {
  // 1. Fetch current profile
  const { data: existing, error: fetchErr } = await supabase
    .from('borrowers')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !existing) {
    throw new Error('Customer record not found for update')
  }

  const current = existing as Borrower

  // 2. Validate merged payload
  const merged: CreateCustomerPayload = {
    borrower_name: payload.borrower_name ?? current.borrower_name,
    business_name: payload.business_name ?? current.business_name,
    sector: payload.sector ?? current.sector,
    sub_activity: payload.sub_activity ?? current.sub_activity,
    district: payload.district ?? current.district,
    state: payload.state ?? current.state,
    latitude: payload.latitude ?? current.latitude,
    longitude: payload.longitude ?? current.longitude,
    soil_type: payload.soil_type ?? current.soil_type,
    irrigation_access: payload.irrigation_access ?? current.irrigation_access,
    utility_reliability: payload.utility_reliability ?? current.utility_reliability,
    supply_chain_resilience: payload.supply_chain_resilience ?? current.supply_chain_resilience,
    loan_amount: payload.loan_amount ?? current.loan_amount,
    monthly_revenue: payload.monthly_revenue ?? current.monthly_revenue,
    repayment_score: payload.repayment_score ?? current.repayment_score,
    insurance_status: payload.insurance_status ?? current.insurance_status,
    contact_number: payload.contact_number !== undefined ? payload.contact_number : current.contact_number,
    notes: payload.notes !== undefined ? payload.notes : current.notes,
    is_synthetic: payload.is_synthetic ?? current.is_synthetic,
  }

  const validation = validateCustomerPayload(merged)
  if (!validation.isValid) {
    const firstKey = Object.keys(validation.errors)[0]
    throw new Error(validation.errors[firstKey] || 'Validation failed')
  }

  // 3. Determine if recalculation is needed
  const scoreRelevantChanged =
    payload.district !== undefined ||
    payload.latitude !== undefined ||
    payload.longitude !== undefined ||
    payload.sector !== undefined ||
    payload.sub_activity !== undefined ||
    payload.soil_type !== undefined ||
    payload.irrigation_access !== undefined ||
    payload.utility_reliability !== undefined ||
    payload.supply_chain_resilience !== undefined ||
    payload.insurance_status !== undefined ||
    payload.loan_amount !== undefined ||
    payload.monthly_revenue !== undefined ||
    payload.repayment_score !== undefined

  // 4. Update Borrower Table
  const updatePayload: Record<string, any> = {
    ...merged,
    updated_at: new Date().toISOString(),
  }

  const { data: updatedData, error: updateErr } = await supabase
    .from('borrowers')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (updateErr || !updatedData) {
    throw new Error('Failed to update customer record')
  }

  const updatedBorrower = updatedData as Borrower
  let updatedScore: ClimateScore | undefined

  // 5. Automatic Score Recalculation Trigger
  if (scoreRelevantChanged) {
    const { data: hazards } = await supabase.from('regional_hazards').select('*')
    const hazardList = (hazards || []) as RegionalHazard[]
    const matchedHazard =
      hazardList.find((h) => h.district.toLowerCase() === updatedBorrower.district.toLowerCase()) ||
      hazardList[0]

    if (matchedHazard) {
      const calc = calculateClimateScore(updatedBorrower, matchedHazard, null)

      const scorePayload = {
        borrower_id: updatedBorrower.id,
        total_score: calc.totalScore,
        advisory_label: calc.advisoryLabel as AdvisoryLabel,
        hazard_subscore: calc.hazardSubscore,
        vulnerability_subscore: calc.vulnerabilitySubscore,
        forecast_subscore: calc.forecastSubscore,
        financial_subscore: calc.financialSubscore,
        satellite_bonus: calc.satelliteBonus,
        top_risk_factors: calc.topRiskFactors,
        top_protective_factors: calc.topProtectiveFactors,
        insurance_suggestion: calc.insuranceSuggestion,
        calculated_at: new Date().toISOString(),
      }

      // Check if existing score row exists
      const { data: existingScore } = await supabase
        .from('climate_scores')
        .select('id')
        .eq('borrower_id', id)
        .maybeSingle()

      if (existingScore) {
        const { data: sData } = await supabase
          .from('climate_scores')
          .update(scorePayload)
          .eq('id', existingScore.id)
          .select()
          .single()
        updatedScore = sData as ClimateScore
      } else {
        const { data: sData } = await supabase
          .from('climate_scores')
          .insert(scorePayload)
          .select()
          .single()
        updatedScore = sData as ClimateScore
      }

      // Record audit history entry
      await supabase.from('score_history').insert({
        borrower_id: updatedBorrower.id,
        score: calc.totalScore,
        forecast_rainfall_7d: 18,
      })
    }
  }

  return {
    customer: updatedBorrower,
    score: updatedScore,
    recalculationTriggered: scoreRelevantChanged,
  }
}

/**
 * Soft deletes (archives) a customer while keeping historical scores and alerts intact
 */
export async function archiveCustomer(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('borrowers')
    .update({
      is_archived: true,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error('Failed to archive customer')
  }

  return true
}

/**
 * Restores a soft-deleted customer back to active portfolio status
 */
export async function restoreCustomer(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('borrowers')
    .update({
      is_archived: false,
      archived_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error('Failed to restore customer')
  }

  return true
}
