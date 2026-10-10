export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string
  full_name: string
  bank_name: string
  branch_code: string
  role: string
  created_at: string
}

export interface RegionalHazard {
  id: number
  district: string
  state: string
  country: string
  latitude: number
  longitude: number
  flood_hazard_index: number
  drought_hazard_index: number
  heat_stress_index: number
  cyclone_storm_index: number
  updated_at: string
}

export interface Borrower {
  id: string
  public_token: string
  borrower_name: string
  business_name: string
  sector: string
  sub_activity?: string
  district: string
  state: string
  latitude: number
  longitude: number
  soil_type: string
  irrigation_access: string
  utility_reliability: string
  supply_chain_resilience: string
  loan_amount: number
  monthly_revenue: number
  repayment_score: number
  insurance_status: string
  is_synthetic: boolean
  demo_tag?: string
  is_archived?: boolean
  archived_at?: string | null
  created_by?: string | null
  bank_id?: string
  contact_number?: string | null
  notes?: string | null
  created_at: string
  updated_at?: string
}

export type CheckType = 'AREA_ONLY' | 'AREA_AND_BUSINESS'

export interface RiskCheckInput {
  sector?: string
  sub_activity?: string
  crop_type?: string
  soil_type?: string
  irrigation_access?: string
  utility_reliability?: string
  supply_chain_resilience?: string
  loan_amount?: number
  monthly_revenue?: number
  repayment_score?: number
  insurance_status?: string
}

export interface RiskCheck {
  id: string
  bank_id: string
  created_by?: string | null
  customer_id?: string | null
  location_name: string
  district: string
  state: string
  latitude: number
  longitude: number
  check_type: CheckType
  inputs_snapshot: RiskCheckInput
  score: number
  advisory_label: AdvisoryLabel
  data_completeness: number
  subscores_snapshot: {
    hazardSubscore: number
    vulnerabilitySubscore?: number
    forecastSubscore: number
    financialSubscore?: number
    satelliteBonus?: number
  }
  created_at: string
}

export interface RiskCheckFilter {
  dateFrom?: string
  dateTo?: string
  district?: string
  riskTier?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'ALL'
  checkType?: CheckType | 'ALL'
  search?: string
}

export type AdvisoryLabel =
  | 'Low climate risk'
  | 'Moderate risk'
  | 'High risk'
  | 'Very high risk'

export interface ClimateScore {
  id: string
  borrower_id: string
  total_score: number
  advisory_label: AdvisoryLabel
  hazard_subscore: number
  vulnerability_subscore: number
  forecast_subscore: number
  financial_subscore: number
  satellite_bonus: number
  top_risk_factors: string[]
  top_protective_factors: string[]
  insurance_suggestion: string
  calculated_at: string
}

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface ClimateAlert {
  id: string
  borrower_id: string
  severity: AlertSeverity
  hazard_type: string
  headline: string
  details: string
  forecast_metric: string
  is_resolved: boolean
  created_at: string
}

export interface ScoreHistory {
  id: string
  borrower_id: string
  score: number
  forecast_rainfall_7d?: number
  recorded_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string; full_name: string }
        Update: Partial<Profile>
        Relationships: []
      }
      regional_hazards: {
        Row: RegionalHazard
        Insert: Partial<RegionalHazard> & { district: string; state: string; latitude: number; longitude: number }
        Update: Partial<RegionalHazard>
        Relationships: []
      }
      borrowers: {
        Row: Borrower
        Insert: Partial<Borrower> & {
          borrower_name: string
          business_name: string
          sector: string
          district: string
          state: string
          latitude: number
          longitude: number
          loan_amount: number
          monthly_revenue: number
          repayment_score: number
        }
        Update: Partial<Borrower>
        Relationships: []
      }
      climate_scores: {
        Row: ClimateScore
        Insert: Partial<ClimateScore> & {
          borrower_id: string
          total_score: number
          advisory_label: AdvisoryLabel
          hazard_subscore: number
          vulnerability_subscore: number
          forecast_subscore: number
          financial_subscore: number
        }
        Update: Partial<ClimateScore>
        Relationships: []
      }
      climate_alerts: {
        Row: ClimateAlert
        Insert: Partial<ClimateAlert> & {
          borrower_id: string
          severity: AlertSeverity
          hazard_type: string
          headline: string
          details: string
          forecast_metric: string
        }
        Update: Partial<ClimateAlert>
        Relationships: []
      }
      score_history: {
        Row: ScoreHistory
        Insert: Partial<ScoreHistory> & {
          borrower_id: string
          score: number
        }
        Update: Partial<ScoreHistory>
        Relationships: []
      }
      risk_checks: {
        Row: RiskCheck
        Insert: Partial<RiskCheck> & {
          location_name: string
          district: string
          state: string
          latitude: number
          longitude: number
          check_type: CheckType
          score: number
          advisory_label: AdvisoryLabel
          data_completeness: number
        }
        Update: Partial<RiskCheck>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
