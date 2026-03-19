import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const CLASS_COLOR = {
  Healthy: '#10b981',
  Elec_Damage: '#ef4444',
  Mech_Damage: '#f59e0b',
  Mech_Elec_Damage: '#8b5cf6',
}

// Pick the most informative features to plot
const SIGNAL_OPTIONS = [
  { key: 'CURRENT (A) mean',      label: 'Current Mean (A)',      color: '#3b82f6' },
  { key: 'CURRENT (A) rms',       label: 'Current RMS (A)',       color: '#8b5cf6' },
  { key: 'CURRENT (A) max',       label: 'Current Max (A)',       color: '#f97316' },
  { key: 'ROTO (RPM) mean',       label: 'RPM Mean',              color: '#10b981' },
  { key: 'ROTO (RPM) rms',        label: 'RPM RMS',               color: '#06b6d4' },
  { key: 'CURRENT (A) crest_factor', label: 'Crest Factor',       color: '#f59e0b' },
]

export default function TimeSeriesChart({ data }) {
  const [sig1, setSig1] = useState(SIGNAL_OPTIONS[0].key)
  const [sig2, setSig2] = useState(SIGNAL_OPTIONS[3].key)

  if (!data.length) return null

  const chartData = data.map((row, i) => ({
    idx: i + 1,
    [sig1]: parseFloat(row[sig1]) || 0,
    [sig2]: parseFloat(row[sig2]) || 0,
    class: row.Class,
  }))

  const s1 = SIGNAL_OPTIONS.find(s => s.key === sig1)
  const s2 = SIGNAL_OPTIONS.find(s => s.key === sig2)

  return (
    <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-semibold text-white mb-0.5">Signal Time Series</div>
          <div className="text-xs text-slate-500">{data.length} records · select signals to compare</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={sig1} onChange={e => setSig1(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 outline-none">
            {SIGNAL_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select value={sig2} onChange={e => setSig2(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 outline-none">
            {SIGNAL_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="idx" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0b0f1e', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
            labelFormatter={v => `Record #${v}`}
            formatter={(val, name) => [val.toFixed(4), name]} />
          <Legend iconType="circle" iconSize={6}
            formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
          <Line type="monotone" dataKey={sig1} name={s1?.label} stroke={s1?.color}
            dot={false} strokeWidth={1.5} />
          <Line type="monotone" dataKey={sig2} name={s2?.label} stroke={s2?.color}
            dot={false} strokeWidth={1.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
