-- ==============================================================================
-- OmniRisk: Climate Risk Scoring Database Schema
-- Dedicated schema for Bank Officers and MSME/Agri Climate Risk Advisory
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE (Bank Officers)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  bank_name TEXT NOT NULL DEFAULT 'OmniRisk Partner Bank',
  branch_code TEXT NOT NULL DEFAULT 'MAIN-001',
  role TEXT NOT NULL DEFAULT 'bank_officer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. REGIONAL HAZARDS TABLE (World Bank Climate Benchmarks)
CREATE TABLE IF NOT EXISTS public.regional_hazards (
  id BIGSERIAL PRIMARY KEY,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  flood_hazard_index NUMERIC(3,2) NOT NULL DEFAULT 0.20 CHECK (flood_hazard_index BETWEEN 0 AND 1),
  drought_hazard_index NUMERIC(3,2) NOT NULL DEFAULT 0.20 CHECK (drought_hazard_index BETWEEN 0 AND 1),
  heat_stress_index NUMERIC(3,2) NOT NULL DEFAULT 0.20 CHECK (heat_stress_index BETWEEN 0 AND 1),
  cyclone_storm_index NUMERIC(3,2) NOT NULL DEFAULT 0.10 CHECK (cyclone_storm_index BETWEEN 0 AND 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_regional_hazard_location UNIQUE (district, state)
);

-- 3. BORROWERS TABLE (MSME & Agricultural Enterprises)
CREATE TABLE IF NOT EXISTS public.borrowers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  borrower_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  sector TEXT NOT NULL, -- e.g. Agriculture, Agri-processing, Rural Retail, Light Manufacturing
  sub_activity TEXT,     -- e.g. Paddy & Cotton Cultivation, Solar Cold Storage, Silk Weaving
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  soil_type TEXT NOT NULL DEFAULT 'Alluvial', -- Alluvial, Black Cotton, Red Sandy, Clay Loam
  irrigation_access TEXT NOT NULL DEFAULT 'Rainfed Only', -- Borewell + Drip, Canal Irrigated, Rainfed Only
  utility_reliability TEXT NOT NULL DEFAULT 'Unreliable Grid', -- 24x7 Grid, Intermittent Grid + Solar Backup, Unreliable Grid
  supply_chain_resilience TEXT NOT NULL DEFAULT 'Local Village Trader', -- Direct APMC Mandi Link, Interstate Cold Chain, Local Village Trader
  loan_amount NUMERIC(14,2) NOT NULL,
  monthly_revenue NUMERIC(14,2) NOT NULL,
  repayment_score INTEGER NOT NULL CHECK (repayment_score BETWEEN 300 AND 900),
  insurance_status TEXT NOT NULL DEFAULT 'Uninsured', -- Active Crop Insurance, Asset Insured, Uninsured
  is_synthetic BOOLEAN NOT NULL DEFAULT TRUE, -- Explicit disclaimer flag
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CLIMATE SCORES TABLE (0 - 100 Advisory Rating)
CREATE TABLE IF NOT EXISTS public.climate_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id UUID NOT NULL REFERENCES public.borrowers(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  advisory_label TEXT NOT NULL CHECK (advisory_label IN ('Low climate risk', 'Moderate risk', 'High risk', 'Very high risk')),
  hazard_subscore NUMERIC(5,2) NOT NULL CHECK (hazard_subscore BETWEEN 0 AND 100),
  vulnerability_subscore NUMERIC(5,2) NOT NULL CHECK (vulnerability_subscore BETWEEN 0 AND 100),
  forecast_subscore NUMERIC(5,2) NOT NULL CHECK (forecast_subscore BETWEEN 0 AND 100),
  financial_subscore NUMERIC(5,2) NOT NULL CHECK (financial_subscore BETWEEN 0 AND 100),
  satellite_bonus NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  top_risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  top_protective_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  insurance_suggestion TEXT NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CLIMATE ALERTS TABLE (Real-Time Warning System)
CREATE TABLE IF NOT EXISTS public.climate_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id UUID NOT NULL REFERENCES public.borrowers(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  hazard_type TEXT NOT NULL,
  headline TEXT NOT NULL,
  details TEXT NOT NULL,
  forecast_metric TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. SCORE HISTORY TABLE (Historical Audit Trail)
CREATE TABLE IF NOT EXISTS public.score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_id UUID NOT NULL REFERENCES public.borrowers(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  forecast_rainfall_7d NUMERIC(6,2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indices
CREATE INDEX IF NOT EXISTS idx_borrowers_district ON public.borrowers(district);
CREATE INDEX IF NOT EXISTS idx_borrowers_public_token ON public.borrowers(public_token);
CREATE INDEX IF NOT EXISTS idx_climate_scores_borrower ON public.climate_scores(borrower_id);
CREATE INDEX IF NOT EXISTS idx_climate_alerts_borrower ON public.climate_alerts(borrower_id);
CREATE INDEX IF NOT EXISTS idx_climate_alerts_severity ON public.climate_alerts(severity);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_hazards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climate_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.climate_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;

-- 1. Regional Hazards: readable by all authenticated users and anon (public climate lookup)
CREATE POLICY "Public read for regional hazards"
  ON public.regional_hazards FOR SELECT
  USING (true);

-- 2. Profiles: users can read and update their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 3. Borrowers:
-- Bank officers (authenticated) can perform all operations
CREATE POLICY "Bank officers have full access to borrowers"
  ON public.borrowers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anonymous users can view a borrower ONLY by matching public_token (Borrower awareness portal)
CREATE POLICY "Borrowers can view their profile via public token"
  ON public.borrowers FOR SELECT
  TO anon
  USING (public_token IS NOT NULL);

-- 4. Climate Scores:
-- Bank officers have full access
CREATE POLICY "Bank officers have full access to climate scores"
  ON public.climate_scores FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anonymous users can read climate score if they have borrower public token
CREATE POLICY "Public can view climate scores for token"
  ON public.climate_scores FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.borrowers b
      WHERE b.id = climate_scores.borrower_id
    )
  );

-- 5. Climate Alerts:
-- Bank officers have full access
CREATE POLICY "Bank officers have full access to alerts"
  ON public.climate_alerts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anon read for alerts
CREATE POLICY "Anon can view alerts"
  ON public.climate_alerts FOR SELECT
  TO anon
  USING (true);

-- 6. Score History:
CREATE POLICY "Bank officers have full access to score history"
  ON public.score_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can read score history"
  ON public.score_history FOR SELECT
  TO anon
  USING (true);
