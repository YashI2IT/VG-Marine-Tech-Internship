import { useState, useCallback, useMemo, useEffect } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { IconZap, IconShieldAlert, IconCheckCircle, IconAlertTriangle, IconLayers } from './Icons'

const CLASS_COLOR = {
  Healthy:          '#10b981',
  Elec_Damage:      '#ef4444',
  Mech_Damage:      '#f59e0b',
  Mech_Elec_Damage: '#8b5cf6',
}
const CLASS_ICON = {
  Healthy:          IconCheckCircle,
  Elec_Damage:      IconShieldAlert,
  Mech_Damage:      IconAlertTriangle,
  Mech_Elec_Damage: IconLayers,
}

const API = import.meta.env.VITE_API_URL || ''

// The 5 XGB features and 26 RF/DT features — sliders cover the union
// We show sliders for the most important features (top from RF)
const SLIDER_FEATURES = [
  { key: 'CURRENT (A) mean',            label: 'Current Mean (A)',       step: 0.001 },
  { key: 'CURRENT (A) rms',             label: 'Current RMS (A)',        step: 0.001 },
  { key: 'CURRENT (A) max',             label: 'Current Max (A)',        step: 0.001 },
  { key: 'CURRENT (A) std',             label: 'Current Std (A)',        step: 0.001 },
  { key: 'CURRENT (A) peak_to_peak',    label: 'Current Peak-to-Peak',   step: 0.001 },
  { key: 'CURRENT (A) crest_factor',    label: 'Crest Factor',           step: 0.001 },
  { key: 'CURRENT (A) skew',            label: 'Current Skew',           step: 0.001 },
  { key: 'CURRENT (A) kurtosis',        label: 'Current Kurtosis',       step: 0.01  },
  { key: 'ROTO (RPM) mean',             label: 'RPM Mean',               step: 0.1   },
  { key: 'ROTO (RPM) rms',              label: 'RPM RMS',                step: 0.1   },
  { key: 'ROTO (RPM) max',              label: 'RPM Max',                step: 0.1   },
  { key: 'ROTO (RPM) std',              label: 'RPM Std',                step: 0.1   },
  { key: 'ROTO (RPM) peak_to_peak',     label: 'RPM Peak-to-Peak',       step: 0.1   },
  { key: 'ROTO (RPM) skew',             label: 'RPM Skew',               step: 0.001 },
  { key: 'ROTO (RPM) kurtosis',         label: 'RPM Kurtosis',           step: 0.01  },
  { key: 'ROTO (RPM) crest_factor',     label: 'RPM Crest Factor',       step: 0.001 },
  { key: 'CURRENT (A) Frequency Center',label: 'I Freq Center',          step: 0.01  },
  { key: 'CURRENT (A) Spectrum Area',   label: 'I Spectrum Area',        step: 0.01  },
  { key: 'CURRENT (A) Amp @ 1x RPM',   label: 'I Amp @1x RPM',          step: 0.001 },
  { key: 'CURRENT (A) Amp @ 2x RPM',   label: 'I Amp @2x RPM',          step: 0.001 },
  { key: 'CURRENT (A) Amp @ 3x RPM',   label: 'I Amp @3x RPM',          step: 0.001 },
  { key: 'ROTO (RPM) Frequency Center', label: 'RPM Freq Center',        step: 0.01  },
  { key: 'ROTO (RPM) Spectrum Area',    label: 'RPM Spectrum Area',      step: 0.01  },
  { key: 'ROTO (RPM) Amp @ 1x RPM',    label: 'RPM Amp @1x RPM',        step: 0.001 },
  { key: 'ROTO (RPM) Amp @ 2x RPM',    label: 'RPM Amp @2x RPM',        step: 0.001 },
  { key: 'ROTO (RPM) Amp @ 3x RPM',    label: 'RPM Amp @3x RPM',        step: 0.001 },
]

// Derive per-class average probabilities from sample data
function deriveConfProfiles(sampleData, classes) {
  const profiles = { rf: {}, xgb: {}, dt: {} }
  classes.forEach(cls => {
    const rows = sampleData.filter(r => r.Class === cls)
    if (!rows.length) return
    profiles.rf[cls]  = classes.map(c => rows.reduce((s, r) => s + (r[`rf_prob_${c.toLowerCase()}`]  ?? 0), 0) / rows.length)
    profiles.xgb[cls] = classes.map(c => rows.reduce((s, r) => s + (r[`xgb_prob_${c.toLowerCase()}`] ?? 0), 0) / rows.length)
    profiles.dt[cls]  = classes.map(c => rows.reduce((s, r) => s + (r[`dt_prob_${c.toLowerCase()}`]  ?? 0), 0) / rows.length)
  })
  return profiles
}

// Simple nearest-neighbor prediction: find closest sample by Euclidean distance on shared features
function predictNN(vals, sampleData, rfFeatures, xgbFeatures, dtFeatures, classes) {
  // For each model, find the nearest sample using that model's features
  function nearest(feats) {
    let bestDist = Infinity, bestRow = sampleData[0]
    for (const row of sampleData) {
      let dist = 0
      for (const f of feats) {
        const v = vals[f] ?? 0
        const rv = parseFloat(row[f]) || 0
        dist += (v - rv) ** 2
      }
      if (dist < bestDist) { bestDist = dist; bestRow = row }
    }
    return bestRow
  }

  const rfRow  = nearest(rfFeatures)
  const xgbRow = nearest(xgbFeatures)
  const dtRow  = nearest(dtFeatures)

  const getProbs = (row, prefix) =>
    classes.map(c => parseFloat(row[`${prefix}_prob_${c.toLowerCase()}`]) || 0)

  return {
    rf:  { cls: rfRow.rf_pred,   conf: getProbs(rfRow,  'rf')  },
    xgb: { cls: xgbRow.xgb_pred, conf: getProbs(xgbRow, 'xgb') },
    dt:  { cls: dtRow.dt_pred,   conf: getProbs(dtRow,  'dt')  },
  }
}

function Slider({ field, value, min, max, onChange }) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400 font-medium truncate pr-2">{field.label}</label>
        <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg font-mono flex-shrink-0">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={field.step} value={value}
        onChange={e => onChange(field.key, parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #3b82f6 ${pct}%, #1e293b ${pct}%)` }} />
    </div>
  )
}

function ProbBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 w-20 flex-shrink-0 truncate">{label?.replace('_', ' ')}</span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${((value ?? 0) * 100).toFixed(1)}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold text-white w-10 text-right">{((value ?? 0) * 100).toFixed(1)}%</span>
    </div>
  )
}

export default function LivePredictor({ meta, sampleData }) {
  const classes = meta.labelEncoder.classes
  const rfFeatures  = meta.randomForest.feature_importances.features
  const xgbFeatures = meta.xgboost.feature_importances.features
  const dtFeatures  = meta.decisionTree.feature_importances.features

  // Compute ranges from sample data
  const ranges = useMemo(() => {
    if (!sampleData?.length) return {}
    const r = {}
    SLIDER_FEATURES.forEach(f => {
      const vals = sampleData.map(d => parseFloat(d[f.key]) || 0)
      r[f.key] = { min: Math.min(...vals), max: Math.max(...vals) }
    })
    return r
  }, [sampleData])

  // Defaults = mean of each feature from sample data
  const defaults = useMemo(() => {
    if (!sampleData?.length) return {}
    const d = {}
    SLIDER_FEATURES.forEach(f => {
      const vals = sampleData.map(row => parseFloat(row[f.key]) || 0)
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length
      d[f.key] = parseFloat(mean.toFixed(4))
    })
    return d
  }, [sampleData])

  const [vals, setVals]       = useState(null)
  const [history, setHistory] = useState([])
  const [saving, setSaving]   = useState(false)
  const [dbMode, setDbMode]   = useState(false)
  const [page, setPage]       = useState(1) // slider pagination: 13 per page

  const onChange = useCallback((key, val) => setVals(prev => ({ ...(prev ?? defaults), [key]: val })), [defaults])

  useEffect(() => {
    fetch(`${API}/api/motor-predictions?limit=50`)
      .then(r => r.ok ? r.json() : null)
      .then(rows => {
        if (!rows?.length) return
        setDbMode(true)
        setHistory(rows.map(r => ({
          ...r,
          rfPred: r.rf_pred, xgbPred: r.xgb_pred, dtPred: r.dt_pred,
          ts: new Date(r.logged_at).toLocaleTimeString(),
        })))
      })
      .catch(() => {})
  }, [])

  if (!sampleData?.length || !Object.keys(defaults).length) return null

  const currentVals = vals ?? defaults
  const result = predictNN(currentVals, sampleData, rfFeatures, xgbFeatures, dtFeatures, classes)

  // Radar: top 8 RF features normalized 0-100
  const radarFeatures = rfFeatures.slice(0, 8)
  const radarData = radarFeatures.map(f => {
    const r = ranges[f] || { min: 0, max: 1 }
    const v = currentVals[f] ?? 0
    const norm = r.max > r.min ? ((v - r.min) / (r.max - r.min)) * 100 : 50
    return { feature: f.replace('CURRENT (A) ', 'I_').replace('ROTO (RPM) ', 'RPM_').split(' ')[0], value: Math.round(norm) }
  })

  const SLIDERS_PER_PAGE = 13
  const totalSliderPages = Math.ceil(SLIDER_FEATURES.length / SLIDERS_PER_PAGE)
  const visibleSliders = SLIDER_FEATURES.slice((page - 1) * SLIDERS_PER_PAGE, page * SLIDERS_PER_PAGE)

  const addToHistory = async () => {
    const entry = {
      ...currentVals,
      rfPred: result.rf.cls, xgbPred: result.xgb.cls, dtPred: result.dt.cls,
      ts: new Date().toLocaleTimeString(),
    }
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/motor-predictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: currentVals,
          rfPred: result.rf.cls, xgbPred: result.xgb.cls, dtPred: result.dt.cls,
        }),
      })
      if (res.ok) setDbMode(true)
    } catch (_) {}
    setSaving(false)
    setHistory(prev => [entry, ...prev].slice(0, 50))
  }

  const clearHistory = async () => {
    try { await fetch(`${API}/api/motor-predictions`, { method: 'DELETE' }) } catch (_) {}
    setHistory([])
  }

  const models = [
    { label: 'Random Forest', res: result.rf,  file: 'random_forest.pkl' },
    { label: 'XGBoost',       res: result.xgb, file: 'xgboost.pkl' },
    { label: 'Decision Tree', res: result.dt,  file: 'decision-tree.pkl' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <IconZap className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Live Motor Fault Predictor</div>
            <div className="text-xs text-slate-500">
              Nearest-neighbor prediction · {sampleData.length} reference samples
              {dbMode && <span className="text-emerald-400 ml-2">· predictions persisted to MySQL</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sliders */}
        <div className="lg:col-span-1 bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Feature Inputs ({SLIDER_FEATURES.length} total)
            </div>
            <button onClick={() => setVals(defaults)}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded-lg hover:bg-slate-800">
              Reset
            </button>
          </div>

          {/* Slider pagination */}
          <div className="flex items-center gap-1 text-[10px] text-slate-600">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2 py-0.5 rounded hover:bg-slate-800 disabled:opacity-30">‹</button>
            <span>Page {page}/{totalSliderPages}</span>
            <button onClick={() => setPage(p => Math.min(totalSliderPages, p + 1))} disabled={page === totalSliderPages}
              className="px-2 py-0.5 rounded hover:bg-slate-800 disabled:opacity-30">›</button>
          </div>

          <div className="space-y-3">
            {visibleSliders.map(f => (
              <Slider key={f.key} field={f}
                value={currentVals[f.key] ?? defaults[f.key] ?? 0}
                min={ranges[f.key]?.min ?? 0}
                max={ranges[f.key]?.max ?? 1}
                onChange={onChange} />
            ))}
          </div>

          <button onClick={addToHistory} disabled={saving}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors mt-2">
            {saving ? 'Saving…' : dbMode ? 'Log to MySQL' : 'Log Prediction'}
          </button>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {models.map(({ label, res, file }) => {
              const Icon  = CLASS_ICON[res.cls] || IconShieldAlert
              const color = CLASS_COLOR[res.cls] || '#64748b'
              return (
                <div key={label} className="bg-[#0b0f1e] border rounded-2xl p-4" style={{ borderColor: color + '30' }}>
                  <div className="text-[10px] text-slate-600 mb-2 font-mono truncate">{file}</div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: color + '15' }}>
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div>
                      <div className="text-base font-bold leading-tight" style={{ color }}>
                        {res.cls?.replace('_', ' ')}
                      </div>
                      <div className="text-[10px] text-slate-500">{label}</div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {classes.map((cls, i) => (
                      <ProbBar key={cls} label={cls} value={res.conf?.[i]} color={CLASS_COLOR[cls] || '#64748b'} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Radar */}
          <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
            <div className="text-xs font-semibold text-slate-300 mb-0.5">Normalized Feature Profile</div>
            <div className="text-[10px] text-slate-600 mb-3">Top 8 RF features · mapped to 0–100 (min-max from data)</div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="feature" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Radar name="value" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={1.5} />
                <Tooltip contentStyle={{ backgroundColor: '#0b0f1e', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                  formatter={v => [`${v}%`, 'Normalized']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Prediction Log</div>
              {dbMode && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">MySQL</span>}
            </div>
            <button onClick={clearHistory} className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">Clear</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Time', 'I Mean', 'RPM Mean', 'RF Pred', 'XGB Pred', 'DT Pred'].map(h => (
                    <th key={h} className="py-2 px-3 text-left text-[10px] text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {history.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-2 px-3 text-slate-500 font-mono">{h.ts}</td>
                    <td className="py-2 px-3 text-slate-300 font-mono">{parseFloat(h['CURRENT (A) mean'] ?? 0).toFixed(4)}</td>
                    <td className="py-2 px-3 text-slate-300 font-mono">{parseFloat(h['ROTO (RPM) mean'] ?? 0).toFixed(2)}</td>
                    {['rfPred', 'xgbPred', 'dtPred'].map(k => (
                      <td key={k} className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ backgroundColor: (CLASS_COLOR[h[k]] || '#64748b') + '18', color: CLASS_COLOR[h[k]] || '#64748b' }}>
                          {h[k]?.replace('_', ' ')}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
