import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { IconBarChart } from '../Icons'

const MODEL_KEYS = [
  { key: 'randomForest', label: 'Random Forest', color: '#8b5cf6' },
  { key: 'xgboost',      label: 'XGBoost',       color: '#10b981' },
  { key: 'decisionTree', label: 'Decision Tree',  color: '#f59e0b' },
]

function shortName(name) {
  return name
    .replace('CURRENT (A) ', 'I_').replace('ROTO (RPM) ', 'RPM_')
    .replace('Frequency Center', 'FreqCtr').replace('Spectrum Area', 'SpecArea')
    .replace('peak_to_peak', 'p2p').replace('crest_factor', 'crest').replace('Amp @ ', '@')
}

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-[#0b0f1e] border border-slate-700/60 rounded-xl px-3 py-2.5 shadow-2xl text-xs">
      <div className="text-slate-400 mb-1">{d.payload.full}</div>
      <div className="text-white font-bold">{(d.value * 100).toFixed(3)}%</div>
      <div className="text-slate-500 text-[10px] mt-0.5">importance score</div>
    </div>
  )
}

export default function MotorFeatureImportance({ meta }) {
  const [activeModel, setActiveModel] = useState('randomForest')
  const modelData = meta[activeModel]
  if (!modelData) return null

  const { features, importances } = modelData.feature_importances
  const chartData = features
    .map((f, i) => ({ name: shortName(f), full: f, importance: importances[i] }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 15)

  const color = MODEL_KEYS.find(m => m.key === activeModel)?.color || '#8b5cf6'
  const maxVal = chartData[0]?.importance || 1

  return (
    <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '15' }}>
            <IconBarChart className="w-4 h-4" style={{ color }} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Feature Importance</div>
            <div className="text-xs text-slate-500 mt-0.5">Top 15 of {features.length} features · real values from pkl</div>
          </div>
        </div>
        <div className="flex bg-slate-800/60 rounded-xl p-1 gap-0.5">
          {MODEL_KEYS.map(m => (
            <button key={m.key} onClick={() => setActiveModel(m.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeModel === m.key ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}>{m.label}</button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, left: 60, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2035" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#3d4f6b' }} tickLine={false} axisLine={false}
            tickFormatter={v => `${(v*100).toFixed(1)}%`} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={58} />
          <Tooltip content={<Tip />} cursor={{ fill: '#1a2035' }} />
          <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={color} fillOpacity={0.3 + (entry.importance / maxVal) * 0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Top Predictor</div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white truncate pr-2">{chartData[0]?.full}</span>
          <span className="text-sm font-bold flex-shrink-0" style={{ color }}>{((chartData[0]?.importance || 0) * 100).toFixed(2)}%</span>
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          {chartData[0]?.full} accounts for {((chartData[0]?.importance || 0) * 100).toFixed(2)}% of {modelData.type} decisions
          {chartData[1] && ` · 2nd: ${shortName(chartData[1].full)} (${((chartData[1].importance) * 100).toFixed(2)}%)`}
        </div>
      </div>
    </div>
  )
}
