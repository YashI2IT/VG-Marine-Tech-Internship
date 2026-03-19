import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const P = {
  Healthy:          { fill: '#10b981', text: 'text-emerald-400' },
  Elec_Damage:      { fill: '#ef4444', text: 'text-red-400' },
  Mech_Damage:      { fill: '#f59e0b', text: 'text-amber-400' },
  Mech_Elec_Damage: { fill: '#8b5cf6', text: 'text-violet-400' },
}
const LABEL = {
  Healthy: 'Healthy', Elec_Damage: 'Elec Damage',
  Mech_Damage: 'Mech Damage', Mech_Elec_Damage: 'Mech+Elec',
}

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-[#0b0f1e] border border-slate-700/60 rounded-xl px-3 py-2.5 shadow-2xl">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{name}</div>
      <div className="text-sm font-bold text-white">{value.toLocaleString()} records</div>
    </div>
  )
}

export default function MotorFaultDistribution({ data }) {
  if (!data.length) return null
  const counts = {}
  data.forEach(d => { counts[d.Class] = (counts[d.Class] || 0) + 1 })
  const total = data.length
  const chartData = Object.keys(P)
    .filter(k => counts[k])
    .map(k => ({ name: LABEL[k] || k, rawName: k, value: counts[k] }))

  return (
    <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5 flex flex-col">
      <div className="mb-1">
        <div className="text-sm font-semibold text-white">Fault Distribution</div>
        <div className="text-xs text-slate-500 mt-0.5">Classification breakdown · {total} records</div>
      </div>

      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
            dataKey="value" paddingAngle={4} strokeWidth={0} startAngle={90} endAngle={-270}>
            {chartData.map(e => <Cell key={e.rawName} fill={P[e.rawName]?.fill || '#64748b'} />)}
          </Pie>
          <Tooltip content={<Tip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="space-y-2.5 mt-2">
        {chartData.map(d => {
          const pct = ((d.value / total) * 100).toFixed(1)
          const p = P[d.rawName]
          return (
            <div key={d.rawName}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
                  <span className="text-xs text-slate-400 font-medium">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${p.text}`}>{pct}%</span>
                  <span className="text-[11px] text-slate-600">{d.value.toLocaleString()}</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: p.fill }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
