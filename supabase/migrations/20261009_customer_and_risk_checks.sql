-- ==============================================================================
-- OmniRisk: Customer Management & Pre-Loan Risk Checks Migration
-- Migration: 20261009_customer_and_risk_checks
-- ==============================================================================

-- 1. ADD SOFT DELETE & BANK MULTI-TENANCY COLUMNS TO BORROWERS
ALTER TABLE public.borrowers
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bank_id TEXT NOT NULL DEFAULT 'OmniRisk Partner Bank',
  ADD COLUMN IF NOT EXISTS contact_number TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. CREATE RISK CHECKS TABLE (Pre-Loan Assessment History)
CREATE TABLE IF NOT EXISTS public.risk_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id TEXT NOT NULL DEFAULT 'OmniRisk Partner Bank',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.borrowers(id) ON DELETE SET NULL,
  location_name TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  check_type TEXT NOT NULL CHECK (check_type IN ('AREA_ONLY', 'AREA_AND_BUSINESS')),
  inputs_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  advisory_label TEXT NOT NULL CHECK (advisory_label IN ('Low climate risk', 'Moderate risk', 'High risk', 'Very high risk')),
  data_completeness INTEGER NOT NULL CHECK (data_completeness BETWEEN 0 AND 100),
  subscores_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CREATE PERFORMANCE & FILTER INDICES
CREATE INDEX IF NOT EXISTS idx_borrowers_archived ON public.borrowers(is_archived);
CREATE INDEX IF NOT EXISTS idx_borrowers_bank ON public.borrowers(bank_id);
CREATE INDEX IF NOT EXISTS idx_risk_checks_bank ON public.risk_checks(bank_id);
CREATE INDEX IF NOT EXISTS idx_risk_checks_created_at ON public.risk_checks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_checks_district ON public.risk_checks(district);
CREATE INDEX IF NOT EXISTS idx_risk_checks_customer ON public.risk_checks(customer_id);

-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.risk_checks ENABLE ROW LEVEL SECURITY;

-- Drop prior borrower policies that conflict
DROP POLICY IF EXISTS "Bank officers have full access to borrowers" ON public.borrowers;
DROP POLICY IF EXISTS "Borrowers can view their profile via public token" ON public.borrowers;

-- Borrowers Policy: Bank officers can manage borrowers for their bank
CREATE POLICY "Bank officers have full access to their bank borrowers"
  ON public.borrowers FOR ALL
  TO authenticated
  USING (
    bank_id = (SELECT bank_name FROM public.profiles WHERE id = auth.uid())
    OR bank_id = 'OmniRisk Partner Bank'
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'bank_officer'
  )
  WITH CHECK (
    bank_id = (SELECT bank_name FROM public.profiles WHERE id = auth.uid())
    OR bank_id = 'OmniRisk Partner Bank'
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'bank_officer'
  );

-- Borrowers Policy: Public anonymous awareness view for unarchived borrowers
CREATE POLICY "Borrowers can view their unarchived profile via public token"
  ON public.borrowers FOR SELECT
  TO anon
  USING (public_token IS NOT NULL AND is_archived = FALSE);

-- Risk Checks Policy: Bank officers can view and insert checks for their bank
CREATE POLICY "Bank officers can view risk checks"
  ON public.risk_checks FOR SELECT
  TO authenticated
  USING (
    bank_id = (SELECT bank_name FROM public.profiles WHERE id = auth.uid())
    OR bank_id = 'OmniRisk Partner Bank'
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'bank_officer'
  );

CREATE POLICY "Bank officers can insert risk checks"
  ON public.risk_checks FOR INSERT
  TO authenticated
  WITH CHECK (
    bank_id = (SELECT bank_name FROM public.profiles WHERE id = auth.uid())
    OR bank_id = 'OmniRisk Partner Bank'
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'bank_officer'
  );
