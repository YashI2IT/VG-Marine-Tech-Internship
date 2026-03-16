import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const METRICS = [
  { key: 'Voltage (V)',      color: '#818cf8', label: 'Voltage',     unit: 'V'  },
  { key: 'Current (A)',      color: '#38bdf8', label: 'Current',     unit: 'A'  },
  { key: 'Temperature (°C)', color: '#fb923c', label: 'Temperature', unit: '°C' },
  { key: 'Residual (%)',     color: '#f472b6', label: 'Residual',    unit: '%'  },
]

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0b0f1e] border border-slate-700/60 rounded-xl px-3 py-2.5 shadow-2xl min-w-[150px]">
      <div className="text-[10px] text-slate-500 mb-2">t = {label}s</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 text-xs mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-400">{p.name}</span>
          </div>
          <span className="font-semibold text-white">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function TimeSeriesChart({ data }) {
  const [active, setActive] = useState(['Voltage (V)', 'Temperature (°C)'])
  const [zoom, setZoom] = useState('all')

  const toggle = key => setActive(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  )

  const allData = data.map(d => ({
    t: (d['Time (ms)'] / 1000).toFixed(1),
    ...Object.fromEntries(METRICS.map(m => [m.key, d[m.key]])),
    fault: d['Fault Label'],
  }))

  // Dynamic zoom segments — split into thirds based on actual data length
  const n = allData.length
  const t1 = Math.floor(n / 3)
  const t2 = Math.floor((2 * n) / 3)
  const tLabel1 = allData[t1 - 1]?.t ?? t1
  const tLabel2 = allData[t2 - 1]?.t ?? t2

  const zoomMap = {
    all:   allData,
    first: allData.slice(0, t1),
    mid:   allData.slice(t1, t2),
    last:  allData.slice(t2),
  }
  const zoomLabels = [
    ['all',   'All'],
    ['first', `0–${tLabel1}s`],
    ['mid',   `${tLabel1}–${tLabel2}s`],
    ['last',  `${tLabel2}s+`],
  ]
  const chartData = zoomMap[zoom] || allData

  const faultIdxs = chartData.reduce((a, d) => { if (d.fault === 'Fault') a.push(d.t); return a }, [])

  return (
    <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-semibold text-white">Sensor Time Series</div>
          <div className="text-xs text-slate-500 mt-0.5">Battery telemetry over time · click legend to toggle</div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {METRICS.map(m => (
            <button key={m.key} onClick={() => toggle(m.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                active.includes(m.key) ? 'border-transparent' : 'border-slate-700/60 text-slate-600 bg-transparent'
              }`}
              style={active.includes(m.key) ? {
                backgroundColor: m.color + '15', color: m.color, borderColor: m.color + '35'
              } : {}}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active.includes(m.key) ? m.color : '#475569' }} />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="flex gap-1 mb-3">
        {zoomLabels.map(([v,l]) => (
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
              <linearGradient key={m.key} id={`g-${m.key.replace(/[^a-z]/gi,'')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={m.color} stopOpacity={0.18} />
                <stop offset="95%" stopColor={m.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2035" vertical={false} />
          <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#3d4f6b' }} tickLine={false} axisLine={false}
            label={{ value: 'Time (s)', position: 'insideBottomRight', offset: -4, fill: '#3d4f6b', fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10, fill: '#3d4f6b' }} tickLine={false} axisLine={false} />
          <Tooltip content={<Tip />} />
          {faultIdxs.slice(0, 5).map(t => (
            <ReferenceLine key={t} x={t} stroke="#ef444440" strokeWidth={1} strokeDasharray="3 3" />
          ))}
          {METRICS.filter(m => active.includes(m.key)).map(m => (
            <Area key={m.key} type="monotone" dataKey={m.key} stroke={m.color}
              fill={`url(#g-${m.key.replace(/[^a-z]/gi,'')})`}
              strokeWidth={1.5} dot={false} name={m.label} />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-1.5 mt-2">
        <div className="w-3 h-px border-t border-dashed border-red-500/50" />
        <span className="text-[10px] text-slate-600">Fault event markers</span>
      </div>
    </div>
  )
}
