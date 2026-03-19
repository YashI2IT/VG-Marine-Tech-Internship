import { Router } from 'express'
import pool from '../db.js'

const router = Router()

// GET /api/motor-predictions
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200)
    const [rows] = await pool.query(
      'SELECT * FROM motor_prediction_log ORDER BY logged_at DESC LIMIT ?', [limit]
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/motor-predictions
router.post('/', async (req, res) => {
  try {
    const { features = {}, rfPred, xgbPred, dtPred } = req.body
    await pool.query(
      `INSERT INTO motor_prediction_log
        (current_mean, roto_mean, current_crest, roto_rms, rf_pred, xgb_pred, dt_pred, features_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        features['CURRENT (A) mean']     ?? null,
        features['ROTO (RPM) mean']      ?? null,
        features['CURRENT (A) crest_factor'] ?? null,
        features['ROTO (RPM) rms']       ?? null,
        rfPred, xgbPred, dtPred,
        JSON.stringify(features),
      ]
    )
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/motor-predictions
router.delete('/', async (req, res) => {
  try {
    await pool.query('DELETE FROM motor_prediction_log')
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
