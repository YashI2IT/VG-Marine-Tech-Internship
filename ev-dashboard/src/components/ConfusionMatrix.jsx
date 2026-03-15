import { useState } from 'react'
import { IconTarget } from './Icons'

const CLASS_LABELS = ['Fault', 'Normal', 'Warning']
const CLASS_COLOR  = { Fault: '#ef4444', Normal: '#10b981', Warning: '#f59e0b' }

function MatrixCell({ value, total, isCorrect, rowLabel }) {
  const pct = total ? ((value / total) * 100).toFixed(1) : 0
  const intensity = total ? value / total : 0
  const bg = isCorrect
    ? `rgba(16,185,129,${0.08 + intensity * 0.5})`
    : value > 0 ? `rgba(239,68,68,${0.05 + intensity * 0.4})` : 'transparent'
  return (
    <td className="p-2 text-center">
      <div className="rounded-xl py-2.5 px-1 transition-all"
        style={{ backgroundColor: bg, border: `1px solid ${isCorrect ? '#10b98130' : value > 0 ? '#ef444430' : '#1e293b'}` }}>
        <div className={`text-base font-bold ${isCorrect ? 'text-emerald-400' : value > 0 ? 'text-red-400' : 'text-slate-700'}`}>
          {value}
        </div>
        <div className="text-[10px] text-slate-600">{pct}%</div>
      </div>
    </td>
  )
}

export default function ConfusionMatrix({ meta }) {
  const [model, setModel] = useState('rf')
  const src = model === 'rf' ? meta.randomForest : meta.xgboost
  const cm = src.confusion_matrix
  const total = cm.flat().reduce((a, b) => a + b, 0)

  const metrics = CLASS_LABELS.map((cls, i) => {
    const tp = cm[i][i]
    const fp = cm.reduce((sum, row, ri) => ri !== i ? sum + row[i] : sum, 0)
    const fn = cm[i].reduce((sum, v, ci) => ci !== i ? sum + v : sum, 0)
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0
    const recall    = tp + fn > 0 ? tp / (tp + fn) : 0
    const f1        = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0
    return { cls, precision, recall, f1, support: cm[i].reduce((s, v) => s + v, 0) }
  })

  return (
    <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <IconTarget className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Confusion Matrix & Metrics</div>
            <div className="text-xs text-slate-500 mt-0.5">Real predictions from trained models</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-1.5">
            <span className="text-xs font-bold text-emerald-400">
              {(src.accuracy * 100).toFixed(1)}% Accuracy
            </span>
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
                  {CLASS_LABELS.map(l => (
                    <th key={l} className="p-2 text-[10px] font-semibold text-center whitespace-nowrap"
                      style={{ color: CLASS_COLOR[l] }}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CLASS_LABELS.map((rowLabel, ri) => (
                  <tr key={rowLabel}>
                    <td className="p-2 text-[10px] font-semibold whitespace-nowrap pr-3"
                      style={{ color: CLASS_COLOR[rowLabel] }}>{rowLabel}</td>
                    {CLASS_LABELS.map((colLabel, ci) => (
                      <MatrixCell key={colLabel} value={cm[ri][ci]}
                        total={cm[ri].reduce((a,b)=>a+b,0)}
                        isCorrect={ri === ci} rowLabel={rowLabel} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-4 mt-3 text-[10px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
              Correct prediction
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
              Misclassification
            </div>
          </div>
        </div>

        {/* Per-class metrics */}
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">Per-Class Metrics</div>
          <div className="space-y-3">
            {metrics.map(m => (
              <div key={m.cls} className="bg-slate-800/30 rounded-xl p-3 border border-slate-700/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CLASS_COLOR[m.cls] }} />
                    <span className="text-xs font-semibold text-white">{m.cls}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{m.support} samples</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[['Precision', m.precision],['Recall', m.recall],['F1', m.f1]].map(([k,v]) => (
                    <div key={k} className="text-center">
                      <div className="text-sm font-bold text-white">{(v*100).toFixed(0)}%</div>
                      <div className="text-[10px] text-slate-500">{k}</div>
                      <div className="w-full h-1 bg-slate-700 rounded-full mt-1 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${v*100}%`, backgroundColor: CLASS_COLOR[m.cls] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
