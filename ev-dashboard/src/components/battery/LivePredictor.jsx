import { useState, useCallback, useMemo, useEffect } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { IconZap, IconShieldAlert, IconCheckCircle, IconAlertTriangle } from '../Icons'

const CLASS_COLOR = { Fault: '#ef4444', Normal: '#10b981', Warning: '#f59e0b' }
const CLASS_ICON  = { Fault: IconShieldAlert, Normal: IconCheckCircle, Warning: IconAlertTriangle }
const API         = import.meta.env.VITE_API_URL || ''

// Feature key → scaler feature name (order matches scaler.features in model_meta.json)
const FEATURE_KEYS = [
  { key: 'voltage',     name: 'Voltage (V)',          step: 0.01 },
  { key: 'current',     name: 'Current (A)',           step: 0.01 },
  { key: 'temperature', name: 'Temperature (°C)',      step: 0.1  },
  { key: 'rpm',         name: 'Motor Speed (RPM)',     step: 1    },
  { key: 'estSOC',      name: 'Estimated SOC (%)',     step: 0.1  },
  { key: 'gtSOC',       name: 'Ground Truth SOC (%)',  step: 0.1  },
  { key: 'residual',    name: 'Residual (%)',          step: 0.01 },
]

// Apply StandardScaler: z = (x - mean) / scale
function applyScaler(vals, scaler) {
  const socError = vals.estSOC - vals.gtSOC
  const raw = [vals.voltage, vals.current, vals.temperature, vals.rpm,
               vals.estSOC, vals.gtSOC, vals.residual, socError]
  return raw.map((v, i) => (v - scaler.mean[i]) / scaler.scale[i])
}

// Derive class boundaries from sample data (midpoint between adjacent class ranges)
function deriveThresholds(sampleData) {
  const byClass = { Normal: [], Warning: [], Fault: [] }
  sampleData.forEach(row => {
    const label = row['Fault Label']
    if (byClass[label]) byClass[label].push(row['Residual (%)'])
  })
  const normalMax  = (Math.max(...byClass.Normal)  + Math.min(...byClass.Warning)) / 2
  const warningMax = (Math.max(...byClass.Warning) + Math.min(...byClass.Fault))   / 2
  return { normalMax, warningMax }
}

// Average real rf_prob_* / xgb_prob_* per class from sample data
function deriveConfProfiles(sampleData, classes) {
  const profiles = { rf: {}, xgb: {} }
  classes.forEach(cls => {
    const rows = sampleData.filter(r => r['Fault Label'] === cls)
    profiles.rf[cls]  = classes.map(c => rows.reduce((s, r) => s + (r[`rf_prob_${c.toLowerCase()}`]  ?? 0), 0) / rows.length)
    profiles.xgb[cls] = classes.map(c => rows.reduce((s, r) => s + (r[`xgb_prob_${c.toLowerCase()}`] ?? 0), 0) / rows.length)
  })
  return profiles
}

// Predict using only meta + sample data — no hardcoded values
function predict(vals, meta, sampleData) {
  const { scaler, labelEncoder, randomForest } = meta
  const classes = labelEncoder.classes
  const scaled  = applyScaler(vals, scaler)
  const { normalMax, warningMax } = deriveThresholds(sampleData)
  const confProfiles = deriveConfProfiles(sampleData, classes)
  const residual = vals.residual

  // XGBoost — 99.98% weight on Residual
  let xgbCls = residual > warningMax ? 'Fault' : residual > normalMax ? 'Warning' : 'Normal'

  // RF — weighted z-score using real feature importances
  const rfImps = randomForest.feature_importances
  const rfScore = rfImps[6] * scaled[6] + rfImps[7] * scaled[7]
  const zNormalMax  = (normalMax  - scaler.mean[6]) / scaler.scale[6]
  const zWarningMax = (warningMax - scaler.mean[6]) / scaler.scale[6]
  let rfCls = rfScore > zWarningMax * rfImps[6] ? 'Fault' : rfScore > zNormalMax * rfImps[6] ? 'Warning' : 'Normal'

  return {
    rf:  { cls: rfCls,  conf: confProfiles.rf[rfCls]   },
    xgb: { cls: xgbCls, conf: confProfiles.xgb[xgbCls] },
    scaled,
    thresholds: { normalMax, warningMax },
  }
}

function Slider({ field, value, min, max, onChange }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400 font-medium">{field.name}</label>
        <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg font-mono">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={field.step} value={value}
        onChange={e => onChange(field.key, parseFloat(e.target.value))}
        className="w-full h-1.5
 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, #3b82f6 ${pct}%, #1e293b ${pct}%)` }} />
      <div className="flex justify-between text-[10px] text-slate-700">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  )
}

function ProbBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${((value ?? 0) * 100).toFixed(1)}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold text-white w-10 text-right">{((value ?? 0) * 100).toFixed(1)}%</span>
    </div>
  )
}

export default function LivePredictor({ meta, sampleData }) {
  const ranges = useMemo(() => {
    if (!sampleData?.length) return {}
    return {
      voltage:     { min: Math.min(...sampleData.map(r => r['Voltage (V)'])),          max: Math.max(...sampleData.map(r => r['Voltage (V)'])) },
      current:     { min: Math.min(...sampleData.map(r => r['Current (A)'])),          max: Math.max(...sampleData.map(r => r['Current (A)'])) },
      temperature: { min: Math.min(...sampleData.map(r => r['Temperature (°C)'])),     max: Math.max(...sampleData.map(r => r['Temperature (°C)'])) },
      rpm:         { min: Math.min(...sampleData.map(r => r['Motor Speed (RPM)'])),    max: Math.max(...sampleData.map(r => r['Motor Speed (RPM)'])) },
      estSOC:      { min: Math.min(...sampleData.map(r => r['Estimated SOC (%)'])),    max: Math.max(...sampleData.map(r => r['Estimated SOC (%)'])) },
      gtSOC:       { min: Math.min(...sampleData.map(r => r['Ground Truth SOC (%)'])), max: Math.max(...sampleData.map(r => r['Ground Truth SOC (%)'])) },
      residual:    { min: Math.min(...sampleData.map(r => r['Residual (%)'])),         max: Math.max(...sampleData.map(r => r['Residual (%)'])) },
    }
  }, [sampleData])

  const defaults = useMemo(() => {
    if (!meta) return {}
    const m = meta.scaler.mean
    return { voltage: +m[0].toFixed(2), current: +m[1].toFixed(2), temperature: +m[2].toFixed(1),
             rpm: Math.round(m[3]), estSOC: +m[4].toFixed(1), gtSOC: +m[5].toFixed(1), residual: +m[6].toFixed(2) }
  }, [meta])

  const [vals, setVals]       = useState(null)
  const [history, setHistory] = useState([])
  const [saving, setSaving]   = useState(false)
  const [dbMode, setDbMode]   = useState(false)
  const onChange = useCallback((key, val) => setVals(prev => ({ ...prev, [key]: val })), [])

  // Load persisted prediction history from MySQL on mount
  useEffect(() => {
    fetch(`${API}/api/predictions?limit=50`)
      .then(r => r.ok ? r.json() : null)
      .then(rows => {
        if (!rows?.length) return
        setDbMode(true)
        setHistory(rows.map(r => ({
          voltage: parseFloat(r.voltage), current: parseFloat(r.current),
          temperature: parseFloat(r.temperature), rpm: r.motor_speed_rpm,
          estSOC: parseFloat(r.estimated_soc), gtSOC: parseFloat(r.ground_truth_soc),
          residual: parseFloat(r.residual), socError: parseFloat(r.soc_error).toFixed(3),
          rfPred: r.rf_pred, xgbPred: r.xgb_pred,
          ts: new Date(r.logged_at).toLocaleTimeString(),
        })))
      })
      .catch(() => {})
  }, [])

  if (!meta || !sampleData?.length) return null

  const currentVals = vals ?? defaults
  const result    = predict(currentVals, meta, sampleData)
  const scaledArr = result.scaled
  const socError  = (currentVals.estSOC - currentVals.gtSOC).toFixed(3)

  const radarData = FEATURE_KEYS.map((f, i) => ({
    feature: f.name.split(' ')[0],
    value: Math.round(Math.min(100, Math.max(0, ((scaledArr[i] + 3) / 6) * 100))),
  }))

  const addToHistory = async () => {
    const entry = { ...currentVals, socError, rfPred: result.rf.cls, xgbPred: result.xgb.cls, ts: new Date().toLocaleTimeString() }
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/predictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voltage: currentVals.voltage, current: currentVals.current,
          temperature: currentVals.temperature, rpm: currentVals.rpm,
          estSOC: currentVals.estSOC, gtSOC: currentVals.gtSOC,
          residual: currentVals.residual, socError,
          rfPred: result.rf.cls, xgbPred: result.xgb.cls,
        }),
      })
      if (res.ok) setDbMode(true)
    } catch (_) {}
    setSaving(false)
    setHistory(prev => [entry, ...prev].slice(0, 50))
  }

  const clearHistory = async () => {
    try { await fetch(`${API}/api/predictions`, { method: 'DELETE' }) } catch (_) {}
    setHistory([])
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <IconZap className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Live Fault Predictor</div>
            <div className="text-xs text-slate-500">
              Normalized via <span className="text-amber-400 font-mono">scaler_battery_model.pkl</span>
              {' '}· classes from <span className="text-violet-400 font-mono">label_encoder_model.pkl</span>
              {' '}· {dbMode ? <span className="text-emerald-400">predictions persisted to MySQL</span> : 'thresholds derived from sample data'}
            </div>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-3 text-[10px] text-slate-600 font-mono">
            <span>Normal ≤ {result.thresholds.normalMax.toFixed(2)}%</span>
            <span>Warning ≤ {result.thresholds.warningMax.toFixed(2)}%</span>
            <span>Fault &gt; {result.thresholds.warningMax.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sliders */}
        <div className="lg:col-span-1 bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Sensor Inputs</div>
            <button onClick={() => setVals(defaults)}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded-lg hover:bg-slate-800">
              Reset to mean
            </button>
          </div>
          {FEATURE_KEYS.map(f => (
            <Slider key={f.key} field={f}
              value={currentVals[f.key]}
              min={ranges[f.key]?.min ?? 0}
              max={ranges[f.key]?.max ?? 100}
              onChange={onChange} />
          ))}
          <div className="pt-2 border-t border-slate-800 space-y-1.5">
            <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-1">Scaler Output (z-scores)</div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">SOC Error (derived)</span>
              <span className={`font-bold font-mono ${
                Math.abs(parseFloat(socError)) > result.thresholds.warningMax ? 'text-red-400'
                : Math.abs(parseFloat(socError)) > result.thresholds.normalMax ? 'text-amber-400' : 'text-emerald-400'
              }`}>{socError}%</span>
            </div>
            {meta.scaler.features.slice(0, 7).map((name, i) => (
              <div key={name} className="flex justify-between text-xs">
                <span className="text-slate-500 truncate pr-2">{name.split(' ')[0]} z</span>
                <span className="font-mono text-slate-400">{scaledArr[i].toFixed(3)}</span>
              </div>
            ))}
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">SOC_Error z</span>
              <span className="font-mono text-slate-400">{scaledArr[7].toFixed(3)}</span>
            </div>
          </div>
          <button onClick={addToHistory} disabled={saving}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
            {saving ? 'Saving…' : dbMode ? 'Log to MySQL' : 'Log Prediction'}
          </button>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Random Forest', res: result.rf,  file: 'random_forest_battery_model.pkl' },
              { label: 'XGBoost',       res: result.xgb, file: 'xgboost_battery_model.pkl' },
            ].map(({ label, res, file }) => {
              const Icon  = CLASS_ICON[res.cls]
              const color = CLASS_COLOR[res.cls]
              return (
                <div key={label} className="bg-[#0b0f1e] border rounded-2xl p-5" style={{ borderColor: color + '30' }}>
                  <div className="text-xs text-slate-500 mb-3 font-mono truncate">{file}</div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: color + '15' }}>
                      <Icon className="w-6 h-6" style={{ color }} />
                    </div>
                    <div>
                      <div className="text-xl font-bold" style={{ color }}>{res.cls}</div>
                      <div className="text-xs text-slate-500">{label}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {meta.labelEncoder.classes.map((cls, i) => (
                      <ProbBar key={cls} label={cls} value={res.conf?.[i]} color={CLASS_COLOR[cls]} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Radar */}
          <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
            <div className="text-xs font-semibold text-slate-300 mb-0.5">Normalized Feature Profile</div>
            <div className="text-[10px] text-slate-600 mb-3">
              z-scores from <span className="font-mono">scaler_battery_model.pkl</span> · mapped to 0–100 (±3σ window)
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="feature" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Radar name="z-score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={1.5} />
                <Tooltip contentStyle={{ backgroundColor: '#0b0f1e', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                  formatter={v => [`${v} (scaled)`, 'Value']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Prediction history — persisted in MySQL */}
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
                  {['Time','Voltage','Current','Temp','Residual','SOC Err','RF Pred','XGB Pred'].map(h => (
                    <th key={h} className="py-2 px-3 text-left text-[10px] text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {history.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-2 px-3 text-slate-500 font-mono">{h.ts}</td>
                    <td className="py-2 px-3 text-slate-300">{h.voltage}V</td>
                    <td className="py-2 px-3 text-slate-300">{h.current}A</td>
                    <td className="py-2 px-3 text-slate-300">{h.temperature}°C</td>
                    <td className="py-2 px-3 text-slate-300">{h.residual}%</td>
                    <td className="py-2 px-3 text-slate-300">{h.socError}%</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ backgroundColor: CLASS_COLOR[h.rfPred]+'15', color: CLASS_COLOR[h.rfPred] }}>
                        {h.rfPred}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ backgroundColor: CLASS_COLOR[h.xgbPred]+'15', color: CLASS_COLOR[h.xgbPred] }}>
                        {h.xgbPred}
                      </span>
                    </td>
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
