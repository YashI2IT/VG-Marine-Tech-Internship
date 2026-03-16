import { Router } from 'express'
import pool from '../db.js'

const router = Router()

// GET /api/predictions — fetch all logged predictions (newest first)
router.get('/', async (req, res) => {
  try {
    const { limit = 50 } = req.query
    const [rows] = await pool.query(
      'SELECT * FROM prediction_log ORDER BY logged_at DESC LIMIT ?',
      [parseInt(limit)]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/predictions — save a new prediction from LivePredictor
router.post('/', async (req, res) => {
  try {
    const {
      voltage, current, temperature, rpm,
      estSOC, gtSOC, residual, socError,
      rfPred, xgbPred,
    } = req.body

    if (!voltage || !rfPred || !xgbPred) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const [result] = await pool.query(`
      INSERT INTO prediction_log
        (voltage, current, temperature, motor_speed_rpm,
         estimated_soc, ground_truth_soc, residual, soc_error,
         rf_pred, xgb_pred)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [voltage, current, temperature, rpm, estSOC, gtSOC, residual, socError, rfPred, xgbPred])

    const [[row]] = await pool.query('SELECT * FROM prediction_log WHERE id = ?', [result.insertId])
    res.status(201).json(row)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/predictions — clear all logs
router.delete('/', async (req, res) => {
  try {
    await pool.query('DELETE FROM prediction_log')
    res.json({ message: 'Prediction log cleared' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
