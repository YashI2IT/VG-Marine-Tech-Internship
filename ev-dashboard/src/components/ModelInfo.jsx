import { useState } from 'react'
import { IconGitBranch, IconLayers, IconTag, IconScale, IconCheckCircle, IconCpu, IconInfo } from './Icons'

const CLASS_COLOR = { Fault: '#ef4444', Normal: '#10b981', Warning: '#f59e0b' }

const SHORT = {
  'Voltage (V)': 'Voltage (V)',
  'Current (A)': 'Current (A)',
  'Temperature (°C)': 'Temperature (°C)',
  'Motor Speed (RPM)': 'Motor Speed (RPM)',
  'Estimated SOC (%)': 'Estimated SOC (%)',
  'Ground Truth SOC (%)': 'Ground Truth SOC (%)',
  'Residual (%)': 'Residual (%)',
  'SOC_Error': 'SOC Error (derived)',
}

export default function ModelInfo({ meta }) {
  const [selected, setSelected] = useState('rf')
  const m = selected === 'rf' ? meta.randomForest : meta.xgboost
  const features = meta.scaler.features

  const MODELS = [
    { id: 'rf',  label: 'Random Forest', icon: IconGitBranch, accent: '#10b981',
      desc: 'Bootstrap aggregation of 100 decision trees. Reduces variance via averaging. Robust to noise and outliers.',
      params: [
        { k: 'Algorithm',         v: 'RandomForestClassifier' },
        { k: 'N Estimators',      v: meta.randomForest.n_estimators },
        { k: 'Max Depth',         v: meta.randomForest.max_depth ?? 'Unlimited' },
        { k: 'Min Samples Split', v: meta.randomForest.min_samples_split },
        { k: 'Min Samples Leaf',  v: meta.randomForest.min_samples_leaf },
        { k: 'Input Features',    v: meta.randomForest.n_features },
        { k: 'Accuracy',          v: `${(meta.randomForest.accuracy * 100).toFixed(1)}%` },
      ]
    },
    { id: 'xgb', label: 'XGBoost', icon: IconLayers, accent: '#3b82f6',
      desc: 'Sequential gradient boosting with L1/L2 regularization. Optimized for structured tabular data with high predictive accuracy.',
      params: [
        { k: 'Algorithm',       v: 'XGBClassifier' },
        { k: 'N Estimators',    v: meta.xgboost.n_estimators },
        { k: 'Max Depth',       v: meta.xgboost.max_depth ?? 'Auto' },
        { k: 'Learning Rate',   v: meta.xgboost.learning_rate },
        { k: 'Subsample',       v: meta.xgboost.subsample ?? 'Default' },
        { k: 'Input Features',  v: meta.xgboost.n_features },
        { k: 'Accuracy',        v: `${(meta.xgboost.accuracy * 100).toFixed(1)}%` },
      ]
    },
  ]

  const cur = MODELS.find(x => x.id === selected)
  const Icon = cur.icon

  return (
    <div className="space-y-4">
      {/* Model tabs */}
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
              {selected === 'rf' ? 'random_forest_battery_model.pkl' : 'xgboost_battery_model.pkl'}
            </span>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overview */}
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
                <span className="text-xs font-bold text-emerald-400">{(m.accuracy*100).toFixed(1)}% Acc</span>
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed">{cur.desc}</p>

            {/* Hyperparams grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {cur.params.map(p => (
                <div key={p.k} className="bg-slate-800/50 rounded-xl px-3 py-2.5 border border-slate-700/30">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">{p.k}</div>
                  <div className="text-sm font-bold text-white mt-0.5 truncate">{String(p.v)}</div>
                </div>
              ))}
            </div>

            {/* Output classes */}
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Output Classes</div>
              <div className="flex flex-wrap gap-2">
                {['Fault','Normal','Warning'].map(c => (
                  <div key={c} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold"
                    style={{ borderColor: CLASS_COLOR[c]+'40', backgroundColor: CLASS_COLOR[c]+'10', color: CLASS_COLOR[c] }}>
                    <IconCheckCircle className="w-3 h-3" />
                    {c}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Input Features ({features.length})</div>
            <div className="space-y-1.5">
              {features.map((f, i) => {
                const imp = m.feature_importances[i]
                return (
                  <div key={f} className="flex items-center gap-2 bg-slate-800/40 rounded-xl px-3 py-2 border border-slate-700/20">
                    <span className="text-[10px] text-slate-600 w-4 font-mono flex-shrink-0">{i+1}</span>
                    <span className="text-xs text-slate-300 flex-1 truncate">{SHORT[f] || f}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className="w-10 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500"
                          style={{ width: `${(imp / Math.max(...m.feature_importances)) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-500 w-8 text-right">{(imp*100).toFixed(1)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Scaler details */}
      <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <IconScale className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">StandardScaler — scaler_battery_model.pkl</div>
            <div className="text-xs text-slate-500 mt-0.5">Zero-mean, unit-variance normalization applied before inference</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left py-2 px-3 text-[10px] text-slate-500 uppercase tracking-wider">Feature</th>
                <th className="text-right py-2 px-3 text-[10px] text-slate-500 uppercase tracking-wider">Mean (μ)</th>
                <th className="text-right py-2 px-3 text-[10px] text-slate-500 uppercase tracking-wider">Std (σ)</th>
                <th className="text-right py-2 px-3 text-[10px] text-slate-500 uppercase tracking-wider">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {meta.scaler.features.map((f, i) => (
                <tr key={f} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-2 px-3 text-slate-300 font-medium">{SHORT[f] || f}</td>
                  <td className="py-2 px-3 text-right text-slate-400 font-mono">{meta.scaler.mean[i]}</td>
                  <td className="py-2 px-3 text-right text-slate-400 font-mono">{meta.scaler.scale[i]}</td>
                  <td className="py-2 px-3 text-right text-slate-400 font-mono">{meta.scaler.var[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Label Encoder */}
      <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <IconTag className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">LabelEncoder — label_encoder_model.pkl</div>
            <div className="text-xs text-slate-500 mt-0.5">Maps string class labels to integer indices</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(meta.labelEncoder.mapping).map(([cls, idx]) => (
            <div key={cls} className="flex items-center gap-3 bg-slate-800/40 rounded-xl px-4 py-3 border border-slate-700/30">
              <span className="text-sm font-bold" style={{ color: CLASS_COLOR[cls] }}>{cls}</span>
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
            { label: 'Raw Sensors',    sub: '8 features',           color: '#64748b', icon: IconCpu },
            { arrow: true, id: 'a1' },
            { label: 'SOC Error',      sub: 'Est − GT SOC',         color: '#f59e0b', icon: IconInfo },
            { arrow: true, id: 'a2' },
            { label: 'StandardScaler', sub: 'Normalize',            color: '#f59e0b', icon: IconScale },
            { arrow: true, id: 'a3' },
            { label: 'LabelEncoder',   sub: 'Encode target',        color: '#8b5cf6', icon: IconTag },
            { arrow: true, id: 'a4' },
            { label: 'RF / XGBoost',   sub: '100 estimators',       color: '#3b82f6', icon: IconLayers },
            { arrow: true, id: 'a5' },
            { label: 'Fault Label',    sub: 'Normal/Warning/Fault', color: '#10b981', icon: IconCheckCircle },
          ].map((step) => {
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
