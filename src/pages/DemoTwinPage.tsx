import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Droplets, 
  Sun, 
  Landmark, 
  TrendingUp, 
  ExternalLink, 
  RotateCcw,
  Sliders,
  Scale
} from 'lucide-react'
import BankHeader from '../components/common/BankHeader'
import SyntheticDataBanner from '../components/common/SyntheticDataBanner'
import ScoreGauge from '../components/borrower/ScoreGauge'
import { supabase } from '../api/supabaseClient'
import { fetchWeatherForecast } from '../api/openMeteo'
import { calculateClimateScore } from '../engine/scoringEngine'
import type { Borrower, RegionalHazard } from '../types/database.types'
import type { WeatherSummary } from '../types/weather.types'

export default function DemoTwinPage() {
  const [twinA, setTwinA] = useState<Borrower | null>(null)
  const [twinB, setTwinB] = useState<Borrower | null>(null)
  const [hazardA, setHazardA] = useState<RegionalHazard | null>(null)
  const [hazardB, setHazardB] = useState<RegionalHazard | null>(null)
  const [weatherA, setWeatherA] = useState<WeatherSummary | null>(null)
  const [weatherB, setWeatherB] = useState<WeatherSummary | null>(null)

  // Interactive "What-If" Simulation state for Twin A
  const [simTwinAInsurance, setSimTwinAInsurance] = useState(false)
  const [simTwinAIrrigation, setSimTwinAIrrigation] = useState(false)
  const [simTwinASolar, setSimTwinASolar] = useState(false)
  const [simWeatherSeverity, setSimWeatherSeverity] = useState<'realtime' | 'monsoon_surge' | 'mild'>('realtime')

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTwins() {
      setLoading(true)
      try {
        // Fetch Twin A and Twin B by token or tag
        const { data: bData } = await supabase
          .from('borrowers')
          .select('*')
          .in('public_token', ['token_kolhapur_1', 'token_pune_2'])

        let a = bData?.find(b => b.public_token === 'token_kolhapur_1') || null
        let b = bData?.find(b => b.public_token === 'token_pune_2') || null

        // Fallbacks if database not yet loaded
        if (!a) {
          a = {
            id: 'twin-a-default',
            public_token: 'token_kolhapur_1',
            borrower_name: 'Ramesh Ganpat Patil',
            business_name: 'Kaveri Agro FPC (Paddy Processing)',
            sector: 'Agriculture',
            sub_activity: 'Paddy Milling & Seasonal Storage',
            district: 'Kolhapur',
            state: 'Maharashtra',
            latitude: 16.698,
            longitude: 74.231,
            soil_type: 'Clay Loam',
            irrigation_access: 'Rainfed Only',
            utility_reliability: 'Unreliable Grid',
            supply_chain_resilience: 'Local Village Trader',
            loan_amount: 500000,
            monthly_revenue: 65000,
            repayment_score: 740,
            insurance_status: 'Uninsured',
            is_synthetic: true,
            demo_tag: 'Twin A (High Climate Exposure)',
            created_at: new Date().toISOString()
          }
        }

        if (!b) {
          b = {
            id: 'twin-b-default',
            public_token: 'token_pune_2',
            borrower_name: 'Suresh Dinkar Shinde',
            business_name: 'Sahyadri Bio-Farms (Horticulture)',
            sector: 'Agriculture',
            sub_activity: 'Protected Polyhouse Tomato & Grapes',
            district: 'Pune',
            state: 'Maharashtra',
            latitude: 18.528,
            longitude: 73.864,
            soil_type: 'Alluvial',
            irrigation_access: 'Borewell + Drip',
            utility_reliability: 'Intermittent Grid with Solar Backup',
            supply_chain_resilience: 'Direct APMC Mandi Link',
            loan_amount: 500000,
            monthly_revenue: 65000,
            repayment_score: 740,
            insurance_status: 'Active Crop Insurance',
            is_synthetic: true,
            demo_tag: 'Twin B (Resilient Climate Buffer)',
            created_at: new Date().toISOString()
          }
        }

        setTwinA(a)
        setTwinB(b)

        // Regional Hazards
        const { data: hData } = await supabase
          .from('regional_hazards')
          .select('*')
          .in('district', ['Kolhapur', 'Pune'])

        const ha = hData?.find(h => h.district === 'Kolhapur') || {
          id: 'hz-kolhapur',
          district: 'Kolhapur',
          state: 'Maharashtra',
          country: 'India',
          latitude: 16.7050,
          longitude: 74.2433,
          flood_hazard_index: 0.88,
          drought_hazard_index: 0.18,
          heat_stress_index: 0.35,
          cyclone_storm_index: 0.22,
          updated_at: new Date().toISOString()
        }

        const hb = hData?.find(h => h.district === 'Pune') || {
          id: 'hz-pune',
          district: 'Pune',
          state: 'Maharashtra',
          country: 'India',
          latitude: 18.5204,
          longitude: 73.8567,
          flood_hazard_index: 0.35,
          drought_hazard_index: 0.30,
          heat_stress_index: 0.38,
          cyclone_storm_index: 0.12,
          updated_at: new Date().toISOString()
        }

        setHazardA(ha)
        setHazardB(hb)

        // Weather
        const [wA, wB] = await Promise.all([
          fetchWeatherForecast(a.latitude, a.longitude),
          fetchWeatherForecast(b.latitude, b.longitude)
        ])
        setWeatherA(wA)
        setWeatherB(wB)
      } catch (err) {
        console.error('Error loading twins:', err)
      } finally {
        setLoading(false)
      }
    }

    loadTwins()
  }, [])

  // Derive adjusted Twin A based on simulation toggles
  const simulatedTwinA: Borrower | null = twinA ? {
    ...twinA,
    insurance_status: simTwinAInsurance ? 'Active Crop Insurance' : 'Uninsured',
    irrigation_access: simTwinAIrrigation ? 'Borewell + Drip' : 'Rainfed Only',
    utility_reliability: simTwinASolar ? 'Intermittent Grid with Solar Backup' : 'Unreliable Grid',
  } : null

  // Derive adjusted Weather A
  let simulatedWeatherA = weatherA
  if (weatherA && simWeatherSeverity === 'monsoon_surge') {
    simulatedWeatherA = {
      ...weatherA,
      totalPrecipitation7d: 118,
      rain7d: 118,
      maxDailyPrecipitation: 76
    }
  } else if (weatherA && simWeatherSeverity === 'mild') {
    simulatedWeatherA = {
      ...weatherA,
      totalPrecipitation7d: 22,
      rain7d: 22,
      maxDailyPrecipitation: 8
    }
  }

  // Calculate Scores
  const scoreResultA = simulatedTwinA && hazardA ? calculateClimateScore(simulatedTwinA, hazardA, simulatedWeatherA) : null
  const scoreResultB = twinB && hazardB ? calculateClimateScore(twinB, hazardB, weatherB) : null

  const divergence = (scoreResultB?.totalScore ?? 0) - (scoreResultA?.totalScore ?? 0)

  const resetSimulation = () => {
    setSimTwinAInsurance(false)
    setSimTwinAIrrigation(false)
    setSimTwinASolar(false)
    setSimWeatherSeverity('realtime')
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col text-on-surface">
      <BankHeader />
      <SyntheticDataBanner />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                to="/bank/dashboard"
                className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Link>
              <span className="text-outline-variant">•</span>
              <span className="text-xs font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                Live Hackathon Demo Scenario
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
              The Twin Borrower Climate Paradox
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-3xl mt-1 leading-relaxed">
              Why traditional credit underwriting produces blindspots: Two agricultural borrowers with{' '}
              <strong className="text-primary font-bold">identical financials</strong> diverge by{' '}
              <strong className="text-rose-600 font-bold">{Math.abs(divergence)} resilience points</strong> due to localized climate exposure.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={resetSimulation}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-xs font-bold text-primary border border-outline-variant/30 transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Baseline
            </button>
          </div>
        </div>

        {/* Executive Divergence Callout Banner */}
        <div className="bg-gradient-to-r from-primary via-slate-900 to-primary rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-secondary/30 to-transparent pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Financial Parity vs Climate Divergence
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Traditional Credit Verdict: <span className="text-slate-300">Identical Risk Profile</span>
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Under standard loan underwriting, both borrowers qualify for standard ₹5,00,000 credit limits with identical 740 credit scores. However, OmniRisk uncovers hidden vulnerability: <strong>Twin A</strong> operates in a riverine flood plain with rainfed reliance, while <strong>Twin B</strong> employs drip irrigation and formal crop insurance.
              </p>
            </div>

            {/* Score Delta Badge */}
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/15 shrink-0">
              <div className="text-center">
                <span className="text-[11px] font-bold text-rose-300 uppercase block">Twin A (Kolhapur)</span>
                <span className="text-3xl font-black text-rose-400">
                  {scoreResultA?.totalScore ?? '--'}
                </span>
                <span className="text-[10px] text-slate-300 block">High Risk</span>
              </div>

              <div className="h-10 w-[1px] bg-white/20" />

              <div className="text-center">
                <span className="text-[11px] font-bold text-emerald-300 uppercase block">Twin B (Pune)</span>
                <span className="text-3xl font-black text-emerald-400">
                  {scoreResultB?.totalScore ?? '--'}
                </span>
                <span className="text-[10px] text-slate-300 block">Low Risk</span>
              </div>

              <div className="h-10 w-[1px] bg-white/20" />

              <div className="text-center pl-2">
                <span className="text-[10px] font-bold uppercase text-amber-300 block">Score Delta</span>
                <span className="text-2xl font-black text-amber-400">
                  +{divergence} pts
                </span>
                <span className="text-[10px] text-slate-300 block">Divergence</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive "What-If" Simulation Controls for Twin A */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-outline-variant/20">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-secondary" />
              <h3 className="font-bold text-primary text-base">
                Interactive Resilience Simulator: Test Climate Interventions on Twin A
              </h3>
            </div>
            <span className="text-xs text-on-surface-variant font-medium">
              Watch real-time score adjustment when borrower adopts resilience buffers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Toggle 1: Crop Insurance */}
            <button
              onClick={() => setSimTwinAInsurance(!simTwinAInsurance)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start justify-between ${
                simTwinAInsurance
                  ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                  : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container'
              }`}
            >
              <div>
                <span className="text-xs font-bold text-primary block mb-0.5">
                  PMFBY Crop Insurance
                </span>
                <span className="text-[11px] text-on-surface-variant block">
                  Liquidity buffer against yield loss (+20 pts financial)
                </span>
              </div>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                simTwinAInsurance ? 'bg-emerald-600 text-white' : 'border border-outline-variant bg-white text-transparent'
              }`}>
                ✓
              </span>
            </button>

            {/* Toggle 2: Drip Irrigation */}
            <button
              onClick={() => setSimTwinAIrrigation(!simTwinAIrrigation)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start justify-between ${
                simTwinAIrrigation
                  ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                  : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container'
              }`}
            >
              <div>
                <span className="text-xs font-bold text-primary block mb-0.5">
                  Borewell + Micro-Drip
                </span>
                <span className="text-[11px] text-on-surface-variant block">
                  Replaces rainfed risk with water security (+25 pts farm)
                </span>
              </div>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                simTwinAIrrigation ? 'bg-emerald-600 text-white' : 'border border-outline-variant bg-white text-transparent'
              }`}>
                ✓
              </span>
            </button>

            {/* Toggle 3: Solar Backup */}
            <button
              onClick={() => setSimTwinASolar(!simTwinASolar)}
              className={`p-3.5 rounded-2xl border text-left transition-all flex items-start justify-between ${
                simTwinASolar
                  ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                  : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container'
              }`}
            >
              <div>
                <span className="text-xs font-bold text-primary block mb-0.5">
                  Solar Power Backup
                </span>
                <span className="text-[11px] text-on-surface-variant block">
                  Operational continuity during grid failure (+15 pts)
                </span>
              </div>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                simTwinASolar ? 'bg-emerald-600 text-white' : 'border border-outline-variant bg-white text-transparent'
              }`}>
                ✓
              </span>
            </button>

            {/* Weather Scenario Selector */}
            <div className="p-3 rounded-2xl border border-outline-variant/30 bg-surface-container-low flex flex-col justify-between">
              <span className="text-xs font-bold text-primary block mb-1">
                7-Day Forecast Scenario
              </span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => setSimWeatherSeverity('realtime')}
                  className={`py-1 rounded-lg text-[10px] font-bold transition-all ${
                    simWeatherSeverity === 'realtime'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-white text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  Live Met
                </button>
                <button
                  onClick={() => setSimWeatherSeverity('monsoon_surge')}
                  className={`py-1 rounded-lg text-[10px] font-bold transition-all ${
                    simWeatherSeverity === 'monsoon_surge'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  118mm Rain
                </button>
                <button
                  onClick={() => setSimWeatherSeverity('mild')}
                  className={`py-1 rounded-lg text-[10px] font-bold transition-all ${
                    simWeatherSeverity === 'mild'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  Mild 22mm
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Side-by-Side Dual Comparison Cards */}
        {loading || !simulatedTwinA || !twinB || !scoreResultA || !scoreResultB ? (
          <div className="p-12 text-center text-sm font-semibold text-on-surface-variant animate-pulse">
            Loading Twin Demonstration Model...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* COLUMN 1: TWIN A */}
            <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border-2 border-rose-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-rose-500 text-white text-[11px] font-bold px-4 py-1 rounded-bl-2xl">
                Twin A • High Climate Exposure
              </div>

              <div>
                {/* Header */}
                <div className="space-y-1 mb-4 pr-12">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                      Kolhapur Basin • Rainfed
                    </span>
                    {simTwinAInsurance && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        +Simulated Insurance
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-primary">
                    {simulatedTwinA.business_name}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Proprietor: <strong className="text-primary">{simulatedTwinA.borrower_name}</strong> • {simulatedTwinA.district}, {simulatedTwinA.state}
                  </p>
                </div>

                {/* Identical Financials Strip */}
                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 mb-6">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-2">
                    Traditional Underwriting Parameters (Identical)
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[10px] text-on-surface-variant block">Loan Sanction</span>
                      <strong className="text-xs font-bold text-primary">₹5,00,000</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-on-surface-variant block">Monthly Rev</span>
                      <strong className="text-xs font-bold text-primary">₹65,000</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-on-surface-variant block">Credit Score</span>
                      <strong className="text-xs font-bold text-emerald-700">740 (Prime)</strong>
                    </div>
                  </div>
                </div>

                {/* Score Radial Gauge */}
                <div className="mb-6">
                  <ScoreGauge
                    score={scoreResultA.totalScore}
                    label={scoreResultA.advisoryLabel}
                  />
                </div>

                {/* Subscore Breakdown */}
                <div className="space-y-3 mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block">
                    Pillar Breakdown (0 - 100)
                  </span>

                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-on-surface-variant flex items-center gap-1">
                          <Landmark className="w-3.5 h-3.5 text-primary" /> Location Hazard Resilience (30%)
                        </span>
                        <span className="font-bold text-primary">{scoreResultA.hazardSubscore}/100</span>
                      </div>
                      <div className="w-full bg-outline-variant/30 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full transition-all duration-500"
                          style={{ width: `${scoreResultA.hazardSubscore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-on-surface-variant flex items-center gap-1">
                          <Droplets className="w-3.5 h-3.5 text-secondary" /> Farm Vulnerability Resilience (25%)
                        </span>
                        <span className="font-bold text-primary">{scoreResultA.vulnerabilitySubscore}/100</span>
                      </div>
                      <div className="w-full bg-outline-variant/30 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            scoreResultA.vulnerabilitySubscore >= 60 ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${scoreResultA.vulnerabilitySubscore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-on-surface-variant flex items-center gap-1">
                          <Sun className="w-3.5 h-3.5 text-amber-500" /> Live Forecast Outlook (25%)
                        </span>
                        <span className="font-bold text-primary">{scoreResultA.forecastSubscore}/100</span>
                      </div>
                      <div className="w-full bg-outline-variant/30 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            scoreResultA.forecastSubscore >= 60 ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${scoreResultA.forecastSubscore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-on-surface-variant flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-blue-600" /> Financial Cushion (20%)
                        </span>
                        <span className="font-bold text-primary">{scoreResultA.financialSubscore}/100</span>
                      </div>
                      <div className="w-full bg-outline-variant/30 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            scoreResultA.financialSubscore >= 70 ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${scoreResultA.financialSubscore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary Risk Drivers */}
                <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/60 mb-6 space-y-2">
                  <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> Primary Climate Drivers
                  </span>
                  <ul className="space-y-1.5 text-xs text-rose-950">
                    {scoreResultA.topRiskFactors.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="font-bold text-rose-600">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Bottom Action for Bank Officer */}
              <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-on-surface-variant block">Advisory Guidance:</span>
                  <strong className="text-rose-700">Detailed Review + Insurance Rec.</strong>
                </div>
                <Link
                  to={`/borrower/${simulatedTwinA.public_token}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline"
                >
                  Borrower View <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* COLUMN 2: TWIN B */}
            <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border-2 border-emerald-300 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[11px] font-bold px-4 py-1 rounded-bl-2xl">
                Twin B • Resilient Climate Buffer
              </div>

              <div>
                {/* Header */}
                <div className="space-y-1 mb-4 pr-12">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Pune Elevated Tableland • Drip Irrigated
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-primary">
                    {twinB.business_name}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Proprietor: <strong className="text-primary">{twinB.borrower_name}</strong> • {twinB.district}, {twinB.state}
                  </p>
                </div>

                {/* Identical Financials Strip */}
                <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/20 mb-6">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-2">
                    Traditional Underwriting Parameters (Identical)
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[10px] text-on-surface-variant block">Loan Sanction</span>
                      <strong className="text-xs font-bold text-primary">₹5,00,000</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-on-surface-variant block">Monthly Rev</span>
                      <strong className="text-xs font-bold text-primary">₹65,000</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-on-surface-variant block">Credit Score</span>
                      <strong className="text-xs font-bold text-emerald-700">740 (Prime)</strong>
                    </div>
                  </div>
                </div>

                {/* Score Radial Gauge */}
                <div className="mb-6">
                  <ScoreGauge
                    score={scoreResultB.totalScore}
                    label={scoreResultB.advisoryLabel}
                  />
                </div>

                {/* Subscore Breakdown */}
                <div className="space-y-3 mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block">
                    Pillar Breakdown (0 - 100)
                  </span>

                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-on-surface-variant flex items-center gap-1">
                          <Landmark className="w-3.5 h-3.5 text-primary" /> Location Hazard Resilience (30%)
                        </span>
                        <span className="font-bold text-primary">{scoreResultB.hazardSubscore}/100</span>
                      </div>
                      <div className="w-full bg-outline-variant/30 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${scoreResultB.hazardSubscore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-on-surface-variant flex items-center gap-1">
                          <Droplets className="w-3.5 h-3.5 text-secondary" /> Farm Vulnerability Resilience (25%)
                        </span>
                        <span className="font-bold text-primary">{scoreResultB.vulnerabilitySubscore}/100</span>
                      </div>
                      <div className="w-full bg-outline-variant/30 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${scoreResultB.vulnerabilitySubscore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-on-surface-variant flex items-center gap-1">
                          <Sun className="w-3.5 h-3.5 text-amber-500" /> Live Forecast Outlook (25%)
                        </span>
                        <span className="font-bold text-primary">{scoreResultB.forecastSubscore}/100</span>
                      </div>
                      <div className="w-full bg-outline-variant/30 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${scoreResultB.forecastSubscore}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-on-surface-variant flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-blue-600" /> Financial Cushion (20%)
                        </span>
                        <span className="font-bold text-primary">{scoreResultB.financialSubscore}/100</span>
                      </div>
                      <div className="w-full bg-outline-variant/30 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${scoreResultB.financialSubscore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary Protective Factors */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 mb-6 space-y-2">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Primary Protective Buffers
                  </span>
                  <ul className="space-y-1.5 text-xs text-emerald-950">
                    {scoreResultB.topProtectiveFactors.map((p, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="font-bold text-emerald-600">✓</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Bottom Action for Bank Officer */}
              <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-on-surface-variant block">Advisory Guidance:</span>
                  <strong className="text-emerald-700">Suggested Green Lending Margin Incentive</strong>
                </div>
                <Link
                  to={`/borrower/${twinB.public_token}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline"
                >
                  Borrower View <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Matrix Table */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-secondary" />
            <h3 className="font-bold text-primary text-base">
              Detailed Twin Comparison Matrix
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-outline-variant/30 text-on-surface-variant">
                  <th className="py-3 px-4 font-bold uppercase tracking-wider">Evaluation Dimension</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-rose-700">Twin A (Kaveri Agro)</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-emerald-700">Twin B (Sahyadri Bio-Farms)</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-primary">Traditional Underwriting</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-secondary">OmniRisk Assessment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                <tr>
                  <td className="py-3 px-4 font-semibold text-primary">Sanctioned Loan Amount</td>
                  <td className="py-3 px-4 font-medium">₹5,00,000</td>
                  <td className="py-3 px-4 font-medium">₹5,00,000</td>
                  <td className="py-3 px-4 text-emerald-700 font-semibold">Identical Exposure</td>
                  <td className="py-3 px-4 text-on-surface-variant">Neutral baseline</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-primary">Monthly Business Turnover</td>
                  <td className="py-3 px-4 font-medium">₹65,000</td>
                  <td className="py-3 px-4 font-medium">₹65,000</td>
                  <td className="py-3 px-4 text-emerald-700 font-semibold">Equal DSCR Capacity</td>
                  <td className="py-3 px-4 text-on-surface-variant">Neutral baseline</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-primary">Historical Credit Repayment</td>
                  <td className="py-3 px-4 font-medium">740 (Grade A)</td>
                  <td className="py-3 px-4 font-medium">740 (Grade A)</td>
                  <td className="py-3 px-4 text-emerald-700 font-semibold">Identical Creditworthiness</td>
                  <td className="py-3 px-4 text-on-surface-variant">Neutral baseline</td>
                </tr>
                <tr className="bg-rose-50/40">
                  <td className="py-3 px-4 font-bold text-rose-900">Regional Flood Hazard (World Bank)</td>
                  <td className="py-3 px-4 font-bold text-rose-700">88% (High Peril River Basin)</td>
                  <td className="py-3 px-4 font-bold text-emerald-700">35% (Elevated Tableland)</td>
                  <td className="py-3 px-4 text-slate-500 italic">Not tracked by credit bureau</td>
                  <td className="py-3 px-4 font-bold text-rose-700">Heavy -25 pts penalty for Twin A</td>
                </tr>
                <tr className="bg-amber-50/40">
                  <td className="py-3 px-4 font-bold text-amber-900">Irrigation & Infrastructure</td>
                  <td className="py-3 px-4 font-medium text-amber-800">
                    {simTwinAIrrigation ? 'Borewell + Drip (Simulated)' : 'Rainfed Only (100% weather reliant)'}
                  </td>
                  <td className="py-3 px-4 font-medium text-emerald-800">Borewell + Micro-Drip System</td>
                  <td className="py-3 px-4 text-slate-500 italic">Ignored in uncollateralized lending</td>
                  <td className="py-3 px-4 font-bold text-primary">+25 pts resilience advantage for Twin B</td>
                </tr>
                <tr className="bg-blue-50/40">
                  <td className="py-3 px-4 font-bold text-blue-900">Crop & Peril Insurance</td>
                  <td className="py-3 px-4 font-medium text-blue-800">
                    {simTwinAInsurance ? 'Active PMFBY (Simulated)' : 'Uninsured (100% loss absorption)'}
                  </td>
                  <td className="py-3 px-4 font-medium text-emerald-800">Active Crop Insurance (PMFBY)</td>
                  <td className="py-3 px-4 text-slate-500 italic">Optional checkbox only</td>
                  <td className="py-3 px-4 font-bold text-secondary">+20 pts instant liquidity cushion</td>
                </tr>
                <tr className="bg-surface-container-low font-bold">
                  <td className="py-3.5 px-4 text-primary">Final Underwriter Verdict</td>
                  <td className="py-3.5 px-4 text-rose-700">
                    Score: {scoreResultA?.totalScore ?? '--'} ({scoreResultA?.advisoryLabel ?? 'Calculating'})
                  </td>
                  <td className="py-3.5 px-4 text-emerald-700">
                    Score: {scoreResultB?.totalScore ?? '--'} ({scoreResultB?.advisoryLabel ?? 'Calculating'})
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">Identical ₹5L Unhedged Loans</td>
                  <td className="py-3.5 px-4 text-primary">
                    Twin B categorized Low Risk; Twin A advised parametric insurance rider
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
