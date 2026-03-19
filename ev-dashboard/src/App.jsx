import { useState, useEffect } from 'react'

// Battery components
import StatCards from './components/battery/StatCards'
import FaultDistribution from './components/battery/FaultDistribution'
import TimeSeriesChart from './components/battery/TimeSeriesChart'
import SOCComparison from './components/battery/SOCComparison'
import ModelInfo from './components/battery/ModelInfo'
import DataTable from './components/battery/DataTable'
import FeatureImportance from './components/battery/FeatureImportance'
import ConfusionMatrix from './components/battery/ConfusionMatrix'
import LivePredictor from './components/battery/LivePredictor'

// Motor components
import MotorStatCards from './components/motor/StatCards'
import MotorFaultDistribution from './components/motor/FaultDistribution'
import MotorTimeSeriesChart from './components/motor/TimeSeriesChart'
import MotorFeatureImportance from './components/motor/FeatureImportance'
import MotorConfusionMatrix from './components/motor/ConfusionMatrix'
import MotorModelInfo from './components/motor/ModelInfo'
import MotorDataTable from './components/motor/DataTable'
import MotorLivePredictor from './components/motor/LivePredictor'

import {
  IconActivity, IconDatabase, IconCpu, IconShieldAlert,
  IconEVCar, IconMotor, IconMenu, IconX
} from './components/Icons'

const NAV = [
  { id: 'overview',  label: 'Overview',       icon: IconActivity },
  { id: 'models',    label: 'ML Models',      icon: IconCpu },
  { id: 'predictor', label: 'Live Predictor', icon: IconShieldAlert },
  { id: 'data',      label: 'Data Explorer',  icon: IconDatabase },
]

const BATTERY_STATUS_COLOR = { Normal: '#10b981', Warning: '#f59e0b', Fault: '#ef4444' }
const MOTOR_CLASS_COLOR = {
  Healthy: '#10b981', Elec_Damage: '#ef4444', Mech_Damage: '#f59e0b', Mech_Elec_Damage: '#8b5cf6',
}

const API = import.meta.env.VITE_API_URL || ''

function SystemToggle({ system, onChange }) {
  const isBattery = system === 'battery'
  return (
    <div className="relative flex items-center bg-slate-800/80 border border-slate-700/50 rounded-2xl p-1 gap-0.5">
      {/* sliding pill */}
      <div
        className="absolute top-1 bottom-1 rounded-xl transition-all duration-300 ease-in-out"
        style={{
          width: 'calc(50% - 4px)',
          left: isBattery ? '4px' : 'calc(50%)',
          background: isBattery
            ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)'
            : 'linear-gradient(135deg,#6d28d9,#8b5cf6)',
          boxShadow: isBattery ? '0 2px 8px #3b82f630' : '0 2px 8px #8b5cf630',
        }}
      />
      <button onClick={() => onChange('battery')}
        className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors duration-200 flex-1 justify-center ${
          isBattery ? 'text-white' : 'text-slate-500 hover:text-slate-300'
        }`}>
        <IconEVCar className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Battery</span>
      </button>
      <button onClick={() => onChange('motor')}
        className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors duration-200 flex-1 justify-center ${
          !isBattery ? 'text-white' : 'text-slate-500 hover:text-slate-300'
        }`}>
        <IconMotor className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Motor</span>
      </button>
    </div>
  )
}

export default function App() {
  const [system, setSystem] = useState('battery')

  // Battery state
  const [battData, setBattData] = useState([])
  const [battMeta, setBattMeta] = useState(null)
  const [battFilter, setBattFilter] = useState('All')
  const [battTab, setBattTab] = useState('overview')
  const [dbOnline, setDbOnline] = useState(false)

  // Motor state
  const [motorData, setMotorData] = useState([])
  const [motorMeta, setMotorMeta] = useState(null)
  const [motorFilter, setMotorFilter] = useState('All')
  const [motorTab, setMotorTab] = useState('overview')

  // Shared UI state
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)

  // Load battery data
  useEffect(() => {
    const loadBattery = async () => {
      try {
        const health = await fetch(`${API}/api/health`).then(r => r.json())
        if (health.status === 'ok') {
          setDbOnline(true)
          await fetch(`${API}/api/telemetry/seed`, { method: 'POST' })
          const { rows } = await fetch(`${API}/api/telemetry?limit=500`).then(r => r.json())
          setBattData(rows.map(r => ({
            'Time (ms)': r.time_ms, 'Voltage (V)': parseFloat(r.voltage),
            'Current (A)': parseFloat(r.current), 'Temperature (°C)': parseFloat(r.temperature),
            'Motor Speed (RPM)': r.motor_speed_rpm, 'Hall Code': r.hall_code,
            'Estimated SOC (%)': parseFloat(r.estimated_soc), 'Ground Truth SOC (%)': parseFloat(r.ground_truth_soc),
            'Residual (%)': parseFloat(r.residual), 'SOC_Error': parseFloat(r.soc_error),
            'Fault Label': r.fault_label, 'rf_pred': r.rf_pred, 'xgb_pred': r.xgb_pred,
            'rf_prob_fault': parseFloat(r.rf_prob_fault), 'rf_prob_normal': parseFloat(r.rf_prob_normal),
            'rf_prob_warning': parseFloat(r.rf_prob_warning), 'xgb_prob_fault': parseFloat(r.xgb_prob_fault),
            'xgb_prob_normal': parseFloat(r.xgb_prob_normal), 'xgb_prob_warning': parseFloat(r.xgb_prob_warning),
          })))
          return
        }
      } catch (_) {}
      fetch('/ev_data_sample.json').then(r => r.json()).then(setBattData)
    }
    loadBattery()
    fetch('/model_meta.json').then(r => r.json()).then(setBattMeta)
  }, [])

  // Load motor data
  useEffect(() => {
    fetch('/motor_data_sample.json').then(r => r.json()).then(setMotorData)
    fetch('/motor_meta.json').then(r => r.json()).then(setMotorMeta)
  }, [])

  // Responsive sidebar
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setSidebarOpen(mq.matches)
    const handler = e => setSidebarOpen(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const isBattery = system === 'battery'
  const accentColor = isBattery ? '#3b82f6' : '#8b5cf6'
  const tab = isBattery ? battTab : motorTab
  const setTab = isBattery ? setBattTab : setMotorTab
  const filter = isBattery ? battFilter : motorFilter
  const setFilter = isBattery ? setBattFilter : setMotorFilter

  // Battery derived
  const battFiltered = battFilter === 'All' ? battData : battData.filter(d => d['Fault Label'] === battFilter)
  const faultCount = battData.filter(d => d['Fault Label'] === 'Fault').length
  const battStatus = faultCount > 10 ? 'Fault' : faultCount > 0 ? 'Warning' : 'Normal'

  // Motor derived
  const motorClasses = motorMeta?.labelEncoder?.classes || []
  const motorFiltered = motorFilter === 'All' ? motorData : motorData.filter(d => d.Class === motorFilter)
  const motorCounts = {}
  motorData.forEach(d => { motorCounts[d.Class] = (motorCounts[d.Class] || 0) + 1 })
  const motorFaultCount = motorData.length - (motorCounts['Healthy'] || 0)
  const motorStatus = motorFaultCount === 0 ? 'Healthy' : motorFaultCount < motorData.length * 0.2 ? 'Warning' : 'Fault'

  const navTo = id => { setTab(id); setMobileOpen(false) }

  const battFilters = ['All', 'Normal', 'Warning', 'Fault']
  const motorFilters = ['All', ...motorClasses]
  const filters = isBattery ? battFilters : motorFilters

  const switchSystem = (s) => {
    setSystem(s)
    setMobileOpen(false)
  }

  return (
    <div className="flex h-screen bg-[#080c18] text-slate-100 overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative z-40 lg:z-auto h-full flex flex-col
        bg-[#0b0f1e] border-r border-slate-800/60
        transition-all duration-300 ease-in-out flex-shrink-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${sidebarOpen ? 'w-60' : 'w-16'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800/60 min-h-[64px]">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg transition-all duration-300"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, boxShadow: `0 4px 12px ${accentColor}30` }}>
            {isBattery
              ? <IconEVCar className="w-4 h-4 text-white" />
              : <IconMotor className="w-4 h-4 text-white" />
            }
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-white whitespace-nowrap">
                {isBattery ? 'BatteryIQ' : 'MotorIQ'}
              </div>
              <div className="text-[10px] text-slate-500 whitespace-nowrap">Fault Detection Suite</div>
            </div>
          )}
        </div>

        {/* System switcher in sidebar — collapsed icon only */}
        {!sidebarOpen && (
          <div className="flex flex-col gap-1 px-2 py-3 border-b border-slate-800/60">
            {[
              { id: 'battery', Icon: IconEVCar, color: '#3b82f6' },
              { id: 'motor',   Icon: IconMotor,  color: '#8b5cf6' },
            ].map(({ id, Icon, color }) => (
              <button key={id} onClick={() => switchSystem(id)} title={id === 'battery' ? 'Battery System' : 'Motor System'}
                className="w-full flex items-center justify-center p-2 rounded-xl transition-all"
                style={system === id ? { backgroundColor: color + '18' } : {}}>
                <Icon className="w-4 h-4" style={{ color: system === id ? color : '#475569' }} />
              </button>
            ))}
          </div>
        )}

        {sidebarOpen && (
          <div className="px-3 py-3 border-b border-slate-800/60">
            <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-2 font-medium px-1">System</div>
            <SystemToggle system={system} onChange={switchSystem} />
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => navTo(id)}
              title={!sidebarOpen ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                tab === id ? 'text-white border shadow-sm' : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              }`}
              style={tab === id ? {
                backgroundColor: accentColor + '15',
                color: accentColor,
                borderColor: accentColor + '25',
              } : {}}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium truncate">{label}</span>}
              {sidebarOpen && tab === id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
              )}
            </button>
          ))}
        </nav>

        {/* Status */}
        {sidebarOpen && (
          <div className="px-4 py-4 border-t border-slate-800/60">
            <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-2 font-medium">System Status</div>
            {isBattery ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ backgroundColor: BATTERY_STATUS_COLOR[battStatus] }} />
                    <span className="relative inline-flex rounded-full h-2 w-2"
                      style={{ backgroundColor: BATTERY_STATUS_COLOR[battStatus] }} />
                  </span>
                  <span className="text-xs font-semibold" style={{ color: BATTERY_STATUS_COLOR[battStatus] }}>{battStatus}</span>
                </div>
                <div className="text-[10px] text-slate-600">{faultCount} fault events detected</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${dbOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <span className="text-[10px] text-slate-600">{dbOnline ? 'MySQL connected' : 'Static JSON mode'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ backgroundColor: MOTOR_CLASS_COLOR[motorStatus] || '#f59e0b' }} />
                    <span className="relative inline-flex rounded-full h-2 w-2"
                      style={{ backgroundColor: MOTOR_CLASS_COLOR[motorStatus] || '#f59e0b' }} />
                  </span>
                  <span className="text-xs font-semibold" style={{ color: MOTOR_CLASS_COLOR[motorStatus] || '#f59e0b' }}>{motorStatus}</span>
                </div>
                <div className="text-[10px] text-slate-600">{motorFaultCount} fault events detected</div>
              </>
            )}
          </div>
        )}

        {/* Collapse */}
        <button onClick={() => setSidebarOpen(o => !o)}
          className="hidden lg:flex items-center justify-center py-3 border-t border-slate-800/60 text-slate-600 hover:text-slate-300 transition-colors">
          <svg className={`w-4 h-4 transition-transform duration-200 ${sidebarOpen ? '' : 'rotate-180'}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 md:px-6 py-3.5 bg-[#0b0f1e] border-b border-slate-800/60 flex-shrink-0 min-h-[64px]">
          <button onClick={() => setMobileOpen(o => !o)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            {mobileOpen ? <IconX className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-sm md:text-base font-semibold text-white truncate">
              {NAV.find(n => n.id === tab)?.label}
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              {isBattery
                ? `EV Battery Fault Diagnosis · ${battData.length.toLocaleString()} records`
                : `Motor Fault Diagnosis · ${motorData.length.toLocaleString()} records · ${motorClasses.length} classes`
              }
            </p>
          </div>

          {/* System toggle */}
          <SystemToggle system={system} onChange={switchSystem} />

          {/* Filters */}
          <div className="flex items-center gap-1 bg-slate-800/80 rounded-xl px-1.5 py-1.5 overflow-x-auto max-w-[180px] sm:max-w-none">
            {filters.map(f => {
              const isActive = filter === f
              const color = isBattery
                ? f === 'Fault' ? '#ef4444' : f === 'Warning' ? '#f59e0b' : f === 'Normal' ? '#10b981' : null
                : MOTOR_CLASS_COLOR[f]
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    isActive && !color ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40' : !isActive ? 'text-slate-500 hover:text-slate-200' : ''
                  }`}
                  style={isActive && color ? { backgroundColor: color + '20', color, boxShadow: `0 0 0 1px ${color}40` } : {}}>
                  {f.replace(/_/g, ' ')}
                </button>
              )
            })}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {isBattery ? (
            <>
              {battTab === 'overview' && (
                <>
                  <StatCards data={battData} />
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <div className="xl:col-span-2"><TimeSeriesChart data={battFiltered} /></div>
                    <FaultDistribution data={battData} />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <SOCComparison data={battFiltered} />
                    {battMeta && <FeatureImportance meta={battMeta} />}
                  </div>
                </>
              )}
              {battTab === 'models' && battMeta && (
                <div className="space-y-4">
                  <ModelInfo meta={battMeta} />
                  <ConfusionMatrix meta={battMeta} />
                </div>
              )}
              {battTab === 'predictor' && battMeta && <LivePredictor meta={battMeta} sampleData={battData} />}
              {battTab === 'data' && <DataTable data={battFiltered} />}
            </>
          ) : (
            <>
              {motorTab === 'overview' && (
                <>
                  <MotorStatCards data={motorData} />
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <div className="xl:col-span-2"><MotorTimeSeriesChart data={motorFiltered} /></div>
                    <MotorFaultDistribution data={motorData} />
                  </div>
                  {motorMeta && <MotorFeatureImportance meta={motorMeta} />}
                </>
              )}
              {motorTab === 'models' && motorMeta && (
                <div className="space-y-4">
                  <MotorModelInfo meta={motorMeta} />
                  <MotorConfusionMatrix meta={motorMeta} />
                </div>
              )}
              {motorTab === 'predictor' && motorMeta && <MotorLivePredictor meta={motorMeta} sampleData={motorData} />}
              {motorTab === 'data' && <MotorDataTable data={motorFiltered} />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
