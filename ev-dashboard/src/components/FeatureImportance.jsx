import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { IconBarChart } from './Icons'

const SHORT = {
  'Voltage (V)': 'Voltage',
  'Current (A)': 'Current',
  'Temperature (°C)': 'Temp',
  'Motor Speed (RPM)': 'RPM',
  'Estimated SOC (%)': 'Est. SOC',
  'Ground Truth SOC (%)': 'GT SOC',
  'Residual (%)': 'Residual',
  'SOC_Error': 'SOC Error',
}

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-[#0b0f1e] border border-slate-700/60 rounded-xl px-3 py-2.5 shadow-2xl text-xs">
      <div className="text-slate-400 mb-1">{d.payload.feature}</div>
      <div className="text-white font-bold">{(d.value * 100).toFixed(2)}%</div>
      <div className="text-slate-500 text-[10px] mt-0.5">importance score</div>
    </div>
  )
}

export default function FeatureImportance({ meta }) {
  const [model, setModel] = useState('rf')
  const src = model === 'rf' ? meta.randomForest : meta.xgboost
  const features = meta.scaler.features

  const chartData = features.map((f, i) => ({
    feature: f,
    short: SHORT[f] || f,
    importance: src.feature_importances[i],
  })).sort((a, b) => b.importance - a.importance)

  return (
    <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <IconBarChart className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Feature Importance</div>
            <div className="text-xs text-slate-500 mt-0.5">Real values from trained models</div>
          </div>
        </div>
        <div className="flex bg-slate-800/60 rounded-xl p-1 gap-0.5">
          {[['rf','Random Forest'],['xgb','XGBoost']].map(([v,l]) => (
            <button key={v} onClick={() => setModel(v)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                model === v ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, left: 60, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2035" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: '#3d4f6b' }} tickLine={false} axisLine={false}
            tickFormatter={v => `${(v*100).toFixed(0)}%`} />
          <YAxis type="category" dataKey="short" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={58} />
          <Tooltip content={<Tip />} cursor={{ fill: '#1a2035' }} />
          <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
            {chartData.map((d, i) => (
              <Cell key={`cell-${d.short}`} fill={`hsl(${220 + i * 20}, 70%, ${55 - i * 3}%)`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Top feature callout */}
      <div className="mt-3 p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Top Predictor</div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">{chartData[0]?.feature}</span>
          <span className="text-sm font-bold text-violet-400">{((chartData[0]?.importance || 0) * 100).toFixed(1)}%</span>
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          {model === 'rf'
            ? 'Residual (%) dominates RF — SOC estimation error is the primary fault signal'
            : 'XGBoost relies almost entirely on Residual (%) — near-perfect separation'}
        </div>
      </div>
    </div>
  )
}
