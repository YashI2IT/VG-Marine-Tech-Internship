import { useState, useMemo } from 'react'
import { IconChevronLeft, IconChevronRight, IconFilter } from '../Icons'

const CLASS_COLOR = {
  Healthy: '#10b981', Elec_Damage: '#ef4444', Mech_Damage: '#f59e0b', Mech_Elec_Damage: '#8b5cf6',
}
const PAGE_SIZE = 20
const COLS = [
  { key: 'Class',                    label: 'True Class' },
  { key: 'rf_pred',                  label: 'RF Pred' },
  { key: 'xgb_pred',                 label: 'XGB Pred' },
  { key: 'dt_pred',                  label: 'DT Pred' },
  { key: 'CURRENT (A) mean',         label: 'I Mean' },
  { key: 'CURRENT (A) rms',          label: 'I RMS' },
  { key: 'CURRENT (A) max',          label: 'I Max' },
  { key: 'CURRENT (A) crest_factor', label: 'Crest' },
  { key: 'ROTO (RPM) mean',          label: 'RPM Mean' },
  { key: 'ROTO (RPM) rms',           label: 'RPM RMS' },
  { key: 'ROTO (RPM) max',           label: 'RPM Max' },
]

function ClassBadge({ value }) {
  const color = CLASS_COLOR[value] || '#64748b'
  return (
    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: color + '18', color }}>
      {value?.replace(/_/g, ' ') || '—'}
    </span>
  )
}

export default function MotorDataTable({ data }) {
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(r => r.Class?.toLowerCase().includes(q) || r.rf_pred?.toLowerCase().includes(q))
  }, [data, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const classCols  = ['Class', 'rf_pred', 'xgb_pred', 'dt_pred']

  return (
    <div className="bg-[#0b0f1e] border border-slate-800/60 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-semibold text-white mb-0.5">Data Explorer</div>
          <div className="text-xs text-slate-500">{filtered.length} records · page {page} of {totalPages}</div>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2">
          <IconFilter className="w-3.5 h-3.5 text-slate-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Filter by class…"
            className="bg-transparent text-xs text-slate-300 placeholder-slate-600 outline-none w-36" />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="py-2.5 px-3 text-left text-[10px] text-slate-500 uppercase tracking-wider">#</th>
              {COLS.map(c => (
                <th key={c.key} className="py-2.5 px-3 text-left text-[10px] text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {pageData.map((row, i) => (
              <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                <td className="py-2 px-3 text-slate-600 font-mono">{(page - 1) * PAGE_SIZE + i + 1}</td>
                {COLS.map(c => (
                  <td key={c.key} className="py-2 px-3">
                    {classCols.includes(c.key)
                      ? <ClassBadge value={row[c.key]} />
                      : <span className="text-slate-300 font-mono">{typeof row[c.key] === 'number' ? row[c.key].toFixed(4) : row[c.key] ?? '—'}</span>
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            <IconChevronLeft /> Prev
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                    p === page ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-800 hover:text-white'
                  }`}>{p}</button>
              )
            })}
          </div>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            Next <IconChevronRight />
          </button>
        </div>
      )}
    </div>
  )
}
