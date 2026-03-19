import { IconDatabase, IconShieldAlert, IconAlertTriangle, IconCheckCircle, IconZap, IconActivity } from '../Icons'

function Card({ icon: Icon, label, value, sub, accent, pct, delta }) {
  return (
    <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-4 md:p-5 hover:border-slate-700/60 transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: accent + '18' }}>
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
        {delta !== undefined && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: accent + '15', color: accent }}>{delta}</span>
        )}
      </div>
      <div className="text-2xl font-bold text-white tracking-tight mb-0.5">{value}</div>
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className="text-[11px] text-slate-600 mt-0.5 mb-3">{sub}</div>
      {pct !== undefined && (
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: accent }} />
        </div>
      )}
    </div>
  )
}

export default function MotorStatCards({ data }) {
  const total = data.length
  if (!total) return null
  const counts = {}
  data.forEach(d => { counts[d.Class] = (counts[d.Class] || 0) + 1 })

  const avg   = key => data.reduce((s, d) => s + (parseFloat(d[key]) || 0), 0) / total
  const minOf = key => data.reduce((m, d) => Math.min(m, parseFloat(d[key]) || 0), Infinity)
  const maxOf = key => data.reduce((m, d) => Math.max(m, parseFloat(d[key]) || 0), -Infinity)

  const avgCurrent = avg('CURRENT (A) mean').toFixed(3)
  const avgRPM     = avg('ROTO (RPM) mean').toFixed(1)
  const minC = minOf('CURRENT (A) mean').toFixed(3)
  const maxC = maxOf('CURRENT (A) mean').toFixed(3)
  const minR = minOf('ROTO (RPM) mean').toFixed(1)
  const maxR = maxOf('ROTO (RPM) mean').toFixed(1)
  const cRange = parseFloat(maxC) - parseFloat(minC) || 1
  const rRange = parseFloat(maxR) - parseFloat(minR) || 1
  const healthy = counts['Healthy'] || 0
  const mechElec = counts['Mech_Elec_Damage'] || 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      <Card icon={IconDatabase}      label="Total Records"   value={total.toLocaleString()}
        sub={`${((healthy/total)*100||0).toFixed(0)}% healthy`}
        accent="#8b5cf6" pct={(healthy/total)*100} delta="Live" />
      <Card icon={IconCheckCircle}   label="Healthy"         value={healthy}
        sub={`${((healthy/total)*100||0).toFixed(1)}% of dataset`}
        accent="#10b981" pct={(healthy/total)*100} />
      <Card icon={IconShieldAlert}   label="Elec Damage"     value={counts['Elec_Damage']||0}
        sub={`${(((counts['Elec_Damage']||0)/total)*100).toFixed(1)}% of dataset`}
        accent="#ef4444" pct={((counts['Elec_Damage']||0)/total)*100} />
      <Card icon={IconAlertTriangle} label="Mech Damage"     value={counts['Mech_Damage']||0}
        sub={`${(((counts['Mech_Damage']||0)/total)*100).toFixed(1)}% of dataset`}
        accent="#f59e0b" pct={((counts['Mech_Damage']||0)/total)*100} />
      <Card icon={IconZap}           label="Avg Current"     value={`${avgCurrent} A`}
        sub={`Range ${minC} – ${maxC} A`}
        accent="#8b5cf6" pct={((parseFloat(avgCurrent)-parseFloat(minC))/cRange)*100} />
      <Card icon={IconActivity}      label="Avg RPM"         value={`${avgRPM}`}
        sub={`Range ${minR} – ${maxR} RPM`}
        accent="#f97316" pct={((parseFloat(avgRPM)-parseFloat(minR))/rRange)*100} />
    </div>
  )
}
