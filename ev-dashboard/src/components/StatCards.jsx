import { IconDatabase, IconShieldAlert, IconAlertTriangle, IconBolt, IconThermometer, IconBattery } from './Icons'

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
            style={{ backgroundColor: accent + '15', color: accent }}>
            {delta}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white tracking-tight mb-0.5">{value}</div>
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className="text-[11px] text-slate-600 mt-0.5 mb-3">{sub}</div>
      {pct !== undefined && (
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, pct)}%`, backgroundColor: accent }} />
        </div>
      )}
    </div>
  )
}

export default function StatCards({ data }) {
  const total   = data.length
  const normal  = data.filter(d => d['Fault Label'] === 'Normal').length
  const warning = data.filter(d => d['Fault Label'] === 'Warning').length
  const fault   = data.filter(d => d['Fault Label'] === 'Fault').length
  const avg = key => total ? data.reduce((s, d) => s + d[key], 0) / total : 0
  const minOf = key => total ? Math.min(...data.map(d => d[key])) : 0
  const maxOf = key => total ? Math.max(...data.map(d => d[key])) : 0

  const avgV   = avg('Voltage (V)').toFixed(3)
  const avgT   = avg('Temperature (°C)').toFixed(1)
  const avgSOC = avg('Estimated SOC (%)').toFixed(1)
  const avgRes = avg('Residual (%)').toFixed(3)

  const minV = minOf('Voltage (V)').toFixed(2)
  const maxV = maxOf('Voltage (V)').toFixed(2)
  const minT = minOf('Temperature (°C)').toFixed(1)
  const maxT = maxOf('Temperature (°C)').toFixed(1)

  const vRange = parseFloat(maxV) - parseFloat(minV) || 1
  const tRange = parseFloat(maxT) - parseFloat(minT) || 1

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      <Card icon={IconDatabase}      label="Total Records"    value={total.toLocaleString()}
        sub={`${((normal/total)*100||0).toFixed(0)}% operational`}
        accent="#3b82f6" pct={(normal/total)*100} delta="Live" />
      <Card icon={IconShieldAlert}   label="Fault Events"     value={fault}
        sub={`${((fault/total)*100||0).toFixed(1)}% of dataset`}
        accent="#ef4444" pct={(fault/total)*100} />
      <Card icon={IconAlertTriangle} label="Warnings"         value={warning}
        sub={`${((warning/total)*100||0).toFixed(1)}% of dataset`}
        accent="#f59e0b" pct={(warning/total)*100} />
      <Card icon={IconBolt}          label="Avg Voltage"      value={`${avgV} V`}
        sub={`Range ${minV} – ${maxV} V`}
        accent="#8b5cf6" pct={((parseFloat(avgV)-parseFloat(minV))/vRange)*100} />
      <Card icon={IconThermometer}   label="Avg Temperature"  value={`${avgT} °C`}
        sub={`Range ${minT} – ${maxT} °C`}
        accent="#f97316" pct={((parseFloat(avgT)-parseFloat(minT))/tRange)*100} />
      <Card icon={IconBattery}       label="Avg SOC"          value={`${avgSOC}%`}
        sub={`Avg residual ${avgRes}%`}
        accent="#10b981" pct={parseFloat(avgSOC)} />
    </div>
  )
}
