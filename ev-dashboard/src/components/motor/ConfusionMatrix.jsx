import { useState } from 'react'
import { IconTarget } from '../Icons'

const MODEL_KEYS = [
  { key: 'randomForest', label: 'Random Forest', color: '#8b5cf6' },
  { key: 'xgboost',      label: 'XGBoost',       color: '#10b981' },
  { key: 'decisionTree', label: 'Decision Tree',  color: '#f59e0b' },
]
const CLASS_COLOR = {
  Healthy: '#10b981', Elec_Damage: '#ef4444', Mech_Damage: '#f59e0b', Mech_Elec_Damage: '#8b5cf6',
}

function MatrixCell({ value, rowTotal, isCorrect }) {
  const pct = rowTotal ? ((value / rowTotal) * 100).toFixed(1) : 0
  const intensity = rowTotal ? value / rowTotal : 0
  const bg = isCorrect
    ? `rgba(16,185,129,${0.08 + intensity * 0.5})`
    : value > 0 ? `rgba(239,68,68,${0.05 + intensity * 0.4})` : 'transparent'
  return (
    <td className="p-2 text-center">
      <div className="rounded-xl py-2.5 px-1 transition-all"
        style={{ backgroundColor: bg, border: `1px solid ${isCorrect ? '#10b98130' : value > 0 ? '#ef444430' : '#1e293b'}` }}>
        <div className={`text-base font-bold ${isCorrect ? 'text-emerald-400' : value > 0 ? 'text-red-400' : 'text-slate-700'}`}>{value}</div>
        <div className="text-[10px] text-slate-600">{pct}%</div>
      </div>
    </td>
  )
}

export default function MotorConfusionMatrix({ meta }) {
  const [activeModel, setActiveModel] = useState('randomForest')
  const modelData = meta[activeModel]
  if (!modelData) return null

  const { confusion_matrix: cm, classes, accuracy, report } = modelData
  const total = cm.flat().reduce((a, b) => a + b, 0)
  const activeColor = MODEL_KEYS.find(m => m.key === activeModel)?.color || '#8b5cf6'

  return (
    <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: activeColor + '15' }}>
            <IconTarget className="w-4 h-4" style={{ color: activeColor }} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Confusion Matrix & Metrics</div>
            <div className="text-xs text-slate-500 mt-0.5">Real predictions from trained models</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-1.5">
            <span className="text-xs font-bold text-emerald-400">{(accuracy * 100).toFixed(1)}% Accuracy</span>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Matrix */}
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Predicted →</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="p-2 text-[10px] text-slate-600 text-left">Actual ↓</th>
                  {classes.map(c => (
                    <th key={c} className="p-2 text-[10px] font-semibold text-center whitespace-nowrap"
                      style={{ color: CLASS_COLOR[c] || '#94a3b8' }}>
                      {c.replace(/_/g, ' ').replace('Mech Elec', 'M+E')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cm.map((row, ri) => {
                  const rowTotal = row.reduce((a, b) => a + b, 0)
                  return (
                    <tr key={ri}>
                      <td className="p-2 text-[10px] font-semibold whitespace-nowrap pr-3"
                        style={{ color: CLASS_COLOR[classes[ri]] || '#94a3b8' }}>
                        {classes[ri].replace(/_/g, ' ').replace('Mech Elec', 'M+E')}
                      </td>
                      {row.map((val, ci) => (
                        <MatrixCell key={ci} value={val} rowTotal={rowTotal} isCorrect={ri === ci} />
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-4 mt-3 text-[10px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" />Correct
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />Misclassified
            </div>
            <span className="ml-auto">{total} samples</span>
          </div>
        </div>

        {/* Per-class metrics from report */}
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Per-Class Metrics</div>
          <div className="space-y-3">
            {classes.map(cls => {
              const r = report[cls]
              if (!r) return null
              const color = CLASS_COLOR[cls] || '#94a3b8'
              const support = r.support
              return (
                <div key={cls} className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs font-semibold text-white">{cls.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{support} samples</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[['Precision', r.precision], ['Recall', r.recall], ['F1', r.f1]].map(([k, v]) => (
                      <div key={k} className="text-center">
                        <div className="text-sm font-bold text-white">{(v * 100).toFixed(0)}%</div>
                        <div className="text-[10px] text-slate-500">{k}</div>
                        <div className="w-full h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${v * 100}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
