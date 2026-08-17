import React, { useState } from 'react'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import mt5Logo from '../assets/mt5_logo.png'
import tradovateLogo from '../assets/tradovate_logo.png'
import fxreplayLogo from '../assets/fxreplay_logo.png'
import ctraderLogo from '../assets/ctrader_logo.png'

const ImportPage = ({ onBack, sessionType, userSettings }) => {
  // Detectar sesión operativa usando userSettings
  const detectSession = (dateString) => {
    if (!userSettings?.sessions || userSettings.sessions.length === 0) return ''
    const d = new Date(dateString)
    const minutes = d.getHours() * 60 + d.getMinutes()
    for (const session of userSettings.sessions) {
      const [sH, sM] = session.start.split(':').map(Number)
      const [eH, eM] = session.end.split(':').map(Number)
      let startMin = sH * 60 + sM
      let endMin = eH * 60 + eM
      if (endMin <= startMin) endMin += 24 * 60
      let m = minutes
      if (m < startMin) m += 24 * 60
      if (m >= startMin && m <= endMin) return session.name
    }
    return ''
  }
  const [selectedPlatform, setSelectedPlatform] = useState('')
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (f) setFile(f)
  }

  // ---------- MT5 ----------
  const handleImportMT5 = () => {
    if (!file) return
    setImporting(true)
    setError('')
    setMessage('Procesando archivo XLSX...')
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const ws = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
        const startIdx = rows.findIndex(r => r[0] === 'Posiciones')
        if (startIdx === -1) { setError('No se encontró tabla Posiciones'); setImporting(false); return }
        const dataStart = startIdx + 2
        const stopIdx = rows.findIndex((r, idx) => idx > startIdx && typeof r[0] === 'string' && (r[0].startsWith('Órdenes') || r[0].startsWith('Transacciones')))
        const dataRows = stopIdx === -1 ? rows.slice(dataStart) : rows.slice(dataStart, stopIdx)
        const dateRegex = /^\d{4}\.\d{2}\.\d{2}\s/
        const tradesArr = dataRows
          .filter(r => typeof r[0] === 'string' && dateRegex.test(r[0]))
          .map(row => {
            const dateTimeStr = row[0]
            const [datePart, timePart] = dateTimeStr.split(' ')
            const isoDate = datePart.replace(/\./g, '-') + 'T' + timePart
            const date = new Date(isoDate).toISOString()
            const symbol = (row[2] || '').replace(/\.raw$/i, '')
            const typeRaw = (row[3] || '').toString().toLowerCase()
            const type = typeRaw === 'buy' ? 'long' : 'short'
            const volumen = parseFloat(row[4] || 0)
            const entryPrice = parseFloat(row[5] || 0)
            const initialSL = parseFloat(row[6] || 0)
            const idealTP = parseFloat(row[7] || 0)
            const exitPrice = parseFloat(row[9] || 0)
            const commission = parseFloat(row[10] || 0)
            const profit = parseFloat(row[12] || 0)
            let ratio = ''
            if (entryPrice && initialSL && idealTP) {
              const denom = entryPrice - initialSL
              if (denom !== 0) ratio = ((idealTP - entryPrice) / denom).toFixed(2)
            }
            return {
              date, symbol, type,
              entryPrice, initialSL, idealTP,
              exitPrice, quantity: volumen,
              fees: commission, profit,
              notes: 'Importado desde MT5',
              ratio,
              beneficio: profit,
              beneficioNeto: profit + commission,
              cantidad: volumen,
              sesion: detectSession(date),
              resultado: profit >= 0 ? 'TakeProfit' : 'StopLoss',
              ticksSL: '',
              positionId: String(row[1] || '')
            }
          })
        setMessage(`Detectadas ${tradesArr.length} operaciones. Redirigiendo...`)
        setTimeout(() => {
          sessionStorage.setItem('importedTrades', JSON.stringify(tradesArr))
          sessionStorage.setItem('importPlatform', 'mt5')
          if (onBack) onBack()
          else window.history.back()
        }, 1000)
      } catch (err) {
        setError('Error procesando MT5: ' + err.message)
        setImporting(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // ---------- Tradovate ----------
  const handleImportTradovate = () => {
    if (!file) return
    setImporting(true)
    setError('')
    setMessage('Procesando archivo CSV Tradovate...')
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target.result
        const lines = text.trim().split(/\r?\n/)
        if (lines.length < 2) { setError('CSV vacío'); setImporting(false); return }
        // Cabecera
        // 0:Position ID, 1:Timestamp, 2:Trade Date, 3:Net Pos, 4:Net Price,
        // 5:Bought, 6:Avg. Buy, 7:Sold, 8:Avg. Sell, 9:Account,
        // 10:Contract, 11:Product, 12:Product Description, ...
        // 19:Paired Qty, 20:Buy Price, 21:Sell Price, 22:P/L,
        // 23:Currency, 24:Bought Timestamp, 25:Sold Timestamp
        const groups = {}
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',')
          const posId = (cols[0] || '').trim()
          if (!posId) continue
          if (!groups[posId]) groups[posId] = []
          groups[posId].push(cols)
        }
        const tradesArr = []
        for (const [posId, rows] of Object.entries(groups)) {
          let totalQty = 0
          let weightedBuySum = 0
          let weightedSellSum = 0
          let totalProfit = 0
          let firstBuyTs = null
          let firstSellTs = null
          let symbol = ''
          for (const cols of rows) {
            const buyQty = parseFloat(cols[5] || '0')
            const sellQty = parseFloat(cols[7] || '0')
            const pairedQty = parseFloat(cols[19] || '0')
            const buyPrice = parseFloat(cols[20] || '0')
            const sellPrice = parseFloat(cols[21] || '0')
            const pl = parseFloat(cols[22] || '0')
            const bts = (cols[24] || '').trim()
            const sts = (cols[25] || '').trim()
            if (!symbol) symbol = (cols[11] || cols[10] || '').trim()
            if (buyQty > 0 && bts) {
              if (!firstBuyTs || new Date(bts) < new Date(firstBuyTs)) firstBuyTs = bts
            }
            if (sellQty > 0 && sts) {
              if (!firstSellTs || new Date(sts) < new Date(firstSellTs)) firstSellTs = sts
            }
            if (pairedQty > 0) {
              totalQty += pairedQty
              if (buyPrice) weightedBuySum += buyPrice * pairedQty
              if (sellPrice) weightedSellSum += sellPrice * pairedQty
            }
            totalProfit += pl
          }
          const avgEntry = totalQty > 0 ? weightedBuySum / totalQty : 0
          const avgExit = totalQty > 0 ? weightedSellSum / totalQty : 0
          const openTs = firstBuyTs || firstSellTs || ''
          const date = openTs ? new Date(openTs).toISOString() : new Date().toISOString()
          const isLong = (firstBuyTs && firstSellTs)
            ? new Date(firstBuyTs) <= new Date(firstSellTs)
            : totalProfit >= 0
          if (symbol && totalQty > 0) {
            const sessionName = detectSession(openTs || date)
            tradesArr.push({
              date,
              symbol,
              type: isLong ? 'long' : 'short',
              entryPrice: parseFloat(avgEntry.toFixed(8)),
              exitPrice: parseFloat(avgExit.toFixed(8)),
              quantity: parseFloat(totalQty.toFixed(8)),
              fees: 0,
              profit: parseFloat(totalProfit.toFixed(8)),
              notes: 'Importado desde Tradovate',
              beneficio: parseFloat(totalProfit.toFixed(8)),
              beneficioNeto: parseFloat(totalProfit.toFixed(8)),
              cantidad: parseFloat(totalQty.toFixed(8)),
              sesion: sessionName,
              resultado: totalProfit >= 0 ? 'TakeProfit' : 'StopLoss',
              ticksSL: '',
              positionId: posId,
              ratio: ''
            })
          }
        }
        setMessage(`Detectadas ${tradesArr.length} operaciones reales. Redirigiendo...`)
        setTimeout(() => {
          sessionStorage.setItem('importedTrades', JSON.stringify(tradesArr))
          sessionStorage.setItem('importPlatform', 'tradovate')
          if (onBack) onBack()
          else window.history.back()
        }, 1000)
      } catch (err) {
        setError('Error procesando Tradovate: ' + err.message)
        setImporting(false)
      }
    }
    reader.readAsText(file)
  }

  // ---------- FX Replay (Backtest) ----------
  const handleImportFXReplay = () => {
    if (!file) return
    setImporting(true)
    setError('')
    setMessage('Procesando archivo FX Replay...')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target.result
        const lines = text.trim().split(/\r?\n/)
        if (lines.length < 2) { setError('CSV vacío'); setImporting(false); return }
        const header = lines[0].split(',').map(h => h.trim())
        const tradesArr = []
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',')
          if (cols.length < header.length) continue
          const get = (col) => { const idx = header.indexOf(col); return idx >= 0 ? cols[idx].trim() : '' }
          const id = get('id')
          const dateStart = get('dateStart')
          const pair = get('pair')
          const side = get('side')
          const entryPrice = parseFloat(get('entryPrice')) || 0
          const avgClosePrice = parseFloat(get('avgClosePrice')) || 0
          const amount = parseFloat(get('amount')) || 0
          const rPnL = parseFloat(get('rPnL')) || 0
          const initialSL = parseFloat(get('initialSL') || get('initalSL')) || 0
          const idealTP = parseFloat(get('idealTP')) || 0
          let ratio = ''
          if (entryPrice && initialSL && idealTP) {
            const denom = entryPrice - initialSL
            if (denom !== 0) ratio = ((idealTP - entryPrice) / denom).toFixed(2)
          }
          const isoDateStr = dateStart.replace(/\//g, '-')
          const date = new Date(isoDateStr).toISOString()
          const symbol = pair ? pair.split(':')[1] || pair : ''
          const type = side === 'buy' ? 'long' : 'short'
          tradesArr.push({
            id: id ? parseInt(id) : Date.now(),
            date,
            symbol,
            type,
            entryPrice,
            initialSL,
            idealTP,
            exitPrice: avgClosePrice,
            quantity: amount,
            fees: 0,
            profit: rPnL,
            notes: 'Importado desde FX Replay',
            ratio,
            beneficio: rPnL,
            beneficioNeto: rPnL,
            cantidad: amount,
            sesion: detectSession(dateStart),
            resultado: rPnL >= 0 ? 'TakeProfit' : 'StopLoss',
            ticksSL: '',
            positionId: String(id || '')
          })
        }
        setMessage(`Detectadas ${tradesArr.length} operaciones. Redirigiendo...`)
        setTimeout(() => {
          sessionStorage.setItem('importedTrades', JSON.stringify(tradesArr))
          sessionStorage.setItem('importPlatform', 'fxreplay')
          if (onBack) onBack()
          else window.history.back()
        }, 1000)
      } catch (err) {
        setError('Error procesando FX Replay: ' + err.message)
        setImporting(false)
      }
    }
    reader.readAsText(file)
  }

  // ---------- cTrader ----------
  const handleImportCTrader = () => {
    if (!file) return
    setImporting(true)
    setError('')
    setMessage('Procesando archivo XLSX cTrader...')
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const ws = workbook.Sheets['Records']
        if (!ws) { setError('No se encontró la hoja "Records"'); setImporting(false); return }
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
        const tradesArr = rows.slice(1).filter(r => r[0] && typeof r[0] === 'string').map(row => {
          const symbol = (row[0] || '').trim()
          const typeRaw = (row[1] || '').toString().toLowerCase()
          const type = typeRaw === 'comprar' ? 'long' : 'short'
          const closeTimeStr = (row[2] || '').toString().trim()
          const [datePart, timePart] = closeTimeStr.split(' ')
          const [d, m, y] = datePart.split('/')
          const isoDate = `${y}-${m}-${d}T${timePart}`
          const date = new Date(isoDate).toISOString()
          const entryPrice = parseFloat(row[3] || 0)
          const exitPrice = parseFloat(row[4] || 0)
          const quantity = parseFloat(row[5] || 0)
          const profit = parseFloat(row[7] || 0)
          return {
            date, symbol, type,
            entryPrice, exitPrice,
            quantity,
            fees: 0,
            profit,
            notes: 'Importado desde cTrader',
            sesion: detectSession(date),
            resultado: profit >= 0 ? 'TakeProfit' : 'StopLoss'
          }
        })
        setMessage(`Detectadas ${tradesArr.length} operaciones. Redirigiendo...`)
        setTimeout(() => {
          sessionStorage.setItem('importedTrades', JSON.stringify(tradesArr))
          sessionStorage.setItem('importPlatform', 'ctrader')
          if (onBack) onBack()
          else window.history.back()
        }, 1000)
      } catch (err) {
        setError('Error procesando cTrader: ' + err.message)
        setImporting(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImportJournex = () => {
    if (!file) return
    setImporting(true)
    setError('')
    setMessage('Procesando archivo Journex...')
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target.result
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
        if (!parsed.data || parsed.data.length === 0) { setError('CSV vacío'); setImporting(false); return }
        const baseId = Date.now()
        let counter = 0
        const tradesArr = parsed.data.map(row => {
          for (const f of ['entryPrice', 'exitPrice', 'initialSL', 'idealTP', 'profit', 'fees', 'beneficioNeto', 'ratio', 'cantidad', 'id']) {
            if (row[f] !== undefined && row[f] !== '') row[f] = Number(row[f])
          }
          if (row.tags && typeof row.tags === 'string') {
            try { row.tags = JSON.parse(row.tags) } catch { row.tags = [] }
          }
          if (!row.tags) row.tags = []
          if (!row.id) row.id = baseId + (counter++)
          if (!row.date) row.date = new Date().toISOString()
          if (!row.type) row.type = 'long'
          if (!row.sesion) row.sesion = detectSession(row.date)
          if (!row.resultado) row.resultado = (Number(row.profit) || 0) >= 0 ? 'TakeProfit' : 'StopLoss'
          row.notes = row.notes || 'Importado desde Journex'
          return row
        })
        setMessage(`Detectadas ${tradesArr.length} operaciones. Redirigiendo...`)
        setTimeout(() => {
          sessionStorage.setItem('importedTrades', JSON.stringify(tradesArr))
          sessionStorage.setItem('importPlatform', 'journex')
          if (onBack) onBack()
          else window.history.back()
        }, 1000)
      } catch (err) {
        setError('Error procesando Journex: ' + err.message)
        setImporting(false)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen bg-black text-base-content">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <button className="btn btn-ghost" onClick={() => { if (onBack) onBack(); else window.history.back(); }}>
            ← Volver
          </button>
          <h1 className="text-2xl font-extrabold text-primary" style={{ fontFamily: "'Inter', sans-serif" }}>
            {sessionType === 'Backtest' ? 'Importar Trades (FX Replay)' : 'Importar Trades'}
          </h1>
        </div>

        {message && (
          <div className="alert alert-info mb-4">
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {/* Live: MT5, Tradovate, cTrader y Journex */}
        {sessionType === 'Live' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* MT5 */}
            <div
              className={`card bg-gray-800 shadow-lg cursor-pointer border-2 transition-all ${selectedPlatform === 'mt5' ? 'border-primary' : 'border-transparent'}`}
              onClick={() => setSelectedPlatform('mt5')}
            >
              <div className="card-body">
                <div className="flex items-center gap-3 mb-2">
                  <img src={mt5Logo} alt="MetaTrader 5" className="h-10" />
                  <h2 className="card-title text-primary">MetaTrader 5</h2>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Archivo debe ser formato <strong>.xlsx</strong>. El sistema leerá la tabla "Posiciones" detectando columnas automáticamente.
                </p>
                {selectedPlatform === 'mt5' && (
                  <>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="file-input file-input-bordered w-full mb-2"
                    />
                    {file && <p className="text-xs text-gray-400 mb-2">{file.name}</p>}
                    <button
                      className="btn btn-primary w-full"
                      disabled={!file || importing}
                      onClick={(e) => { e.stopPropagation(); handleImportMT5() }}
                    >
                      {importing ? 'Importando...' : 'Importar desde MT5'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Tradovate */}
            <div
              className={`card bg-gray-800 shadow-lg cursor-pointer border-2 transition-all ${selectedPlatform === 'tradovate' ? 'border-primary' : 'border-transparent'}`}
              onClick={() => setSelectedPlatform('tradovate')}
            >
              <div className="card-body">
                <div className="flex items-center gap-3 mb-2">
                  <img src={tradovateLogo} alt="Tradovate" className="h-10" />
                  <h2 className="card-title text-primary">Tradovate</h2>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Archivo debe ser <strong>.csv</strong>. Debe contener columnas: Product, Avg. Buy, Avg. Sell, Paired Qty, P/L.
                </p>
                {selectedPlatform === 'tradovate' && (
                  <>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="file-input file-input-bordered w-full mb-2"
                    />
                    {file && <p className="text-xs text-gray-400 mb-2">{file.name}</p>}
                    <button
                      className="btn btn-primary w-full"
                      disabled={!file || importing}
                      onClick={(e) => { e.stopPropagation(); handleImportTradovate() }}
                    >
                      {importing ? 'Importando...' : 'Importar desde Tradovate'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* cTrader */}
            <div
              className={`card bg-gray-800 shadow-lg cursor-pointer border-2 transition-all ${selectedPlatform === 'ctrader' ? 'border-primary' : 'border-transparent'}`}
              onClick={() => setSelectedPlatform('ctrader')}
            >
              <div className="card-body">
                <div className="flex items-center gap-3 mb-2">
                  <img src={ctraderLogo} alt="cTrader" className="h-10" />
                  <h2 className="card-title text-primary">cTrader</h2>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Archivo debe ser <strong>.xlsx</strong> exportado de cTrader con la hoja "Records". Columnas: Símbolo, Dirección, Hora cierre, Precios, $ neto.
                </p>
                {selectedPlatform === 'ctrader' && (
                  <>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="file-input file-input-bordered w-full mb-2"
                    />
                    {file && <p className="text-xs text-gray-400 mb-2">{file.name}</p>}
                    <button
                      className="btn btn-primary w-full"
                      disabled={!file || importing}
                      onClick={(e) => { e.stopPropagation(); handleImportCTrader() }}
                    >
                      {importing ? 'Importando...' : 'Importar desde cTrader'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Journex */}
            <div
              className={`card bg-gray-800 shadow-lg cursor-pointer border-2 transition-all ${selectedPlatform === 'journex' ? 'border-primary' : 'border-transparent'}`}
              onClick={() => setSelectedPlatform('journex')}
            >
              <div className="card-body">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">📓</span>
                  <h2 className="card-title text-primary">Journex</h2>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Archivo <strong>.csv</strong> exportado desde Journex con el botón Exportar. Mantiene todos los campos.
                </p>
                {selectedPlatform === 'journex' && (
                  <>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="file-input file-input-bordered w-full mb-2"
                    />
                    {file && <p className="text-xs text-gray-400 mb-2">{file.name}</p>}
                    <button
                      className="btn btn-primary w-full"
                      disabled={!file || importing}
                      onClick={(e) => { e.stopPropagation(); handleImportJournex() }}
                    >
                      {importing ? 'Importando...' : 'Importar Journex'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Backtest: FX Replay + Journex */}
        {sessionType === 'Backtest' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div
              className={`card bg-gray-800 shadow-lg cursor-pointer border-2 transition-all ${selectedPlatform === 'fxreplay' || selectedPlatform === '' ? 'border-primary' : 'border-transparent'}`}
              onClick={() => setSelectedPlatform('fxreplay')}
            >
              <div className="card-body">
                <div className="flex items-center gap-3 mb-2">
                  <img src={fxreplayLogo} alt="FX Replay" className="h-10" />
                  <h2 className="card-title text-primary">FX Replay</h2>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Archivo debe ser <strong>.csv</strong> exportado de FX Replay. Se leerán columnas: id, dateStart, pair, side, entryPrice, avgClosePrice, amount, rPnL, initialSL, idealTP.
                </p>
                {(selectedPlatform === 'fxreplay' || selectedPlatform === '') && (
                  <>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="file-input file-input-bordered w-full mb-2"
                    />
                    {file && <p className="text-xs text-gray-400 mb-2">{file.name}</p>}
                    <button
                      className="btn btn-primary w-full"
                      disabled={!file || importing}
                      onClick={(e) => { e.stopPropagation(); handleImportFXReplay() }}
                    >
                      {importing ? 'Importando...' : 'Importar desde FX Replay'}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div
              className={`card bg-gray-800 shadow-lg cursor-pointer border-2 transition-all ${selectedPlatform === 'journex' ? 'border-primary' : 'border-transparent'}`}
              onClick={() => setSelectedPlatform('journex')}
            >
              <div className="card-body">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">📓</span>
                  <h2 className="card-title text-primary">Journex</h2>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Archivo <strong>.csv</strong> exportado desde Journex. Importa trades previamente exportados con todos sus campos.
                </p>
                {selectedPlatform === 'journex' && (
                  <>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="file-input file-input-bordered w-full mb-2"
                    />
                    {file && <p className="text-xs text-gray-400 mb-2">{file.name}</p>}
                    <button
                      className="btn btn-primary w-full"
                      disabled={!file || importing}
                      onClick={(e) => { e.stopPropagation(); handleImportJournex() }}
                    >
                      {importing ? 'Importando...' : 'Importar Journex'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ImportPage
