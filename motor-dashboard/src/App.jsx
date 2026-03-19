import { useState, useEffect } from 'react'
import StatCards from './components/StatCards'
import FaultDistribution from './components/FaultDistribution'
import TimeSeriesChart from './components/TimeSeriesChart'
import FeatureImportance from './components/FeatureImportance'
import ConfusionMatrix from './components/ConfusionMatrix'
import ModelInfo from './components/ModelInfo'
import DataTable from './components/DataTable'
import LivePredictor from './components/LivePredictor'
import {
  IconActivity, IconDatabase, IconCpu, IconShieldAlert,
  IconMotor, IconMenu, IconX
} from './components/Icons'

const NAV = [
  { id: 'overview',  label: 'Overview',       icon: IconActivity },
  { id: 'models',    label: 'ML Models',      icon: IconCpu },
  { id: 'predictor', label: 'Live Predictor', icon: IconShieldAlert },
  { id: 'data',      label: 'Data Explorer',  icon: IconDatabase },
]

const CLASS_COLOR = {
  Healthy:          '#10b981',
  Elec_Damage:      '#ef4444',
  Mech_Damage:      '#f59e0b',
  Mech_Elec_Damage: '#8b5cf6',
}

const API = import.meta.env.VITE_API_URL || ''

export default function App() {
  const [data, setData]             = useState([])
  const [meta, setMeta]             = useState(null)
  const [filter, setFilter]         = useState('All')
  const [tab, setTab]               = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [dbOnline, setDbOnline]       = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const health = await fetch(`${API}/api/health`).then(r => r.json())
        if (health.status === 'ok') {
          setDbOnline(true)
          await fetch(`${API}/api/motor-telemetry/seed`, { method: 'POST' })
          const { rows } = await fetch(`${API}/api/motor-telemetry?limit=500`).then(r => r.json())
          if (rows?.length) { setData(rows); return }
        }
      } catch (_) {}
      fetch('/motor_data_sample.json').then(r => r.json()).then(setData)
    }
    loadData()
    fetch('/motor_meta.json').then(r => r.json()).then(setMeta)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setSidebarOpen(mq.matches)
    const handler = e => setSidebarOpen(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const classes = meta?.labelEncoder?.classes || []
  const filtered = filter === 'All' ? data : data.filter(d => d.Class === filter)

  const classCounts = {}
  data.forEach(d => { classCounts[d.Class] = (classCounts[d.Class] || 0) + 1 })
  const faultCount = data.length - (classCounts['Healthy'] || 0)

  const systemStatus = faultCount === 0 ? 'Healthy'
    : faultCount < data.length * 0.2 ? 'Warning' : 'Fault'

  const navTo = id => { setTab(id); setMobileOpen(false) }

  const FILTERS = ['All', ...classes]

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
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800/60 min-h-[64px]">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
            <IconMotor className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-white whitespace-nowrap">MotorIQ</div>
              <div className="text-[10px] text-slate-500 whitespace-nowrap">Fault Detection Suite</div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => navTo(id)}
              title={!sidebarOpen ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                tab === id
                  ? 'bg-violet-600/15 text-violet-400 border border-violet-500/25 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              }`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium truncate">{label}</span>}
              {sidebarOpen && tab === id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="px-4 py-4 border-t border-slate-800/60">
            <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-2 font-medium">System Status</div>
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: CLASS_COLOR[systemStatus] || '#f59e0b' }} />
                <span className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: CLASS_COLOR[systemStatus] || '#f59e0b' }} />
              </span>
              <span className="text-xs font-semibold" style={{ color: CLASS_COLOR[systemStatus] || '#f59e0b' }}>
                {systemStatus}
              </span>
            </div>
            <div className="text-[10px] text-slate-600">{faultCount} fault events detected</div>
            <div className="flex items-center gap-1.5 mt-2">
              <div className={`w-1.5 h-1.5 rounded-full ${dbOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span className="text-[10px] text-slate-600">{dbOnline ? 'MySQL connected' : 'Static JSON mode'}</span>
            </div>
          </div>
        )}

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
              Motor Fault Diagnosis · {data.length.toLocaleString()} records · {classes.length} classes
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 bg-slate-800/80 rounded-xl px-1.5 py-1.5 overflow-x-auto max-w-[220px] sm:max-w-none">
              {FILTERS.map(f => {
                const color = CLASS_COLOR[f]
                const isActive = filter === f
                return (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? color ? '' : 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40'
                        : 'text-slate-500 hover:text-slate-200'
                    }`}
                    style={isActive && color ? {
                      backgroundColor: color + '20', color,
                      boxShadow: `0 0 0 1px ${color}40`
                    } : {}}>
                    {f === 'All' ? 'All' : f.replace('_', ' ')}
                  </button>
                )
              })}
            </div>
            {faultCount > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-1.5">
                <IconShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs text-red-400 font-semibold">{faultCount}</span>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {tab === 'overview' && (
            <>
              <StatCards data={data} />
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2"><TimeSeriesChart data={filtered} /></div>
                <FaultDistribution data={data} />
              </div>
              {meta && <FeatureImportance meta={meta} />}
            </>
          )}
          {tab === 'models' && meta && (
            <div className="space-y-4">
              <ModelInfo meta={meta} />
              <ConfusionMatrix meta={meta} />
            </div>
          )}
          {tab === 'predictor' && meta && <LivePredictor meta={meta} sampleData={data} />}
          {tab === 'data' && <DataTable data={filtered} />}
        </main>
      </div>
    </div>
  )
}
