import { Router } from 'express'
import pool from '../db.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const router = Router()
const __dir  = dirname(fileURLToPath(import.meta.url))

// Column mapping: JSON key → DB column
const COL_MAP = {
  'CURRENT (A) mean':             'current_mean',
  'CURRENT (A) std':              'current_std',
  'CURRENT (A) max':              'current_max',
  'CURRENT (A) rms':              'current_rms',
  'CURRENT (A) peak_to_peak':     'current_p2p',
  'CURRENT (A) skew':             'current_skew',
  'CURRENT (A) kurtosis':         'current_kurt',
  'CURRENT (A) crest_factor':     'current_crest',
  'ROTO (RPM) mean':              'roto_mean',
  'ROTO (RPM) std':               'roto_std',
  'ROTO (RPM) max':               'roto_max',
  'ROTO (RPM) rms':               'roto_rms',
  'ROTO (RPM) peak_to_peak':      'roto_p2p',
  'ROTO (RPM) skew':              'roto_skew',
  'ROTO (RPM) kurtosis':          'roto_kurt',
  'ROTO (RPM) crest_factor':      'roto_crest',
  'CURRENT (A) Frequency Center': 'current_freq_ctr',
  'CURRENT (A) Spectrum Area':    'current_spec_area',
  'CURRENT (A) Amp @ 1x RPM':    'current_amp_1x',
  'CURRENT (A) Amp @ 2x RPM':    'current_amp_2x',
  'CURRENT (A) Amp @ 3x RPM':    'current_amp_3x',
  'ROTO (RPM) Frequency Center':  'roto_freq_ctr',
  'ROTO (RPM) Spectrum Area':     'roto_spec_area',
  'ROTO (RPM) Amp @ 1x RPM':     'roto_amp_1x',
  'ROTO (RPM) Amp @ 2x RPM':     'roto_amp_2x',
  'ROTO (RPM) Amp @ 3x RPM':     'roto_amp_3x',
}

// GET /api/motor-telemetry
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 200, 500)
    const [rows] = await pool.query('SELECT * FROM motor_telemetry ORDER BY id LIMIT ?', [limit])
    // Map DB rows back to JSON keys
    const mapped = rows.map(r => {
      const out = { Class: r.true_class, rf_pred: r.rf_pred, xgb_pred: r.xgb_pred, dt_pred: r.dt_pred }
      Object.entries(COL_MAP).forEach(([jsonKey, dbCol]) => { out[jsonKey] = r[dbCol] })
      return out
    })
    res.json({ rows: mapped })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/motor-telemetry/seed — seed from motor_data_sample.json
router.post('/seed', async (req, res) => {
  try {
    const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM motor_telemetry')
    if (cnt > 0) return res.json({ seeded: false, existing: cnt })

    const samplePath = join(__dir, '../../motor-dashboard/public/motor_data_sample.json')
    const rows = JSON.parse(readFileSync(samplePath, 'utf8'))

    const dbCols = Object.values(COL_MAP)
    const cols   = [...dbCols, 'true_class', 'rf_pred', 'xgb_pred', 'dt_pred']
    const values = rows.map(r => [
      ...Object.keys(COL_MAP).map(k => r[k] ?? null),
      r.Class, r.rf_pred, r.xgb_pred, r.dt_pred,
    ])

    await pool.query(
      `INSERT INTO motor_telemetry (${cols.join(',')}) VALUES ?`,
      [values]
    )
    res.json({ seeded: true, count: rows.length })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
