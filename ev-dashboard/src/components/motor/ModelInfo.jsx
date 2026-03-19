import { useState } from 'react'
import { IconGitBranch, IconLayers, IconCheckCircle, IconCpu, IconInfo } from '../Icons'

const CLASS_COLOR = {
  Healthy: '#10b981', Elec_Damage: '#ef4444', Mech_Damage: '#f59e0b', Mech_Elec_Damage: '#8b5cf6',
}

function shortName(name) {
  return name
    .replace('CURRENT (A) ', 'I_').replace('ROTO (RPM) ', 'RPM_')
    .replace('Frequency Center', 'FreqCtr').replace('Spectrum Area', 'SpecArea')
    .replace('peak_to_peak', 'p2p').replace('crest_factor', 'crest').replace('Amp @ ', '@')
}

export default function MotorModelInfo({ meta }) {
  const [selected, setSelected] = useState('randomForest')

  const MODELS = [
    { id: 'randomForest', label: 'Random Forest', icon: IconGitBranch, accent: '#8b5cf6',
      desc: 'Bootstrap aggregation of decision trees. Reduces variance via averaging. Trained on 26 statistical features extracted from current and RPM signals.',
      getParams: m => [
        { k: 'Algorithm',         v: m.type },
        { k: 'N Estimators',      v: m.n_estimators },
        { k: 'Max Depth',         v: m.max_depth ?? 'Unlimited' },
        { k: 'Input Features',    v: m.n_features },
        { k: 'Accuracy',          v: `${(m.accuracy * 100).toFixed(2)}%` },
      ]
    },
    { id: 'xgboost', label: 'XGBoost', icon: IconLayers, accent: '#10b981',
      desc: 'Sequential gradient boosting with L1/L2 regularization. Optimized for structured tabular data. Uses a subset of features selected by the booster.',
      getParams: m => [
        { k: 'Algorithm',     v: m.type },
        { k: 'N Estimators',  v: m.n_estimators },
        { k: 'Max Depth',     v: m.max_depth ?? 'Auto' },
        { k: 'Learning Rate', v: m.learning_rate },
        { k: 'Input Features',v: m.n_features },
        { k: 'Accuracy',      v: `${(m.accuracy * 100).toFixed(2)}%` },
      ]
    },
    { id: 'decisionTree', label: 'Decision Tree', icon: IconCpu, accent: '#f59e0b',
      desc: 'Single decision tree classifier. Interpretable splits on feature thresholds. Fast inference with direct feature-to-class mapping.',
      getParams: m => [
        { k: 'Algorithm',     v: m.type },
        { k: 'Max Depth',     v: m.max_depth ?? 'Unlimited' },
        { k: 'Input Features',v: m.n_features },
        { k: 'Accuracy',      v: `${(m.accuracy * 100).toFixed(2)}%` },
      ]
    },
  ]

  const cur = MODELS.find(x => x.id === selected)
  const m = meta[selected]
  const Icon = cur.icon
  const features = m.feature_importances.features
  const importances = m.feature_importances.importances
  const maxImp = Math.max(...importances)

  return (
    <div className="space-y-4">
      <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl overflow-hidden">
        <div className="flex border-b border-slate-800/60">
          {MODELS.map(mod => {
            const TIcon = mod.icon
            return (
              <button key={mod.id} onClick={() => setSelected(mod.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium transition-all border-b-2 ${
                  selected === mod.id ? 'border-current bg-slate-800/30' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
                style={selected === mod.id ? { borderColor: mod.accent, color: mod.accent } : {}}>
                <TIcon className="w-4 h-4" />
                {mod.label}
              </button>
            )
          })}
          <div className="flex-1 flex items-center justify-end px-4">
            <span className="text-[10px] text-slate-700 font-mono hidden sm:block">
              {selected === 'randomForest' ? 'random_forest.pkl' : selected === 'xgboost' ? 'xgboost.pkl' : 'decision-tree.pkl'}
            </span>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: cur.accent + '18' }}>
                <Icon className="w-5 h-5" style={{ color: cur.accent }} />
              </div>
              <div>
                <div className="text-base font-bold text-white">{cur.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{m.type}</div>
              </div>
              <div className="ml-auto bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-1.5">
                <span className="text-xs font-bold text-emerald-400">{(m.accuracy * 100).toFixed(2)}% Acc</span>
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed">{cur.desc}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {cur.getParams(m).map(p => (
                <div key={p.k} className="bg-slate-800/50 rounded-xl px-3 py-2.5 border border-slate-700/30">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{p.k}</div>
                  <div className="text-sm font-bold text-white mt-0.5 truncate">{String(p.v)}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Output Classes</div>
              <div className="flex flex-wrap gap-2">
                {meta.labelEncoder.classes.map(c => (
                  <div key={c} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold"
                    style={{ borderColor: (CLASS_COLOR[c]||'#64748b')+'40', backgroundColor: (CLASS_COLOR[c]||'#64748b')+'10', color: CLASS_COLOR[c]||'#64748b' }}>
                    <IconCheckCircle className="w-3 h-3" />
                    {c.replace(/_/g, ' ')}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Input Features ({features.length})</div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {features.map((f, i) => (
                <div key={f} className="flex items-center gap-2 bg-slate-800/40 rounded-xl px-3 py-2 border border-slate-700/20">
                  <span className="text-[10px] text-slate-600 w-4 font-mono flex-shrink-0">{i+1}</span>
                  <span className="text-xs text-slate-300 flex-1 truncate">{shortName(f)}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="w-10 h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(importances[i] / maxImp) * 100}%`, backgroundColor: cur.accent }} />
                    </div>
                    <span className="text-[10px] text-slate-500 w-8 text-right">{(importances[i]*100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Label Encoder */}
      <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <IconInfo className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">LabelEncoder — label-encoder.pkl</div>
            <div className="text-xs text-slate-500 mt-0.5">Maps string class labels to integer indices</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(meta.labelEncoder.mapping).map(([cls, idx]) => (
            <div key={cls} className="flex items-center gap-3 bg-slate-800/40 rounded-xl px-4 py-3 border border-slate-700/30">
              <span className="text-sm font-bold" style={{ color: CLASS_COLOR[cls] || '#94a3b8' }}>{cls.replace(/_/g, ' ')}</span>
              <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className="text-sm font-bold text-white font-mono">{idx}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline */}
      <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-4 font-medium">Inference Pipeline</div>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: 'Raw Signals',    sub: 'Current + RPM',        color: '#64748b', icon: IconCpu },
            { arrow: true, id: 'a1' },
            { label: 'Stat Features',  sub: '26 features',          color: '#f59e0b', icon: IconInfo },
            { arrow: true, id: 'a2' },
            { label: 'LabelEncoder',   sub: 'Encode target',        color: '#8b5cf6', icon: IconInfo },
            { arrow: true, id: 'a3' },
            { label: 'RF / XGB / DT',  sub: '3 models',             color: '#10b981', icon: IconLayers },
            { arrow: true, id: 'a4' },
            { label: 'Fault Class',    sub: '4 classes',            color: '#10b981', icon: IconCheckCircle },
          ].map(step => {
            if (step.arrow) return (
              <svg key={step.id} className="w-4 h-4 text-slate-700 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )
            const SIcon = step.icon
            return (
              <div key={step.label} className="flex items-center gap-2 bg-slate-800/40 rounded-xl px-3 py-2 border border-slate-700/30">
                <SIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: step.color }} />
                <div>
                  <div className="text-xs font-semibold text-white">{step.label}</div>
                  <div className="text-[10px] text-slate-500">{step.sub}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
