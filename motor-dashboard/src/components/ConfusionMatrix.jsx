import { useState } from 'react'

const MODEL_KEYS = [
  { key: 'randomForest', label: 'Random Forest' },
  { key: 'xgboost',      label: 'XGBoost' },
  { key: 'decisionTree', label: 'Decision Tree' },
]

const CLASS_COLORS = {
  Healthy:          '#10b981',
  Elec_Damage:      '#ef4444',
  Mech_Damage:      '#f59e0b',
  Mech_Elec_Damage: '#8b5cf6',
}

const SHORT = {
  Healthy: 'Healthy',
  Elec_Damage: 'Elec',
  Mech_Damage: 'Mech',
  Mech_Elec_Damage: 'M+E',
}

export default function ConfusionMatrix({ meta }) {
  const [activeModel, setActiveModel] = useState('randomForest')

  const modelData = meta[activeModel]
  if (!modelData) return null

  const { confusion_matrix: cm, classes, accuracy, report } = modelData
  const total = cm.flat().reduce((a, b) => a + b, 0)
  const maxVal = Math.max(...cm.flat())

  return (
    <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <div className="text-sm font-semibold text-white mb-0.5">Confusion Matrix</div>
          <div className="text-xs text-slate-500">
            Accuracy: <span className="text-emerald-400 font-bold">{(accuracy * 100).toFixed(2)}%</span>
            {' '}· {total} samples
          </div>
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

      <div className="overflow-x-auto">
        <table className="mx-auto text-xs">
          <thead>
            <tr>
              <th className="w-16 text-[10px] text-slate-600 pb-2 pr-2 text-right">Actual ↓ Pred →</th>
              {classes.map(c => (
                <th key={c} className="w-16 pb-2 px-1 text-center">
                  <span className="text-[10px] font-semibold" style={{ color: CLASS_COLORS[c] || '#94a3b8' }}>
                    {SHORT[c] || c}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cm.map((row, ri) => {
              const rowTotal = row.reduce((a, b) => a + b, 0)
              return (
                <tr key={ri}>
                  <td className="pr-2 py-1 text-right">
                    <span className="text-[10px] font-semibold" style={{ color: CLASS_COLORS[classes[ri]] || '#94a3b8' }}>
                      {SHORT[classes[ri]] || classes[ri]}
                    </span>
                  </td>
                  {row.map((val, ci) => {
                    const isDiag = ri === ci
                    const intensity = maxVal > 0 ? val / maxVal : 0
                    const bg = isDiag
                      ? `rgba(16,185,129,${0.1 + intensity * 0.5})`
                      : val > 0 ? `rgba(239,68,68,${0.05 + intensity * 0.4})` : 'transparent'
                    return (
                      <td key={ci} className="px-1 py-1 text-center">
                        <div className="w-14 h-10 rounded-lg flex flex-col items-center justify-center mx-auto transition-all"
                          style={{ backgroundColor: bg }}>
                          <span className={`font-bold text-sm ${isDiag ? 'text-emerald-400' : val > 0 ? 'text-red-400' : 'text-slate-700'}`}>
                            {val}
                          </span>
                          <span className="text-[9px] text-slate-600">
                            {rowTotal > 0 ? ((val / rowTotal) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Per-class metrics */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {classes.map(cls => {
          const r = report[cls]
          if (!r) return null
          return (
            <div key={cls} className="bg-slate-800/30 rounded-xl p-3">
              <div className="text-[10px] font-semibold mb-2" style={{ color: CLASS_COLORS[cls] || '#94a3b8' }}>
                {SHORT[cls] || cls}
              </div>
              {[['Precision', r.precision], ['Recall', r.recall], ['F1', r.f1]].map(([k, v]) => (
                <div key={k} className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-bold text-white">{(v * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
