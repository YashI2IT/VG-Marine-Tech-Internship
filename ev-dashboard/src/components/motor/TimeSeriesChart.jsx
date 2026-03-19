import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const METRICS = [
  { key: 'CURRENT (A) mean',         color: '#8b5cf6', label: 'I Mean',   unit: 'A'   },
  { key: 'CURRENT (A) rms',          color: '#a78bfa', label: 'I RMS',    unit: 'A'   },
  { key: 'CURRENT (A) max',          color: '#f97316', label: 'I Max',    unit: 'A'   },
  { key: 'ROTO (RPM) mean',          color: '#10b981', label: 'RPM Mean', unit: 'rpm' },
  { key: 'ROTO (RPM) rms',           color: '#06b6d4', label: 'RPM RMS',  unit: 'rpm' },
  { key: 'CURRENT (A) crest_factor', color: '#f59e0b', label: 'Crest',    unit: ''    },
]

const CLASS_COLOR = {
  Healthy: '#10b981', Elec_Damage: '#ef4444', Mech_Damage: '#f59e0b', Mech_Elec_Damage: '#8b5cf6',
}

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0b0f1e] border border-slate-700/60 rounded-xl px-3 py-2.5 shadow-2xl min-w-[150px]">
      <div className="text-[10px] text-slate-500 mb-2">Record #{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 text-xs mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-400">{p.name}</span>
          </div>
          <span className="font-semibold text-white">{typeof p.value === 'number' ? p.value.toFixed(4) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function MotorTimeSeriesChart({ data }) {
  const [active, setActive] = useState(['CURRENT (A) mean', 'ROTO (RPM) mean'])
  const [zoom, setZoom] = useState('all')

  const toggle = key => setActive(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  )

  const allData = data.map((row, i) => ({
    idx: i + 1,
    ...Object.fromEntries(METRICS.map(m => [m.key, parseFloat(row[m.key]) || 0])),
    class: row.Class,
  }))

  const n = allData.length
  const t1 = Math.floor(n / 3), t2 = Math.floor((2 * n) / 3)
  const zoomMap = { all: allData, first: allData.slice(0, t1), mid: allData.slice(t1, t2), last: allData.slice(t2) }
  const zoomLabels = [['all','All'],['first',`1–${t1}`],['mid',`${t1}–${t2}`],['last',`${t2}+`]]
  const chartData = zoomMap[zoom] || allData

  if (!data.length) return null

  return (
    <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-semibold text-white">Signal Time Series</div>
          <div className="text-xs text-slate-500 mt-0.5">Motor telemetry · click legend to toggle</div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {METRICS.map(m => (
            <button key={m.key} onClick={() => toggle(m.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                active.includes(m.key) ? 'border-transparent' : 'border-slate-700/60 text-slate-600 bg-transparent'
              }`}
              style={active.includes(m.key) ? { backgroundColor: m.color+'15', color: m.color, borderColor: m.color+'35' } : {}}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active.includes(m.key) ? m.color : '#475569' }} />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 mb-3">
        {zoomLabels.map(([v, l]) => (
          <button key={v} onClick={() => setZoom(v)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              zoom === v ? 'bg-slate-700 text-white' : 'text-slate-600 hover:text-slate-300'
            }`}>{l}</button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
          <defs>
            {METRICS.map(m => (
              <linearGradient key={m.key} id={`mg-${m.label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={m.color} stopOpacity={0.18} />
                <stop offset="95%" stopColor={m.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2035" vertical={false} />
          <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#3d4f6b' }} tickLine={false} axisLine={false}
            label={{ value: 'Record #', position: 'insideBottomRight', offset: -4, fill: '#3d4f6b', fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10, fill: '#3d4f6b' }} tickLine={false} axisLine={false} />
          <Tooltip content={<Tip />} />
          {METRICS.filter(m => active.includes(m.key)).map(m => (
            <Area key={m.key} type="monotone" dataKey={m.key} stroke={m.color}
              fill={`url(#mg-${m.label})`} strokeWidth={1.5} dot={false} name={m.label} />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-3 mt-3">
        {Object.entries(CLASS_COLOR).map(([cls, color]) => (
          <div key={cls} className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            {cls.replace(/_/g, ' ')}
          </div>
        ))}
      </div>
    </div>
  )
}
