import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = {
  Healthy:          '#10b981',
  Elec_Damage:      '#ef4444',
  Mech_Damage:      '#f59e0b',
  Mech_Elec_Damage: '#8b5cf6',
}

const LABEL_MAP = {
  Healthy: 'Healthy',
  Elec_Damage: 'Elec Damage',
  Mech_Damage: 'Mech Damage',
  Mech_Elec_Damage: 'Mech+Elec',
}

export default function FaultDistribution({ data }) {
  if (!data.length) return null

  const counts = {}
  data.forEach(d => { counts[d.Class] = (counts[d.Class] || 0) + 1 })

  const chartData = Object.entries(counts).map(([name, value]) => ({
    name: LABEL_MAP[name] || name,
    rawName: name,
    value,
    pct: ((value / data.length) * 100).toFixed(1),
  }))

  return (
    <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
      <div className="text-sm font-semibold text-white mb-1">Fault Class Distribution</div>
      <div className="text-xs text-slate-500 mb-4">{data.length} records · {chartData.length} classes</div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
            dataKey="value" paddingAngle={3}>
            {chartData.map(entry => (
              <Cell key={entry.rawName} fill={COLORS[entry.rawName] || '#64748b'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#0b0f1e', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
            formatter={(v, n, p) => [`${v} records (${p.payload.pct}%)`, p.payload.name]} />
          <Legend iconType="circle" iconSize={8}
            formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {chartData.map(d => (
          <div key={d.rawName} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/30">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[d.rawName] || '#64748b' }} />
            <span className="text-xs text-slate-400 truncate">{d.name}</span>
            <span className="ml-auto text-xs font-bold text-white">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
