import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const MODEL_KEYS = [
  { key: 'randomForest', label: 'Random Forest', color: '#8b5cf6' },
  { key: 'xgboost',      label: 'XGBoost',       color: '#10b981' },
  { key: 'decisionTree', label: 'Decision Tree',  color: '#f59e0b' },
]

function shortName(name) {
  return name
    .replace('CURRENT (A) ', 'I_').replace('ROTO (RPM) ', 'RPM_')
    .replace('Frequency Center', 'FreqCtr').replace('Spectrum Area', 'SpecArea')
    .replace('peak_to_peak', 'p2p').replace('crest_factor', 'crest')
    .replace('Amp @ ', '@')
}

export default function MotorFeatureImportance({ meta }) {
  const [activeModel, setActiveModel] = useState('randomForest')
  const modelData = meta[activeModel]
  if (!modelData) return null

  const { features, importances } = modelData.feature_importances
  const chartData = features
    .map((f, i) => ({ name: shortName(f), full: f, value: importances[i] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15)
  const maxVal = chartData[0]?.value || 1

  return (
    <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-semibold text-white mb-0.5">Feature Importance</div>
          <div className="text-xs text-slate-500">Top 15 features · {features.length} total</div>
        </div>
        <div className="flex gap-1 bg-slate-800/80 rounded-xl p-1">
          {MODEL_KEYS.map(m => (
            <button key={m.key} onClick={() => setActiveModel(m.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                activeModel === m.key ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}>{m.label}</button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false}
            tickFormatter={v => v.toFixed(3)} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} width={60} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0b0f1e', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
            formatter={(v, _, p) => [v.toFixed(6), p.payload.full]} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, i) => {
              const intensity = entry.value / maxVal
              const color = MODEL_KEYS.find(m => m.key === activeModel)?.color || '#8b5cf6'
              return <Cell key={`cell-${i}`} fill={color} fillOpacity={0.3 + intensity * 0.7} />
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
