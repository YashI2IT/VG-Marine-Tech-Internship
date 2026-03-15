import { useState } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts'

const P = { Normal: '#10b981', Warning: '#f59e0b', Fault: '#ef4444' }

const ScatterTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  const residual = Math.abs((d?.y || 0) - (d?.x || 0))
  return (
    <div className="bg-[#0b0f1e] border border-slate-700/60 rounded-xl px-3 py-2.5 shadow-2xl text-xs">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: P[d?.label] }} />
        <span className="font-semibold" style={{ color: P[d?.label] }}>{d?.label}</span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-6"><span className="text-slate-500">Ground Truth</span><span className="text-white font-semibold">{d?.x?.toFixed(2)}%</span></div>
        <div className="flex justify-between gap-6"><span className="text-slate-500">Estimated</span><span className="text-white font-semibold">{d?.y?.toFixed(2)}%</span></div>
        <div className="flex justify-between gap-6 pt-1 border-t border-slate-800">
          <span className="text-slate-500">|Error|</span>
          <span className="font-bold" style={{ color: residual > 2 ? '#ef4444' : residual > 1 ? '#f59e0b' : '#10b981' }}>{residual.toFixed(3)}%</span>
        </div>
      </div>
    </div>
  )
}

export default function SOCComparison({ data }) {
  const [view, setView] = useState('scatter')

  const byLabel = { Normal: [], Warning: [], Fault: [] }
  data.forEach(d => {
    const label = d['Fault Label']
    if (byLabel[label]) byLabel[label].push({ x: d['Ground Truth SOC (%)'], y: d['Estimated SOC (%)'], label })
  })

  // Residual histogram
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const lo = i * 0.5, hi = lo + 0.5
    const items = data.filter(d => d['Residual (%)'] >= lo && d['Residual (%)'] < hi)
    const dominant = ['Fault','Warning','Normal'].find(l => items.some(d => d['Fault Label'] === l)) || 'Normal'
    return { range: lo.toFixed(1), count: items.length, label: dominant }
  })

  const errors = data.map(d => Math.abs(d['Estimated SOC (%)'] - d['Ground Truth SOC (%)']))
  const mae    = errors.length ? (errors.reduce((a, b) => a + b, 0) / errors.length).toFixed(3) : '0.000'
  const rmse   = errors.length ? Math.sqrt(errors.reduce((a, b) => a + b * b, 0) / errors.length).toFixed(3) : '0.000'
  const maxErr = errors.length ? errors.reduce((a, b) => a > b ? a : b, 0).toFixed(2) : '0.00'

  return (
    <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-semibold text-white">State of Charge Analysis</div>
          <div className="text-xs text-slate-500 mt-0.5">Estimated vs Ground Truth SOC</div>
        </div>
        <div className="flex bg-slate-800/60 rounded-xl p-1 gap-0.5">
          {[['scatter','Scatter'],['residual','Residual Dist.']].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                view === v ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
              }`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Error stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[['MAE', mae, '%'], ['RMSE', rmse, '%'], ['Max Error', maxErr, '%']].map(([k,v,u]) => (
          <div key={k} className="bg-slate-800/40 rounded-xl px-3 py-2 text-center">
            <div className="text-xs font-bold text-white">{v}{u}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{k}</div>
          </div>
        ))}
      </div>

      {view === 'scatter' ? (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top: 4, right: 4, left: -22, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2035" />
              <XAxis dataKey="x" name="Ground Truth" unit="%" tick={{ fontSize: 10, fill: '#3d4f6b' }} tickLine={false} axisLine={false}
                label={{ value: 'Ground Truth SOC (%)', position: 'insideBottom', offset: -8, fill: '#3d4f6b', fontSize: 10 }} />
              <YAxis dataKey="y" name="Estimated" unit="%" tick={{ fontSize: 10, fill: '#3d4f6b' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ScatterTip />} cursor={{ strokeDasharray: '3 3', stroke: '#334155' }} />
              <ReferenceLine stroke="#2d3f5a" strokeDasharray="5 5" segment={[{x:81,y:81},{x:103,y:103}]} />
              {Object.entries(byLabel).map(([label, pts]) => (
                <Scatter key={label} name={label} data={pts} fill={P[label]} opacity={0.7} r={2.5} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            {Object.entries(P).map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </div>
            ))}
          </div>
        </>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={buckets} margin={{ top: 4, right: 4, left: -22, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2035" vertical={false} />
            <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#3d4f6b' }} tickLine={false} axisLine={false}
              label={{ value: 'Residual (%)', position: 'insideBottom', offset: -8, fill: '#3d4f6b', fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10, fill: '#3d4f6b' }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#0b0f1e', border: '1px solid #1e293b', borderRadius: 12, fontSize: 12 }} cursor={{ fill: '#1a2035' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Count">
              {buckets.map((b, i) => <Cell key={i} fill={P[b.label]} opacity={0.8} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
