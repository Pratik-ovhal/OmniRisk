import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  Building2, 
  MapPin, 
  RefreshCw, 
  ArrowLeft, 
  Share2, 
  HelpCircle, 
  Check, 
  AlertCircle, 
  Sparkles,
  Layers,
  ChevronDown,
  Droplets,
  Calendar
} from 'lucide-react'
import { supabase } from '../api/supabaseClient'
import { fetchWeatherForecast } from '../api/openMeteo'
import { calculateClimateScore, type CalculationResult } from '../engine/scoringEngine'
import ScoreGauge from '../components/borrower/ScoreGauge'
import FactorBreakdown from '../components/borrower/FactorBreakdown'
import InsuranceAdvice from '../components/borrower/InsuranceAdvice'
import WeatherForecastWidget from '../components/common/WeatherForecastWidget'
import SyntheticDataBanner from '../components/common/SyntheticDataBanner'
import type { Borrower, RegionalHazard } from '../types/database.types'
import type { WeatherSummary } from '../types/weather.types'

export default function BorrowerAwarenessPage() {
  const { token } = useParams<{ token: string }>()
  const [borrower, setBorrower] = useState<Borrower | null>(null)
  const [hazard, setHazard] = useState<RegionalHazard | null>(null)
  const [weather, setWeather] = useState<WeatherSummary | null>(null)
  const [computedScore, setComputedScore] = useState<CalculationResult | null>(null)
  const [refreshingWeather, setRefreshingWeather] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // Demo shortcut tokens for quick evaluation
  const demoShortcuts = [
    { label: 'Twin A: Kaveri Agro (Kolhapur)', token: 'token_kolhapur_1' },
    { label: 'Twin B: Sahyadri Bio-Farms (Pune)', token: 'token_pune_2' },
    { label: 'Solapur Groundnut FPO', token: 'token_solapur_7' },
    { label: 'Raigad Coastal Cold Chain', token: 'token_raigad_13' },
  ]

  async function loadBorrowerData(forceWeather = false) {
    if (!token) {
      setError('No access token provided in URL.')
      setLoading(false)
      return
    }

    if (!forceWeather) setLoading(true)
    else setRefreshingWeather(true)
    setError(null)

    try {
      // 1. Fetch borrower by public_token
      const { data: bData, error: bErr } = await supabase
        .from('borrowers')
        .select('*')
        .eq('public_token', token)
        .maybeSingle()

      if (bErr || !bData) {
        setError(`No borrower profile found for public token "${token}". Select one of the verified demo tokens below.`)
        setLoading(false)
        setRefreshingWeather(false)
        return
      }

      setBorrower(bData)

      // 2. Fetch regional hazards for district
      const { data: hData } = await supabase
        .from('regional_hazards')
        .select('*')
        .ilike('district', bData.district)
        .maybeSingle()

      const activeHazard: RegionalHazard = hData || {
        id: 'fallback',
        district: bData.district,
        state: bData.state,
        country: 'India',
        latitude: bData.latitude,
        longitude: bData.longitude,
        flood_hazard_index: 0.5,
        drought_hazard_index: 0.5,
        heat_stress_index: 0.5,
        cyclone_storm_index: 0.2,
        updated_at: new Date().toISOString(),
      }
      setHazard(activeHazard)

      // 3. Fetch live weather from Open-Meteo
      const weatherSummary = await fetchWeatherForecast(bData.latitude, bData.longitude, forceWeather)
      setWeather(weatherSummary)

      // 4. Calculate live score & factor explanations
      const scoreResult = calculateClimateScore(bData, activeHazard, weatherSummary)
      setComputedScore(scoreResult)
    } catch (err: unknown) {
      console.error('Error loading borrower awareness data:', err)
      setError('Failed to load resilience profile. Please check network connection.')
    } finally {
      setLoading(false)
      setRefreshingWeather(false)
    }
  }

  useEffect(() => {
    loadBorrowerData()
  }, [token])

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx)
  }

  const faqItems = [
    {
      q: 'Does this score approve or reject my loan application?',
      a: 'NO. OmniRisk is an environmental awareness and advisory tool only. It never approves or rejects loans. Final lending decisions are made entirely by the financial institution under standard credit policies. This score exists to highlight climate vulnerabilities and recommend risk protection.'
    },
    {
      q: 'Why does my score change throughout the week?',
      a: 'Your score incorporates live 7-day weather forecasts from meteorological services. If heavy rain or extreme heatwaves are projected over the coming 7 days, the forecast component adjusts temporarily to alert you and your financial partner to impending weather shocks.'
    },
    {
      q: 'How can I improve my resilience score?',
      a: 'Borrowers can improve their score by adopting protective buffers: enrolling in crop or asset insurance (such as PMFBY or WBCIS), investing in drip irrigation, installing solar backup power, and establishing direct APMC Mandi supply links.'
    },
    {
      q: 'Is insurance required to obtain credit?',
      a: 'No. The insurance suggestions presented here are completely independent and advisory. Insurance coverage provides a financial buffer during climate disasters, but enrollment is strictly voluntary and decoupled from loan underwriting.'
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center animate-spin">
            <RefreshCw className="w-6 h-6 text-secondary" />
          </div>
          <p className="text-sm font-semibold text-primary">
            Loading Real-Time Climate Resilience Profile...
          </p>
          <p className="text-xs text-on-surface-variant">
            Connecting Open-Meteo & World Bank CCKP Data
          </p>
        </div>
      </div>
    )
  }

  if (error || !borrower || !computedScore) {
    return (
      <div className="min-h-screen bg-surface flex flex-col p-6 max-w-2xl mx-auto justify-center">
        <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/30 shadow-sm text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-primary">Resilience Portal Link</h2>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            {error || 'Unable to load profile.'}
          </p>

          <div className="pt-4 border-t border-outline-variant/20 text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 block">
              Explore Demo Borrower Portals:
            </span>
            <div className="grid grid-cols-1 gap-2">
              {demoShortcuts.map((sc) => (
                <Link
                  key={sc.token}
                  to={`/borrower/${sc.token}`}
                  className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/20 flex items-center justify-between text-xs font-semibold text-primary transition-colors"
                >
                  <span>{sc.label}</span>
                  <span className="text-secondary">View Portal →</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/bank/dashboard"
              className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-secondary"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Bank Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col text-on-surface">
      {/* Synthetic Banner */}
      <SyntheticDataBanner />

      {/* Top Header */}
      <header className="bg-surface-container-lowest border-b border-outline-variant/30 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-base shadow-sm">
              OR
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-primary tracking-tight text-base">
                  OmniRisk
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                  Borrower Portal
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Climate Awareness & Advisory Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyShareLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary text-xs font-semibold border border-outline-variant/30 transition-colors"
              title="Copy private portal link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share Link</span>
                </>
              )}
            </button>

            <Link
              to="/bank/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bank Officer View</span>
            </Link>
          </div>
        </div>

        {/* Quick Demo Switcher Bar */}
        <div className="bg-surface-container-low/70 border-t border-outline-variant/20 px-4 sm:px-6 py-1.5 overflow-x-auto">
          <div className="max-w-6xl mx-auto flex items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-on-surface-variant shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-secondary" /> Switch Demo:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {demoShortcuts.map((sc) => (
                <Link
                  key={sc.token}
                  to={`/borrower/${sc.token}`}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    token === sc.token
                      ? 'bg-primary text-white font-bold shadow-xs'
                      : 'bg-surface-container-lowest text-on-surface-variant hover:text-primary border border-outline-variant/20'
                  }`}
                >
                  {sc.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Profile Card Header */}
        <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant uppercase tracking-wider">
                {borrower.sector}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" /> Verified Borrower
              </span>
              {borrower.demo_tag && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                  {borrower.demo_tag}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight">
              {borrower.business_name}
            </h1>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1 font-medium">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                Proprietor: <strong className="text-primary">{borrower.borrower_name}</strong>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-secondary" />
                {borrower.district}, {borrower.state} ({borrower.latitude.toFixed(3)}°N, {borrower.longitude.toFixed(3)}°E)
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <Calendar className="w-3.5 h-3.5" />
                Synced: {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Quick Metrics Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-center">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                Irrigation
              </span>
              <span className="text-xs font-bold text-primary">
                {borrower.irrigation_access}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-center">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                Soil Profile
              </span>
              <span className="text-xs font-bold text-primary">
                {borrower.soil_type}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant block">
                Insurance Cover
              </span>
              <span className={`text-xs font-bold ${
                borrower.insurance_status === 'Active Crop Insurance' || borrower.insurance_status === 'Asset Insured'
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}>
                {borrower.insurance_status}
              </span>
            </div>
          </div>
        </div>

        {/* Hero Section: Gauge & Executive Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Radial Score Gauge */}
          <div className="lg:col-span-5">
            <ScoreGauge 
              score={computedScore.totalScore} 
              label={computedScore.advisoryLabel} 
            />
          </div>

          {/* Executive Overview & Non-Lending Mandate Card */}
          <div className="lg:col-span-7 bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-secondary" />
              <h2 className="text-lg font-bold text-primary">Executive Resilience Summary</h2>
            </div>

            <p className="text-sm text-on-surface-variant leading-relaxed">
              Your overall resilience score is{' '}
              <strong className="text-primary font-bold">{computedScore.totalScore} out of 100</strong>, placing this enterprise in the{' '}
              <strong className="text-primary font-bold">"{computedScore.advisoryLabel}"</strong> category.
            </p>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 space-y-2 text-xs text-on-surface-variant leading-relaxed">
              <div className="font-bold text-primary text-sm flex items-center gap-2">
                <Droplets className="w-4 h-4 text-secondary" /> How OmniRisk Scores Work:
              </div>
              <p>
                Unlike conventional credit scores that solely analyze historical balance sheets, OmniRisk evaluates real-world environmental exposure:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li><strong>30% Location Hazard:</strong> World Bank historical flood, drought, and heatwave indices for {borrower.district}.</li>
                <li><strong>25% Farm Infrastructure:</strong> Irrigation type ({borrower.irrigation_access}), soil permeability ({borrower.soil_type}), and power backup.</li>
                <li><strong>25% Live Forecast:</strong> 7-day meteorological outlook from Open-Meteo.</li>
                <li><strong>20% Financial Cushion:</strong> Credit track record and insurance liquidity.</li>
              </ul>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-primary">Primary Protective Factor:</span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-semibold">
                {computedScore.topProtectiveFactors[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Component 1: Factor Breakdown ("Why is my score what it is?") */}
        <section>
          <FactorBreakdown
            topRiskFactors={computedScore.topRiskFactors}
            topProtectiveFactors={computedScore.topProtectiveFactors}
            subscores={{
              hazardSubscore: computedScore.hazardSubscore,
              vulnerabilitySubscore: computedScore.vulnerabilitySubscore,
              forecastSubscore: computedScore.forecastSubscore,
              financialSubscore: computedScore.financialSubscore,
              satelliteBonus: computedScore.satelliteBonus,
            }}
          />
        </section>

        {/* Component 2: Live Weather Forecast for Farm Coordinates */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-primary">Local 7-Day Weather Forecast</h2>
              <p className="text-xs text-on-surface-variant">
                Live meteorological sync for {borrower.district} ({borrower.latitude.toFixed(2)}°N, {borrower.longitude.toFixed(2)}°E)
              </p>
            </div>
          </div>
          <WeatherForecastWidget
            weather={weather}
            loading={refreshingWeather}
            onRefresh={() => loadBorrowerData(true)}
          />
        </section>

        {/* Component 3: Independent Insurance & Protection Advice */}
        <section>
          <InsuranceAdvice
            borrower={borrower}
            hazard={hazard}
            weather={weather}
            insuranceSuggestion={computedScore.insuranceSuggestion}
          />
        </section>

        {/* Component 4: FAQ Accordion */}
        <section className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-outline-variant/30 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-bold text-primary">Frequently Asked Questions</h2>
          </div>

          <div className="divide-y divide-outline-variant/20">
            {faqItems.map((item, idx) => (
              <div key={idx} className="py-4">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between text-left text-sm font-bold text-primary hover:text-secondary transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-on-surface-variant transition-transform duration-200 ${
                      openFaq === idx ? 'rotate-180 text-secondary' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="mt-2.5 text-xs text-on-surface-variant leading-relaxed pl-1 pr-6 animate-fadeIn">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-low border-t border-outline-variant/30 py-8 px-4 sm:px-6 mt-12 text-center text-xs text-on-surface-variant space-y-2">
        <p className="font-semibold text-primary">
          OmniRisk Climate Advisory & Awareness Platform
        </p>
        <p className="max-w-2xl mx-auto leading-relaxed text-[11px]">
          Data sources: Open-Meteo REST API, World Bank Climate Change Knowledge Portal (CCKP), and Global Flood Exposure benchmarks. 
          This tool is provided for educational and risk awareness purposes only.
        </p>
        <p className="text-[10px] text-slate-500">
          © 2026 OmniRisk. Strictly non-lending advisory.
        </p>
      </footer>
    </div>
  )
}
