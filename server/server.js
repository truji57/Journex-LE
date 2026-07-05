const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3001
const DATA_DIR = path.join(__dirname, 'data')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readJSON(file) {
  ensureDir()
  if (!fs.existsSync(file)) return []
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) }
  catch { return [] }
}

function writeJSON(file, data) {
  ensureDir()
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

const CSV_HEADERS = ['id', 'sessionId', 'symbol', 'action', 'type', 'entryPrice', 'exitPrice', 'stopLoss', 'takeProfit', 'lots', 'result', 'profit', 'rMultiple', 'fees', 'tags', 'emotions', 'strategy', 'screenshots', 'entryDate', 'exitDate', 'notes', 'createdAt', 'date', 'data']

function escapeCSV(val) {
  if (val === null || val === undefined) return ''
  const s = typeof val === 'object' ? JSON.stringify(val) : String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

function readCSV(file) {
  ensureDir()
  if (!fs.existsSync(file)) return []
  const content = fs.readFileSync(file, 'utf8')
  const lines = content.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const parts = []
    let current = '', inside = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inside = !inside; continue }
      if (line[i] === ',' && !inside) { parts.push(current); current = ''; continue }
      current += line[i]
    }
    parts.push(current)
    const row = {}
    headers.forEach((h, i) => {
      const val = parts[i] || ''
      if (h === 'tags' || h === 'emotions' || h === 'screenshots') {
        try { row[h] = val ? JSON.parse(val) : (h === 'screenshots' ? [] : []) }
        catch { row[h] = [] }
      } else if (h === 'data') {
        try { row[h] = val ? JSON.parse(val) : {} }
        catch { row[h] = {} }
      } else if (['entryPrice', 'exitPrice', 'stopLoss', 'takeProfit', 'lots', 'profit', 'rMultiple', 'fees', 'id', 'sessionId'].includes(h)) {
        row[h] = isNaN(Number(val)) ? val : Number(val)
      } else {
        row[h] = val
      }
    })
    return row
  })
}

function writeCSV(file, rows) {
  ensureDir()
  const header = CSV_HEADERS.join(',')
  const lines = rows.map(row => CSV_HEADERS.map(h => escapeCSV(row[h])).join(','))
  fs.writeFileSync(file, [header, ...lines].join('\n'))
}

const sessionsFile = () => path.join(DATA_DIR, 'sessions.json')
const tradesCSVFile = (sessionId) => path.join(DATA_DIR, `trades_${sessionId}.csv`)

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '10mb' }))

// Sessions
app.get('/api/sessions', (req, res) => {
  res.json(readJSON(sessionsFile()))
})

app.post('/api/sessions', (req, res) => {
  const { name, type, initialCapital } = req.body
  if (!type || !['Live', 'Backtest'].includes(type)) return res.status(400).json({ error: 'Tipo requerido: Live o Backtest' })
  const sessions = readJSON(sessionsFile())
  const s = { id: Date.now(), name: name || `Sesión ${Date.now()}`, type, initialCapital: initialCapital ? parseFloat(initialCapital) : 0, createdAt: new Date().toISOString(), capitalMovements: [] }
  sessions.push(s)
  writeJSON(sessionsFile(), sessions)
  writeCSV(tradesCSVFile(s.id), [])
  res.json(s)
})

app.put('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params
  const { name, initialCapital, capitalMovements } = req.body
  let sessions = readJSON(sessionsFile())
  const idx = sessions.findIndex(s => String(s.id) === sessionId)
  if (idx === -1) return res.status(404).json({ error: 'Sesión no encontrada' })
  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'Nombre requerido' })
    sessions[idx].name = name.trim()
  }
  if (initialCapital !== undefined) sessions[idx].initialCapital = parseFloat(initialCapital) || 0
  if (capitalMovements !== undefined) sessions[idx].capitalMovements = capitalMovements
  writeJSON(sessionsFile(), sessions)
  res.json(sessions[idx])
})

app.delete('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params
  let sessions = readJSON(sessionsFile())
  const session = sessions.find(s => String(s.id) === sessionId)
  if (!session) return res.status(404).json({ error: 'Sesión no encontrada' })
  const tf = tradesCSVFile(sessionId)
  if (fs.existsSync(tf)) fs.unlinkSync(tf)
  sessions = sessions.filter(s => String(s.id) !== sessionId)
  writeJSON(sessionsFile(), sessions)
  res.json({ success: true })
})

// Trades (CSV)
app.get('/api/sessions/:sessionId/trades', (req, res) => {
  const { sessionId } = req.params
  const sessions = readJSON(sessionsFile())
  if (!sessions.find(s => String(s.id) === sessionId)) return res.status(404).json({ error: 'Sesión no encontrada' })
  res.json(readCSV(tradesCSVFile(sessionId)))
})

app.post('/api/sessions/:sessionId/trades', (req, res) => {
  const { sessionId } = req.params
  const sessions = readJSON(sessionsFile())
  if (!sessions.find(s => String(s.id) === sessionId)) return res.status(404).json({ error: 'Sesión no encontrada' })
  const trades = readCSV(tradesCSVFile(sessionId))
  const newTrade = { id: Date.now(), sessionId: Number(sessionId), ...req.body }
  trades.push(newTrade)
  writeCSV(tradesCSVFile(sessionId), trades)
  res.json(newTrade)
})

app.put('/api/sessions/:sessionId/trades/:id', (req, res) => {
  const { sessionId, id } = req.params
  const sessions = readJSON(sessionsFile())
  if (!sessions.find(s => String(s.id) === sessionId)) return res.status(404).json({ error: 'Sesión no encontrada' })
  const trades = readCSV(tradesCSVFile(sessionId))
  const index = trades.findIndex(t => String(t.id) === id)
  if (index === -1) return res.status(404).json({ error: 'Trade not found' })
  trades[index] = { ...trades[index], ...req.body, id: trades[index].id, sessionId: Number(sessionId) }
  writeCSV(tradesCSVFile(sessionId), trades)
  res.json(trades[index])
})

app.delete('/api/sessions/:sessionId/trades/:id', (req, res) => {
  const { sessionId, id } = req.params
  const sessions = readJSON(sessionsFile())
  if (!sessions.find(s => String(s.id) === sessionId)) return res.status(404).json({ error: 'Sesión no encontrada' })
  let trades = readCSV(tradesCSVFile(sessionId))
  trades = trades.filter(t => String(t.id) !== id)
  writeCSV(tradesCSVFile(sessionId), trades)
  res.json({ success: true })
})

app.delete('/api/sessions/:sessionId/trades', (req, res) => {
  const { sessionId } = req.params
  const sessions = readJSON(sessionsFile())
  if (!sessions.find(s => String(s.id) === sessionId)) return res.status(404).json({ error: 'Sesión no encontrada' })
  writeCSV(tradesCSVFile(sessionId), [])
  res.json({ success: true, message: 'Historial eliminado' })
})

app.get('/api/sessions/:sessionId/backup', (req, res) => {
  const { sessionId } = req.params
  const sessions = readJSON(sessionsFile())
  if (!sessions.find(s => String(s.id) === sessionId)) return res.status(404).json({ error: 'Sesión no encontrada' })
  const trades = readCSV(tradesCSVFile(sessionId))
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="trades_session_${sessionId}_backup.json"`)
  res.send(JSON.stringify(trades, null, 2))
})

app.post('/api/sessions/:sessionId/restore', (req, res) => {
  const { sessionId } = req.params
  const sessions = readJSON(sessionsFile())
  if (!sessions.find(s => String(s.id) === sessionId)) return res.status(404).json({ error: 'Sesión no encontrada' })
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'El cuerpo debe ser un array de trades' })
  writeCSV(tradesCSVFile(sessionId), req.body)
  res.json({ message: 'Sesión restaurada', trades: req.body })
})

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  res.status(500).json({ error: err.message || 'Error interno' })
})

app.listen(PORT, '0.0.0.0', () => {
  ensureDir()
  console.log(`Journex LE backend en http://localhost:${PORT}`)
  console.log(`Datos en: ${DATA_DIR}`)
})
