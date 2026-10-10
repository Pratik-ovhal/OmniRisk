import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'
import type { Borrower, RegionalHazard, ClimateScore } from '../types/database.types'
import { calculateClimateScore } from '../engine/scoringEngine'
import { fetchActiveAlerts, syncPortfolioAlerts, resolveAlert, type AlertWithBorrower } from '../api/alertService'
import { archiveCustomer, restoreCustomer } from '../api/customerService'
import BankHeader from '../components/common/BankHeader'
import CriticalAlertBanner from '../components/common/CriticalAlertBanner'
import PortfolioMetricStrip from '../components/bank/PortfolioMetricStrip'
import BorrowerTable, { type EnrichedBorrower } from '../components/bank/BorrowerTable'
import DistrictPortfolioSummary from '../components/bank/DistrictPortfolioSummary'
import AlertCenter from '../components/bank/AlertCenter'
import RiskMap from '../components/bank/RiskMap'
import CustomerFormModal from '../components/bank/CustomerFormModal'
import BorrowerDetailModal from '../components/bank/BorrowerDetailModal'
import ArchiveConfirmModal from '../components/bank/ArchiveConfirmModal'

export default function BankDashboardPage() {
  const [borrowers, setBorrowers] = useState<EnrichedBorrower[]>([])
  const [hazards, setHazards] = useState<RegionalHazard[]>([])
  const [alerts, setAlerts] = useState<AlertWithBorrower[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'directory' | 'alerts' | 'portfolio' | 'map'>('directory')

  // Modals & Customer Lifecycle State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [customerToEdit, setCustomerToEdit] = useState<Borrower | null>(null)
  const [selectedBorrower, setSelectedBorrower] = useState<EnrichedBorrower | null>(null)

  // Archive confirmation
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [customerToArchive, setCustomerToArchive] = useState<Borrower | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null)

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Fetch Hazards
      const { data: hazardsData } = await supabase.from('regional_hazards').select('*')
      const hazardList = (hazardsData || []) as RegionalHazard[]
      setHazards(hazardList)

      // 2. Fetch Borrowers (all including archived so tab can display both)
      const { data: borrowersData } = await supabase
        .from('borrowers')
        .select('*')
        .order('created_at', { ascending: false })
      const borrowerList = (borrowersData || []) as Borrower[]

      // 3. Fetch Climate Scores
      const { data: scoresData } = await supabase.from('climate_scores').select('*')
      const scoresMap = new Map<string, ClimateScore>()
      ;(scoresData || []).forEach((s: any) => scoresMap.set(s.borrower_id, s))

      // 4. Enrich borrowers with scores (calculate if missing)
      const hazardMap = new Map<string, RegionalHazard>()
      hazardList.forEach((h) => hazardMap.set(h.district.toLowerCase(), h))

      const enriched: EnrichedBorrower[] = borrowerList.map((b) => {
        let score = scoresMap.get(b.id)
        if (!score) {
          const h = hazardMap.get(b.district.toLowerCase()) || hazardList[0]
          const calc = calculateClimateScore(b, h, null)
          score = {
            id: `temp_${b.id}`,
            borrower_id: b.id,
            total_score: calc.totalScore,
            advisory_label: calc.advisoryLabel,
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
        }
        return {
          ...b,
          climateScore: score,
          rain7d: (score?.forecast_subscore || 50) < 50 ? 112 : 18,
        }
      })

      setBorrowers(enriched)

      // 5. Fetch Alerts & trigger sync if empty (only for active borrowers)
      const activeBorrowers = borrowerList.filter((b) => !b.is_archived)
      let activeAlertList = await fetchActiveAlerts()
      if (activeAlertList.length === 0 && activeBorrowers.length > 0 && hazardList.length > 0) {
        await syncPortfolioAlerts(activeBorrowers, hazardList)
        activeAlertList = await fetchActiveAlerts()
      }
      setAlerts(activeAlertList)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleResolveAlert = async (alertId: string) => {
    const success = await resolveAlert(alertId)
    if (success) {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
      showToast('Climate alert resolved and cleared from active alerts.', 'info')
    }
  }

  const handleSelectBorrowerById = (borrowerId: string) => {
    const target = borrowers.find((b) => b.id === borrowerId)
    if (target) setSelectedBorrower(target)
  }

  // Open Add modal
  const handleOpenAdd = () => {
    setCustomerToEdit(null)
    setFormMode('create')
    setIsFormOpen(true)
  }

  // Open Edit modal
  const handleOpenEdit = (customer: Borrower) => {
    setCustomerToEdit(customer)
    setFormMode('edit')
    setIsFormOpen(true)
  }

  // Open Archive confirmation modal
  const handleOpenArchive = (customer: Borrower) => {
    setCustomerToArchive(customer)
    setIsArchiveOpen(true)
  }

  // Confirm Archive action
  const handleConfirmArchive = async () => {
    if (!customerToArchive) return
    setIsArchiving(true)
    try {
      await archiveCustomer(customerToArchive.id)
      showToast(`Customer "${customerToArchive.business_name}" archived. Historical scores preserved.`, 'info')
      setIsArchiveOpen(false)
      setCustomerToArchive(null)
      if (selectedBorrower?.id === customerToArchive.id) {
        setSelectedBorrower(null)
      }
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to archive customer')
    } finally {
      setIsArchiving(false)
    }
  }

  // Restore Customer action
  const handleRestoreCustomer = async (customer: Borrower) => {
    try {
      await restoreCustomer(customer.id)
      showToast(`Customer "${customer.business_name}" restored to active lending portfolio!`, 'success')
      await loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to restore customer')
    }
  }

  // Form Submission Success
  const handleFormSuccess = (_customer: Borrower, _score?: any, message?: string) => {
    showToast(message || 'Customer saved successfully!', 'success')
    loadData()
  }

  // Filter active borrowers for metric calculations and map pins
  const activeBorrowers = borrowers.filter((b) => !b.is_archived)

  // Aggregate Metrics for Metric Strip (Active portfolio only)
  const totalLoanAmount = activeBorrowers.reduce((acc, b) => acc + (b.loan_amount || 0), 0)
  const highRiskCount = activeBorrowers.filter(
    (b) => (b.climateScore?.total_score ?? 50) < 40
  ).length
  const criticalAlertCount = alerts.filter((a) => a.severity === 'CRITICAL').length
  const averageScore = activeBorrowers.length > 0
    ? Math.round(
        activeBorrowers.reduce((acc, b) => acc + (b.climateScore?.total_score ?? 50), 0) /
          activeBorrowers.length
      )
    : 0

  return (
    <div className="min-h-screen bg-surface flex flex-col text-on-surface">
      {/* Top Header */}
      <BankHeader activeAlertCount={alerts.length} />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-slideDown">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-700'
                : 'bg-primary text-white border-secondary'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {toastMessage.type === 'success' ? 'check_circle' : 'info'}
            </span>
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Synthetic Demonstration Disclaimer Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[20px]">science</span>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                <strong className="text-primary font-semibold">Hackathon Demonstration Dataset:</strong> Synthetic MSME and agricultural profiles generated for prototyping.
                Live Open-Meteo meteorological forecasts and World Bank regional indices are live.
              </p>
              <p className="text-[11px] text-outline mt-0.5 font-medium">
                Advisory only. OmniRisk provides decision-support risk scoring. The bank makes all lending decisions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-secondary/10 text-secondary border border-secondary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              Open-Meteo Synced
            </span>
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {criticalAlertCount > 0 && (
          <div className="mb-6">
            <CriticalAlertBanner
              alerts={alerts}
              onViewAll={() => setActiveTab('alerts')}
            />
          </div>
        )}

        {/* Top Metric Strip */}
        <div className="mb-8">
          <PortfolioMetricStrip
            totalLoanAmount={totalLoanAmount}
            borrowerCount={activeBorrowers.length}
            highRiskCount={highRiskCount}
            criticalAlertCount={criticalAlertCount}
            averageScore={averageScore}
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-outline-variant/30 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'directory'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">groups</span>
            <span>Customer Directory</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'directory'
                  ? 'bg-white/20 text-white'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}
            >
              {borrowers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'alerts'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">notifications_active</span>
            <span>Early Warning Alerts</span>
            {alerts.length > 0 && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  criticalAlertCount > 0
                    ? 'bg-error text-white'
                    : activeTab === 'alerts'
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {alerts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'portfolio'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">bar_chart</span>
            <span>District Risk Distribution</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'map'
                ? 'bg-primary text-white shadow-xs'
                : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">map</span>
            <span>GIS Risk Map</span>
          </button>
        </div>

        {/* Active Content View */}
        {loading ? (
          <div className="p-16 text-center text-on-surface-variant">
            <div className="w-10 h-10 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-semibold text-primary">Loading portfolio & climate analytics...</p>
          </div>
        ) : (
          <div>
            {activeTab === 'directory' && (
              <BorrowerTable
                borrowers={borrowers}
                onSelectBorrower={(b) => setSelectedBorrower(b)}
                onAddBorrower={handleOpenAdd}
                onEditBorrower={(b) => handleOpenEdit(b)}
                onArchiveBorrower={(b) => handleOpenArchive(b)}
                onRestoreBorrower={(b) => handleRestoreCustomer(b)}
              />
            )}

            {activeTab === 'alerts' && (
              <AlertCenter
                alerts={alerts}
                onResolve={handleResolveAlert}
                onSelectBorrower={handleSelectBorrowerById}
              />
            )}

            {activeTab === 'portfolio' && (
              <DistrictPortfolioSummary
                borrowers={activeBorrowers}
                hazards={hazards}
                onSelectDistrict={(_district) => {
                  setActiveTab('directory')
                }}
              />
            )}

            {activeTab === 'map' && (
              <RiskMap
                borrowers={activeBorrowers}
                hazards={hazards}
                onSelectBorrower={(b) => setSelectedBorrower(b)}
              />
            )}
          </div>
        )}
      </main>

      {/* Unified Add/Edit Customer Modal with Map Picker & Nominatim Search */}
      <CustomerFormModal
        isOpen={isFormOpen}
        mode={formMode}
        customer={customerToEdit}
        hazards={hazards}
        onClose={() => {
          setIsFormOpen(false)
          setCustomerToEdit(null)
        }}
        onSuccess={handleFormSuccess}
      />

      {/* Archive Confirmation Modal */}
      <ArchiveConfirmModal
        isOpen={isArchiveOpen}
        customer={customerToArchive}
        loading={isArchiving}
        onClose={() => {
          setIsArchiveOpen(false)
          setCustomerToArchive(null)
        }}
        onConfirm={handleConfirmArchive}
      />

      {/* Customer Detail Inspection Modal */}
      <BorrowerDetailModal
        borrower={selectedBorrower}
        hazard={
          selectedBorrower
            ? hazards.find(
                (h) => h.district.toLowerCase() === selectedBorrower.district.toLowerCase()
              )
            : undefined
        }
        onClose={() => setSelectedBorrower(null)}
        onEdit={(b) => {
          setSelectedBorrower(null)
          handleOpenEdit(b)
        }}
        onArchive={(b) => {
          setSelectedBorrower(null)
          handleOpenArchive(b)
        }}
      />
    </div>
  )
}
