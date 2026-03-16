import { Router } from 'express'
import pool from '../db.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const router = Router()
const __dir  = dirname(fileURLToPath(import.meta.url))

// GET /api/telemetry — all records (with optional ?label=Fault|Warning|Normal)
router.get('/', async (req, res) => {
  try {
    const { label, limit = 500, offset = 0 } = req.query
    let sql = 'SELECT * FROM telemetry'
    const params = []
    if (label && ['Normal','Warning','Fault'].includes(label)) {
      sql += ' WHERE fault_label = ?'
      params.push(label)
    }
    sql += ' ORDER BY time_ms ASC LIMIT ? OFFSET ?'
    params.push(parseInt(limit), parseInt(offset))
    const [rows] = await pool.query(sql, params)
    const [[{ total }]] = await pool.query(
      label ? 'SELECT COUNT(*) as total FROM telemetry WHERE fault_label = ?' : 'SELECT COUNT(*) as total FROM telemetry',
      label ? [label] : []
    )
    res.json({ total, rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/telemetry/stats — aggregated stats for StatCards
router.get('/stats', async (req, res) => {
  try {
    const [[counts]] = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(fault_label = 'Normal')  as normal_count,
        SUM(fault_label = 'Warning') as warning_count,
        SUM(fault_label = 'Fault')   as fault_count,
        AVG(voltage)          as avg_voltage,
        MIN(voltage)          as min_voltage,
        MAX(voltage)          as max_voltage,
        AVG(temperature)      as avg_temperature,
        MIN(temperature)      as min_temperature,
        MAX(temperature)      as max_temperature,
        AVG(estimated_soc)    as avg_soc,
        AVG(residual)         as avg_residual,
        MIN(time_ms)          as min_time_ms,
        MAX(time_ms)          as max_time_ms
      FROM telemetry
    `)
    // Derive interval from first two rows
    const [[interval]] = await pool.query(
      'SELECT time_ms FROM telemetry ORDER BY time_ms ASC LIMIT 2'
    ).then(([rows]) => [[{ interval: rows.length > 1 ? rows[1].time_ms - rows[0].time_ms : null }]])
    res.json({ ...counts, interval_ms: interval.interval })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/telemetry/seed — load ev_data_sample.json into DB (idempotent)
router.post('/seed', async (req, res) => {
  try {
    const [[{ count }]] = await pool.query('SELECT COUNT(*) as count FROM telemetry')
    if (count > 0) return res.json({ message: `Already seeded (${count} rows)`, seeded: false })

    const samplePath = join(__dir, '../../public/ev_data_sample.json')
    const rows = JSON.parse(readFileSync(samplePath, 'utf8'))

    const values = rows.map(r => [
      r['Time (ms)'],
      r['Voltage (V)'],
      r['Current (A)'],
      r['Temperature (°C)'],
      r['Motor Speed (RPM)'],
      String(r['Hall Code'] ?? ''),
      r['Estimated SOC (%)'],
      r['Ground Truth SOC (%)'],
      r['Residual (%)'],
      r['SOC_Error'],
      r['Fault Label'],
      r['rf_pred'],
      r['xgb_pred'],
      r['rf_prob_fault']   ?? null,
      r['rf_prob_normal']  ?? null,
      r['rf_prob_warning'] ?? null,
      r['xgb_prob_fault']  ?? null,
      r['xgb_prob_normal'] ?? null,
      r['xgb_prob_warning']?? null,
    ])

    await pool.query(`
      INSERT INTO telemetry
        (time_ms, voltage, current, temperature, motor_speed_rpm, hall_code,
         estimated_soc, ground_truth_soc, residual, soc_error, fault_label,
         rf_pred, xgb_pred,
         rf_prob_fault, rf_prob_normal, rf_prob_warning,
         xgb_prob_fault, xgb_prob_normal, xgb_prob_warning)
      VALUES ?
    `, [values])

    res.json({ message: `Seeded ${values.length} rows`, seeded: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
