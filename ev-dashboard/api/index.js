import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import telemetryRoutes from './routes/telemetry.js'
import predictionsRoutes from './routes/predictions.js'

dotenv.config()

const app  = express()
const PORT = process.env.API_PORT || 3001

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }))
app.use(express.json())

app.use('/api/telemetry',   telemetryRoutes)
app.use('/api/predictions', predictionsRoutes)

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`))
