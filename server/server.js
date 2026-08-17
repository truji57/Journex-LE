const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const Papa = require('papaparse')

const app = express()
const PORT = process.env.PORT || 5178
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

const FIELD_ALIASES = {
  'stopLoss': 'initialSL',
  'takeProfit': 'idealTP',
  'lots': 'cantidad',
  'result': 'resultado',
  'rMultiple': 'ratio',
  'emotions': 'emociones',
  'strategy': 'estrategia',
  'screenshots': 'captura'
}
const JSON_FIELDS = ['tags']
const NUMERIC_FIELDS = ['id', 'sessionId', 'entryPrice', 'exitPrice', 'initialSL', 'stopLoss', 'idealTP', 'takeProfit', 'cantidad', 'lots', 'profit', 'ratio', 'rMultiple', 'fees', 'beneficioNeto']

function readCSV(file) {
  ensureDir()
  if (!fs.existsSync(file)) return []
  const content = fs.readFileSync(file, 'utf8')
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true })
  if (!parsed.data || parsed.data.length === 0) return []
  return parsed.data.map(row => {
    for (const [oldKey, newKey] of Object.entries(FIELD_ALIASES)) {
      if (row[oldKey] !== undefined && row[newKey] === undefined) {
        row[newKey] = row[oldKey]
      }
    }
    for (const h of JSON_FIELDS) {
      const val = row[h]
      try { row[h] = val ? JSON.parse(val) : [] }
      catch { row[h] = [] }
    }
    for (const h of NUMERIC_FIELDS) {
      if (row[h] !== undefined && row[h] !== '') {
        row[h] = isNaN(Number(row[h])) ? row[h] : Number(row[h])
      }
    }
    return row
  })
}

function writeCSV(file, rows) {
  ensureDir()
  const allKeys = new Set()
  for (const row of rows) {
    Object.keys(row).forEach(k => allKeys.add(k))
  }
  const fields = Array.from(allKeys)
  const idIdx = fields.indexOf('id')
  if (idIdx > 0) { fields.splice(idIdx, 1); fields.unshift('id') }

  const cleanRows = rows.map(row => {
    const clean = {}
    for (const f of fields) {
      const val = row[f]
      if (val === null || val === undefined) clean[f] = ''
      else if (typeof val === 'object') clean[f] = JSON.stringify(val)
      else clean[f] = val
    }
    return clean
  })
  const csvContent = Papa.unparse({ fields, data: cleanRows })
  const tmpFile = file + '.tmp'
  fs.writeFileSync(tmpFile, csvContent, 'utf8')
  fs.renameSync(tmpFile, file)
}

const opQueues = new Map()

function enqueueFileOp(file, opFn) {
  const prev = opQueues.get(file) || Promise.resolve()
  const next = prev.then(opFn).catch(err => { console.error('File op error:', err.message) })
  opQueues.set(file, next)
  return next
}

const sessionsFile = () => path.join(DATA_DIR, 'sessions.json')
const tradesCSVFile = (sessionId) => path.join(DATA_DIR, `trades_${sessionId}.csv`)

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '100mb' }))

app.get('/api/sessions', (req, res) => {
  res.json(readJSON(sessionsFile()))
})

app.get('/api/version', (req, res) => {
  const changelog = readJSON(path.join(__dirname, 'changelog.json'))
  const version = changelog.length > 0 ? changelog[0].version : 'v0.0'
  res.json({ version })
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

app.delete('/api/sessions/:sessionId', async (req, res) => {
  const { sessionId } = req.params
  let sessions = readJSON(sessionsFile())
  const session = sessions.find(s => String(s.id) === sessionId)
  if (!session) return res.status(404).json({ error: 'Sesión no encontrada' })
  const tf = tradesCSVFile(sessionId)
  try {
    await enqueueFileOp(tf, () => {
      if (fs.existsSync(tf)) fs.unlinkSync(tf)
      opQueues.delete(tf)
    })
    sessions = sessions.filter(s => String(s.id) !== sessionId)
    writeJSON(sessionsFile(), sessions)
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/sessions/:sessionId/trades', (req, res) => {
  const { sessionId } = req.params
  const sessions = readJSON(sessionsFile())
  if (!sessions.find(s => String(s.id) === sessionId)) return res.status(404).json({ error: 'Sesión no encontrada' })
  res.json(readCSV(tradesCSVFile(sessionId)))
})

app.post('/api/sessions/:sessionId/trades', async (req, res) => {
  const { sessionId } = req.params
  const sessions = readJSON(sessionsFile())
  if (!sessions.find(s => String(s.id) === sessionId)) return res.status(404).json({ error: 'Sesión no encontrada' })
  const tf = tradesCSVFile(sessionId)
  try {
    const newTrade = await enqueueFileOp(tf, () => {
      const trades = readCSV(tf)
      const nt = { id: Date.now(), sessionId: Number(sessionId), ...req.body }
      trades.push(nt)
      writeCSV(tf, trades)
      return nt
    })
    res.json(newTrade)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/sessions/:sessionId/trades/:id', async (req, res) => {
  const { sessionId, id } = req.params
  const sessions = readJSON(sessionsFile())
  if (!sessions.find(s => String(s.id) === sessionId)) return res.status(404).json({ error: 'Sesión no encontrada' })
  const tf = tradesCSVFile(sessionId)
  try {
    const updated = await enqueueFileOp(tf, () => {
      const trades = readCSV(tf)
      const index = trades.findIndex(t => String(t.id) === id)
      if (index === -1) throw new Error('Trade not found')
      trades[index] = { ...trades[index], ...req.body, id: trades[index].id, sessionId: Number(sessionId) }
      writeCSV(tf, trades)
      return trades[index]
    })
    res.json(updated)
  } catch (err) {
    if (err.message === 'Trade not found') res.status(404).json({ error: 'Trade not found' })
    else res.status(500).json({ error: err.message })
  }
})

app.delete('/api/sessions/:sessionId/trades/:id', async (req, res) => {
  const { sessionId, id } = req.params
  const sessions = readJSON(sessionsFile())
  if (!sessions.find(s => String(s.id) === sessionId)) return res.status(404).json({ error: 'Sesión no encontrada' })
  const tf = tradesCSVFile(sessionId)
  try {
    await enqueueFileOp(tf, () => {
      let trades = readCSV(tf)
      trades = trades.filter(t => String(t.id) !== id)
      writeCSV(tf, trades)
    })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/sessions/:sessionId/trades', async (req, res) => {
  const { sessionId } = req.params
  const sessions = readJSON(sessionsFile())
  if (!sessions.find(s => String(s.id) === sessionId)) return res.status(404).json({ error: 'Sesión no encontrada' })
  const tf = tradesCSVFile(sessionId)
  try {
    await enqueueFileOp(tf, () => { writeCSV(tf, []) })
    res.json({ success: true, message: 'Historial eliminado' })
  } catch (err) { res.status(500).json({ error: err.message }) }
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

app.post('/api/sessions/:sessionId/restore', async (req, res) => {
  const { sessionId } = req.params
  const sessions = readJSON(sessionsFile())
  if (!sessions.find(s => String(s.id) === sessionId)) return res.status(404).json({ error: 'Sesión no encontrada' })
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'El cuerpo debe ser un array de trades' })
  const tf = tradesCSVFile(sessionId)
  try {
    await enqueueFileOp(tf, () => { writeCSV(tf, req.body) })
    res.json({ message: 'Sesión restaurada', trades: req.body })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  res.status(500).json({ error: err.message || 'Error interno' })
})

app.listen(PORT, '0.0.0.0', () => {
  ensureDir()
  console.log(`Journex LE backend en http://localhost:${PORT}`)
  console.log(`Datos en: ${DATA_DIR}`)
})
