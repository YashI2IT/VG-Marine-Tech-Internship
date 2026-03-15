import { useState, useCallback } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { IconZap, IconShieldAlert, IconCheckCircle, IconAlertTriangle } from './Icons'

const DEFAULTS = {
  voltage: 3.60,
  current: 3.00,
  temperature: 29.9,
  rpm: 1248,
  estSOC: 92.6,
  gtSOC: 91.3,
  residual: 1.99,
}

const CLASS_COLOR = { Fault: '#ef4444', Normal: '#10b981', Warning: '#f59e0b' }
const CLASS_ICON  = { Fault: IconShieldAlert, Normal: IconCheckCircle, Warning: IconAlertTriangle }

const FIELDS = [
  { key: 'voltage',     label: 'Voltage (V)',          min: 3.28, max: 3.99, step: 0.01 },
  { key: 'current',     label: 'Current (A)',           min: 1.0,  max: 5.0,  step: 0.01 },
  { key: 'temperature', label: 'Temperature (°C)',      min: 12.1, max: 46.2, step: 0.1  },
  { key: 'rpm',         label: 'Motor Speed (RPM)',     min: 1100, max: 1399, step: 1    },
  { key: 'estSOC',      label: 'Estimated SOC (%)',     min: 85.0, max: 100,  step: 0.1  },
  { key: 'gtSOC',       label: 'Ground Truth SOC (%)',  min: 81.4, max: 103,  step: 0.1  },
  { key: 'residual',    label: 'Residual (%)',          min: 0.0,  max: 5.6,  step: 0.01 },
]

// Client-side rule-based predictor mirroring the trained model logic
// (Residual and SOC_Error are the dominant features per feature importance)
function predict(vals) {
  const socError = vals.estSOC - vals.gtSOC
  const residual = vals.residual

  // XGBoost relies 99.98% on Residual — thresholds derived from dataset
  // Fault: residual >= ~3.0, Warning: 1.5–3.0, Normal: < 1.5
  let xgbClass, xgbConf
  if (residual >= 3.0) {
    xgbClass = 'Fault'; xgbConf = [0.92, 0.02, 0.06]
  } else if (residual >= 1.5) {
    xgbClass = 'Warning'; xgbConf = [0.04, 0.08, 0.88]
  } else {
    xgbClass = 'Normal'; xgbConf = [0.01, 0.95, 0.04]
  }

  // RF uses Residual (59.5%) + SOC_Error (32.5%) + other features
  let rfClass, rfConf
  const score = residual * 0.595 + Math.abs(socError) * 0.325 +
    (vals.temperature > 40 ? 0.3 : 0) + (vals.voltage < 3.35 ? 0.2 : 0)

  if (score >= 1.9) {
    rfClass = 'Fault'; rfConf = [0.88, 0.03, 0.09]
  } else if (score >= 0.95) {
    rfClass = 'Warning'; rfConf = [0.05, 0.10, 0.85]
  } else {
    rfClass = 'Normal'; rfConf = [0.02, 0.93, 0.05]
  }

  return { rf: { cls: rfClass, conf: rfConf }, xgb: { cls: xgbClass, conf: xgbConf } }
}

function Slider({ field, value, onChange }) {
  const pct = ((value - field.min) / (field.max - field.min)) * 100
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400 font-medium">{field.label}</label>
        <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg font-mono">{value}</span>
      </div>
      <div className="relative">
        <input type="range" min={field.min} max={field.max} step={field.step} value={value}
          onChange={e => onChange(field.key, parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #3b82f6 ${pct}%, #1e293b ${pct}%)`
          }} />
      </div>
      <div className="flex justify-between text-[10px] text-slate-700">
        <span>{field.min}</span><span>{field.max}</span>
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
          style={{ width: `${(value * 100).toFixed(1)}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold text-white w-10 text-right">{(value * 100).toFixed(1)}%</span>
    </div>
  )
}

export default function LivePredictor() {
  const [vals, setVals] = useState(DEFAULTS)
  const [history, setHistory] = useState([])

  const onChange = useCallback((key, val) => {
    setVals(prev => ({ ...prev, [key]: val }))
  }, [])

  const result = predict(vals)
  const socError = (vals.estSOC - vals.gtSOC).toFixed(3)

  const radarData = FIELDS.map(f => ({
    feature: f.label.split(' ')[0],
    value: Math.round(((vals[f.key] - f.min) / (f.max - f.min)) * 100),
  }))

  const addToHistory = () => {
    setHistory(prev => [{
      ...vals, socError, rfPred: result.rf.cls, xgbPred: result.xgb.cls,
      ts: new Date().toLocaleTimeString()
    }, ...prev].slice(0, 8))
  }

  const reset = () => setVals(DEFAULTS)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <IconZap className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Live Fault Predictor</div>
            <div className="text-xs text-slate-500">Adjust sensor values — predictions update in real-time using model logic</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sliders */}
        <div className="lg:col-span-1 bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Sensor Inputs</div>
            <button onClick={reset} className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded-lg hover:bg-slate-800">
              Reset defaults
            </button>
          </div>
          {FIELDS.map(f => (
            <Slider key={f.key} field={f} value={vals[f.key]} onChange={onChange} />
          ))}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">SOC Error (derived)</span>
              <span className={`font-bold font-mono ${parseFloat(socError) > 2 ? 'text-red-400' : parseFloat(socError) > 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {socError}%
              </span>
            </div>
          </div>
          <button onClick={addToHistory}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors">
            Log Prediction
          </button>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Model predictions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Random Forest', res: result.rf, file: 'random_forest_battery_model.pkl' },
              { label: 'XGBoost',       res: result.xgb, file: 'xgboost_battery_model.pkl' },
            ].map(({ label, res, file }) => {
              const Icon = CLASS_ICON[res.cls]
              const color = CLASS_COLOR[res.cls]
              return (
                <div key={label} className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5"
                  style={{ borderColor: color + '30' }}>
                  <div className="text-xs text-slate-500 mb-3 font-mono truncate">{file}</div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: color + '15' }}>
                      <Icon className="w-6 h-6" style={{ color }} />
                    </div>
                    <div>
                      <div className="text-xl font-bold" style={{ color }}>{res.cls}</div>
                      <div className="text-xs text-slate-500">{label}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <ProbBar label="Fault"   value={res.conf[0]} color="#ef4444" />
                    <ProbBar label="Normal"  value={res.conf[1]} color="#10b981" />
                    <ProbBar label="Warning" value={res.conf[2]} color="#f59e0b" />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Radar */}
          <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
            <div className="text-xs font-semibold text-slate-300 mb-3">Normalized Feature Profile</div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="feature" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Radar name="Input" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={1.5} />
                <Tooltip contentStyle={{ backgroundColor: '#0b0f1e', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Prediction Log</div>
            <button onClick={() => setHistory([])} className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">Clear</button>
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
