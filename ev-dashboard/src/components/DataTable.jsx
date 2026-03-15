import { useState, useMemo } from 'react'
import { IconChevronLeft, IconChevronRight, IconDatabase, IconFilter } from './Icons'

const BADGE = {
  Normal:  'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25',
  Warning: 'bg-amber-500/10  text-amber-400  ring-1 ring-amber-500/25',
  Fault:   'bg-red-500/10    text-red-400    ring-1 ring-red-500/25',
}

const COLS = [
  { key: 'Time (ms)',            label: 'Time (ms)',    mono: true },
  { key: 'Voltage (V)',          label: 'Voltage (V)',  },
  { key: 'Current (A)',          label: 'Current (A)',  },
  { key: 'Temperature (°C)',     label: 'Temp (°C)',    },
  { key: 'Motor Speed (RPM)',    label: 'RPM',          mono: true },
  { key: 'Hall Code',            label: 'Hall Code',    mono: true },
  { key: 'Estimated SOC (%)',    label: 'Est. SOC',     },
  { key: 'Ground Truth SOC (%)', label: 'GT SOC',       },
  { key: 'Residual (%)',         label: 'Residual',     bar: true },
  { key: 'rf_pred',              label: 'RF Pred',      badge: true },
  { key: 'xgb_pred',             label: 'XGB Pred',     badge: true },
  { key: 'Fault Label',          label: 'Ground Truth', badge: true },
]

const PAGE_SIZE = 12

function ResidualBar({ value }) {
  const pct = Math.min(100, (value / 5.6) * 100)
  const color = value < 1.5 ? '#10b981' : value < 3 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="text-slate-300 font-mono">{value.toFixed(2)}</span>
      <div className="w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden flex-shrink-0">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function DataTable({ data }) {
  const [page, setPage]       = useState(0)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [search, setSearch]   = useState('')

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(q)))
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

  // Stats
  const faults   = data.filter(d => d['Fault Label'] === 'Fault').length
  const warnings = data.filter(d => d['Fault Label'] === 'Warning').length
  const normals  = data.filter(d => d['Fault Label'] === 'Normal').length

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: data.length, color: '#3b82f6' },
          { label: 'Normal', value: normals, color: '#10b981' },
          { label: 'Warning', value: warnings, color: '#f59e0b' },
          { label: 'Fault', value: faults, color: '#ef4444' },
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <IconDatabase className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Telemetry Records</div>
              <div className="text-xs text-slate-500">{total} rows · RF & XGB predictions included</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <IconFilter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 w-3.5 h-3.5" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
                placeholder="Search records..."
                className="bg-slate-800/60 border border-slate-700/40 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 w-40 sm:w-48" />
            </div>
          </div>
        </div>

        {/* Table */}
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
                      ? <span className="text-blue-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      : <span className="text-slate-700 ml-1">↕</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-800/20 transition-colors group">
                  <td className="py-3 px-4 text-slate-700 text-[10px] font-mono">{page * PAGE_SIZE + i + 1}</td>
                  {COLS.map(c => (
                    <td key={c.key} className="py-3 px-3 text-right whitespace-nowrap">
                      {c.badge ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${BADGE[row[c.key]] || 'text-slate-400'}`}>
                          {row[c.key] || '—'}
                        </span>
                      ) : c.bar ? (
                        <ResidualBar value={row[c.key]} />
                      ) : (
                        <span className={c.mono ? 'text-slate-400 font-mono' : 'text-slate-300'}>
                          {typeof row[c.key] === 'number'
                            ? Number.isInteger(row[c.key])
                              ? row[c.key].toLocaleString()
                              : row[c.key].toFixed(2)
                            : row[c.key] ?? '—'}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
                        p === page ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-800 hover:text-white'
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
