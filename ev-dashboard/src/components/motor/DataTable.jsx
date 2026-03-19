import { useState, useMemo } from 'react'
import { IconChevronLeft, IconChevronRight, IconDatabase, IconFilter } from '../Icons'

const CLASS_COLOR = {
  Healthy: '#10b981', Elec_Damage: '#ef4444', Mech_Damage: '#f59e0b', Mech_Elec_Damage: '#8b5cf6',
}
const CLASS_BADGE = {
  Healthy:          'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25',
  Elec_Damage:      'bg-red-500/10    text-red-400    ring-1 ring-red-500/25',
  Mech_Damage:      'bg-amber-500/10  text-amber-400  ring-1 ring-amber-500/25',
  Mech_Elec_Damage: 'bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/25',
}

const COLS = [
  { key: 'Class',                    label: 'True Class',  badge: true },
  { key: 'rf_pred',                  label: 'RF Pred',     badge: true },
  { key: 'xgb_pred',                 label: 'XGB Pred',    badge: true },
  { key: 'dt_pred',                  label: 'DT Pred',     badge: true },
  { key: 'CURRENT (A) mean',         label: 'I Mean (A)'  },
  { key: 'CURRENT (A) rms',          label: 'I RMS (A)'   },
  { key: 'CURRENT (A) max',          label: 'I Max (A)'   },
  { key: 'CURRENT (A) crest_factor', label: 'Crest'       },
  { key: 'ROTO (RPM) mean',          label: 'RPM Mean'    },
  { key: 'ROTO (RPM) rms',           label: 'RPM RMS'     },
  { key: 'ROTO (RPM) max',           label: 'RPM Max'     },
]

const PAGE_SIZE = 12

export default function MotorDataTable({ data }) {
  const [page, setPage]       = useState(0)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [search, setSearch]   = useState('')

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(r => r.Class?.toLowerCase().includes(q) || r.rf_pred?.toLowerCase().includes(q))
  }, [data, search])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
  }, [filtered, sortKey, sortDir])

  const total = sorted.length
  const pages = Math.ceil(total / PAGE_SIZE)
  const rows  = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = key => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  const counts = {}
  data.forEach(d => { counts[d.Class] = (counts[d.Class] || 0) + 1 })

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',      value: data.length,                  color: '#8b5cf6' },
          { label: 'Healthy',    value: counts['Healthy'] || 0,       color: '#10b981' },
          { label: 'Elec Dmg',   value: counts['Elec_Damage'] || 0,   color: '#ef4444' },
          { label: 'Mech Dmg',   value: counts['Mech_Damage'] || 0,   color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="bg-[#0b0f1e] border border-slate-800/60 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-8 rounded-full" style={{ backgroundColor: s.color + '60' }} />
            <div>
              <div className="text-lg font-bold text-white">{s.value.toLocaleString()}</div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <IconDatabase className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Motor Records</div>
              <div className="text-xs text-slate-500">{total} rows · RF, XGB & DT predictions included</div>
            </div>
          </div>
          <div className="relative">
            <IconFilter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 w-3.5 h-3.5" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
              placeholder="Filter by class…"
              className="bg-slate-800/60 border border-slate-700/40 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500/50 w-40 sm:w-48" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/30">
                <th className="py-3 px-4 text-left text-[10px] text-slate-600 font-medium uppercase tracking-wider w-8">#</th>
                {COLS.map(c => (
                  <th key={c.key} onClick={() => handleSort(c.key)}
                    className="py-3 px-3 text-right text-[10px] text-slate-500 font-medium uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors whitespace-nowrap select-none">
                    {c.label}
                    {sortKey === c.key
                      ? <span className="text-violet-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      : <span className="text-slate-700 ml-1">↕</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 px-4 text-slate-700 text-[10px] font-mono">{page * PAGE_SIZE + i + 1}</td>
                  {COLS.map(c => (
                    <td key={c.key} className="py-3 px-3 text-right whitespace-nowrap">
                      {c.badge ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${CLASS_BADGE[row[c.key]] || 'text-slate-400'}`}>
                          {row[c.key]?.replace(/_/g, ' ') || '—'}
                        </span>
                      ) : (
                        <span className="text-slate-300 font-mono">
                          {typeof row[c.key] === 'number' ? row[c.key].toFixed(4) : row[c.key] ?? '—'}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-800/60 bg-slate-900/20">
            <span className="text-xs text-slate-500">
              Showing {Math.min(page * PAGE_SIZE + 1, total)}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(0)} disabled={page === 0}
                className="px-2 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-400 disabled:opacity-30 hover:bg-slate-700 hover:text-white transition-all">«</button>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-400 disabled:opacity-30 hover:bg-slate-700 hover:text-white transition-all">
                <IconChevronLeft /> Prev
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                  const p = pages <= 5 ? i : Math.min(Math.max(page - 2, 0), pages - 5) + i
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                        p === page ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-800 hover:text-white'
                      }`}>{p + 1}</button>
                  )
                })}
              </div>
              <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page === pages - 1}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-400 disabled:opacity-30 hover:bg-slate-700 hover:text-white transition-all">
                Next <IconChevronRight />
              </button>
              <button onClick={() => setPage(pages - 1)} disabled={page === pages - 1}
                className="px-2 py-1.5 bg-slate-800 rounded-lg text-xs text-slate-400 disabled:opacity-30 hover:bg-slate-700 hover:text-white transition-all">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
