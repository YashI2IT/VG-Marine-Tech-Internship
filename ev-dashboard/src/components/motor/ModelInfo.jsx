import { useState } from 'react'
import { IconInfo } from '../Icons'

const MODEL_KEYS = [
  { key: 'randomForest', label: 'Random Forest', color: '#8b5cf6' },
  { key: 'xgboost',      label: 'XGBoost',       color: '#10b981' },
  { key: 'decisionTree', label: 'Decision Tree',  color: '#f59e0b' },
]

function Param({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-white font-mono">{value ?? 'None'}</span>
    </div>
  )
}

export default function MotorModelInfo({ meta }) {
  const [active, setActive] = useState('randomForest')
  const m = meta[active]
  if (!m) return null

  const params = active === 'randomForest'
    ? [['Type', m.type], ['Estimators', m.n_estimators], ['Max Depth', m.max_depth ?? 'None'], ['Features', m.n_features]]
    : active === 'xgboost'
    ? [['Type', m.type], ['Estimators', m.n_estimators], ['Max Depth', m.max_depth ?? 'None'], ['Learning Rate', m.learning_rate], ['Features', m.n_features]]
    : [['Type', m.type], ['Max Depth', m.max_depth ?? 'None'], ['Features', m.n_features]]

  const { features } = m.feature_importances

  return (
    <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <IconInfo className="w-4 h-4 text-slate-500" />
          <div className="text-sm font-semibold text-white">Model Information</div>
        </div>
        <div className="flex gap-1 bg-slate-800/80 rounded-xl p-1">
          {MODEL_KEYS.map(mk => (
            <button key={mk.key} onClick={() => setActive(mk.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                active === mk.key ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}>{mk.label}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-3 font-medium">Hyperparameters</div>
          <div className="bg-slate-800/20 rounded-xl px-4 py-1">
            {params.map(([k, v]) => <Param key={k} label={k} value={String(v)} />)}
          </div>
          <div className="mt-4">
            <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-2 font-medium">Accuracy</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(m.accuracy * 100).toFixed(2)}%`, backgroundColor: MODEL_KEYS.find(mk => mk.key === active)?.color }} />
              </div>
              <span className="text-sm font-bold text-white">{(m.accuracy * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-3 font-medium">
            Training Features ({features.length})
          </div>
          <div className="bg-slate-800/20 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1">
            {features.map((f, i) => (
              <div key={f} className="flex items-center gap-2 text-xs">
                <span className="text-slate-700 font-mono w-5 text-right flex-shrink-0">{i + 1}</span>
                <span className="text-slate-400 truncate">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5">
        <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-3 font-medium">Target Classes</div>
        <div className="flex flex-wrap gap-2">
          {meta.labelEncoder.classes.map((cls, i) => (
            <div key={cls} className="flex items-center gap-2 bg-slate-800/40 rounded-xl px-3 py-1.5">
              <span className="text-[10px] text-slate-600 font-mono">{i}</span>
              <span className="text-xs text-slate-300">{cls}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
