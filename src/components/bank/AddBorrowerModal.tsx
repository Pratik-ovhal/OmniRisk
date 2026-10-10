import React, { useState } from 'react'
import { supabase } from '../../api/supabaseClient'
import type { RegionalHazard } from '../../types/database.types'
import { calculateClimateScore } from '../../engine/scoringEngine'
import RiskBadge from './RiskBadge'

interface AddBorrowerModalProps {
  isOpen: boolean
  onClose: () => void
  hazards: RegionalHazard[]
  onBorrowerAdded: () => void
}

export default function AddBorrowerModal({
  isOpen,
  onClose,
  hazards,
  onBorrowerAdded,
}: AddBorrowerModalProps) {
  const [borrowerName, setBorrowerName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [sector, setSector] = useState('Agriculture')
  const [subActivity, setSubActivity] = useState('')
  const [district, setDistrict] = useState(hazards[0]?.district || 'Kolhapur')
  const [soilType, setSoilType] = useState('Alluvial')
  const [irrigationAccess, setIrrigationAccess] = useState('Borewell + Drip')
  const [utilityReliability, setUtilityReliability] = useState('24x7 Grid')
  const [supplyChainResilience, setSupplyChainResilience] = useState('Direct APMC Mandi Link')
  const [loanAmount, setLoanAmount] = useState('600000')
  const [monthlyRevenue, setMonthlyRevenue] = useState('85000')
  const [repaymentScore, setRepaymentScore] = useState('750')
  const [insuranceStatus, setInsuranceStatus] = useState('Active Crop Insurance')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const selectedHazard = hazards.find(
    (h) => h.district.toLowerCase() === district.toLowerCase()
  ) || hazards[0]

  // Live preview calculation
  const previewBorrower = {
    id: 'preview',
    public_token: 'preview_token',
    borrower_name: borrowerName || 'Prospective Borrower',
    business_name: businessName || 'Prospective Enterprise',
    sector,
    sub_activity: subActivity,
    district: selectedHazard?.district || 'Kolhapur',
    state: selectedHazard?.state || 'Maharashtra',
    latitude: selectedHazard?.latitude || 16.70,
    longitude: selectedHazard?.longitude || 74.24,
    soil_type: soilType,
    irrigation_access: irrigationAccess,
    utility_reliability: utilityReliability,
    supply_chain_resilience: supplyChainResilience,
    loan_amount: Number(loanAmount) || 500000,
    monthly_revenue: Number(monthlyRevenue) || 60000,
    repayment_score: Number(repaymentScore) || 720,
    insurance_status: insuranceStatus,
    is_synthetic: true,
    created_at: new Date().toISOString(),
  }

  const liveScore = calculateClimateScore(previewBorrower, selectedHazard, null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSaving(true)

    try {
      const token = `token_${district.toLowerCase()}_${Date.now()}`

      // 1. Insert Borrower
      const { data: borrowerData, error: bError } = await supabase
        .from('borrowers')
        .insert({
          public_token: token,
          borrower_name: borrowerName.trim(),
          business_name: businessName.trim(),
          sector,
          sub_activity: subActivity.trim(),
          district: selectedHazard.district,
          state: selectedHazard.state,
          latitude: selectedHazard.latitude,
          longitude: selectedHazard.longitude,
          soil_type: soilType,
          irrigation_access: irrigationAccess,
          utility_reliability: utilityReliability,
          supply_chain_resilience: supplyChainResilience,
          loan_amount: Number(loanAmount),
          monthly_revenue: Number(monthlyRevenue),
          repayment_score: Number(repaymentScore),
          insurance_status: insuranceStatus,
          is_synthetic: true,
        })
        .select()
        .single()

      if (bError) throw bError

      // 2. Insert calculated climate score
      if (borrowerData) {
        const { error: sError } = await supabase.from('climate_scores').insert({
          borrower_id: borrowerData.id,
          total_score: liveScore.totalScore,
          advisory_label: liveScore.advisoryLabel,
          hazard_subscore: liveScore.hazardSubscore,
          vulnerability_subscore: liveScore.vulnerabilitySubscore,
          forecast_subscore: liveScore.forecastSubscore,
          financial_subscore: liveScore.financialSubscore,
          satellite_bonus: liveScore.satelliteBonus,
          top_risk_factors: liveScore.topRiskFactors,
          top_protective_factors: liveScore.topProtectiveFactors,
          insurance_suggestion: liveScore.insuranceSuggestion,
        })

        if (sError) console.warn('Score insertion notice:', sError.message)
      }

      onBorrowerAdded()
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register borrower')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full border border-outline-variant/30 shadow-xl overflow-hidden my-8 animate-fadeIn">
        {/* Header */}
        <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-primary">Register New Borrower</h2>
              <p className="text-xs text-on-surface-variant">
                Live scoring preview updates in real-time as you enter operational parameters.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Live Score Preview Strip */}
        <div className="px-5 py-3 bg-surface-container-low border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-on-surface-variant">Calculated Climate Score:</span>
            <RiskBadge score={liveScore.totalScore} label={liveScore.advisoryLabel} size="md" />
          </div>
          <span className="text-[11px] text-secondary font-medium">
            Formula: 30% Hazard + 25% Vuln + 25% Forecast + 20% Fin
          </span>
        </div>

        {errorMsg && (
          <div className="m-5 p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Borrower Full Name
              </label>
              <input
                type="text"
                required
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                placeholder="e.g. Balasaheb Thorat"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Business / Enterprise Name
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Godavari Agro Polyhouse"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Sector
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
              >
                <option value="Agriculture">Agriculture</option>
                <option value="Agri-processing">Agri-processing</option>
                <option value="Rural Retail">Rural Retail</option>
                <option value="Handloom/Textile">Handloom/Textile</option>
                <option value="Light Manufacturing">Light Manufacturing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Sub-Activity
              </label>
              <input
                type="text"
                value={subActivity}
                onChange={(e) => setSubActivity(e.target.value)}
                placeholder="e.g. Cold storage, Drip tomato"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                District (Hazard Zone)
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40"
              >
                {hazards.map((h) => (
                  <option key={h.id} value={h.district}>
                    {h.district} ({h.state})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Infrastructure Factors */}
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
              Vulnerability & Resilience Infrastructure
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                  Irrigation Access
                </label>
                <select
                  value={irrigationAccess}
                  onChange={(e) => setIrrigationAccess(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs text-on-surface"
                >
                  <option value="Borewell + Drip">Borewell + Drip (+25 pts)</option>
                  <option value="Canal Irrigated">Canal Irrigated (+20 pts)</option>
                  <option value="Rainfed Only">Rainfed Only (0 pts)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                  Soil Drainage Type
                </label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs text-on-surface"
                >
                  <option value="Alluvial">Alluvial (High drainage)</option>
                  <option value="Black Cotton">Black Cotton</option>
                  <option value="Red Sandy">Red Sandy</option>
                  <option value="Clay Loam">Clay Loam (Waterlogging prone)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                  Utility Reliability
                </label>
                <select
                  value={utilityReliability}
                  onChange={(e) => setUtilityReliability(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs text-on-surface"
                >
                  <option value="24x7 Grid">24x7 Grid</option>
                  <option value="Intermittent Grid with Solar Backup">
                    Intermittent Grid with Solar Backup
                  </option>
                  <option value="Unreliable Grid">Unreliable Grid</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-on-surface-variant mb-1">
                  Supply Chain Resilience
                </label>
                <select
                  value={supplyChainResilience}
                  onChange={(e) => setSupplyChainResilience(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs text-on-surface"
                >
                  <option value="Direct APMC Mandi Link">Direct APMC Mandi Link</option>
                  <option value="Interstate Cold Chain">Interstate Cold Chain</option>
                  <option value="Local Village Trader">Local Village Trader</option>
                </select>
              </div>
            </div>
          </div>

          {/* Financials & Insurance */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Loan Amount (₹)
              </label>
              <input
                type="number"
                required
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Monthly Rev (₹)
              </label>
              <input
                type="number"
                required
                value={monthlyRevenue}
                onChange={(e) => setMonthlyRevenue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Repayment Score (300-900)
              </label>
              <input
                type="number"
                min="300"
                max="900"
                required
                value={repaymentScore}
                onChange={(e) => setRepaymentScore(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Insurance Status
              </label>
              <select
                value={insuranceStatus}
                onChange={(e) => setInsuranceStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface"
              >
                <option value="Active Crop Insurance">Active Crop Insurance</option>
                <option value="Asset Insured">Asset Insured</option>
                <option value="Uninsured">Uninsured</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-outline hover:text-primary transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {saving ? 'Registering...' : 'Register & Compute Risk Score'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
