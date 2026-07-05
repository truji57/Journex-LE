import { useState } from 'react'
import * as XLSX from 'xlsx'
import { detectSession } from '../utils/tradeCalculations'
import { notify } from '../utils/toast'

export function useImportTrades({ trades, selectedSession, userSettings, importTrades }) {
  const [importing, setImporting] = useState(false)

  const handleImportFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)
    const isCsv = file.name.toLowerCase().endsWith('.csv')
    if (isCsv) {
      if (selectedSession?.type !== 'Backtest') {
        notify.error('Los archivos CSV son solo para sesiones Backtest')
        setImporting(false)
        return
      }
      const readerCsv = new FileReader()
      readerCsv.onload = (ev) => {
        try {
          const text = ev.target.result
          const lines = text.trim().split(/\r?\n/)
          if (lines.length < 2) { notify.error('CSV vacío'); setImporting(false); return }
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
            const sessions = userSettings?.sessions || []
            tradesArr.push({
              id: id ? parseInt(id) : Date.now(), date, symbol, type, entryPrice, initialSL, idealTP,
              exitPrice: avgClosePrice, quantity: amount, fees: 0, profit: rPnL,
              notes: 'Importado desde FXReplay', ratio, beneficio: rPnL,
              beneficioNeto: rPnL, cantidad: amount, sesion: detectSession(dateStart, sessions),
              resultado: rPnL >= 0 ? 'TakeProfit' : 'StopLoss', ticksSL: '',
              positionId: String(id || '')
            })
          }
          const existingIds = new Set(trades.map(t => t.positionId).filter(Boolean))
          let filtered = tradesArr.filter(t => !t.positionId || !existingIds.has(t.positionId))
          const seenIds = new Set()
          filtered = filtered.filter(t => {
            if (!t.positionId) return true
            if (seenIds.has(t.positionId)) return false
            seenIds.add(t.positionId)
            return true
          })
          if (filtered.length === 0) { notify.info('Todas las posiciones ya estaban registradas'); setImporting(false); return }
          if (filtered.length < tradesArr.length) notify.info(`Se omitieron ${tradesArr.length - filtered.length} posiciones duplicadas`)
          const ok = window.confirm(`Se han detectado ${filtered.length} posiciones nuevas. ¿Añadir al Journal?`)
          if (ok) importTrades(filtered)
          setImporting(false)
        } catch (err) { console.error(err); notify.error('Error CSV: ' + err.message); setImporting(false) }
      }
      readerCsv.readAsText(file)
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const ws = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
        const startIdx = rows.findIndex(r => r[0] === 'Posiciones')
        if (startIdx === -1) { notify.error('No se encontró tabla Posiciones'); setImporting(false); return }
        const dataStart = startIdx + 2
        const stopIdx = rows.findIndex((r, idx) => idx > startIdx && typeof r[0] === 'string' && (r[0].startsWith('Órdenes') || r[0].startsWith('Transacciones')))
        const dataRows = stopIdx === -1 ? rows.slice(dataStart) : rows.slice(dataStart, stopIdx)
        const dateRegex = /^\d{4}\.\d{2}\.\d{2}\s/
        const sessions = userSettings?.sessions || []
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
              date, symbol, type, entryPrice, initialSL, idealTP, exitPrice,
              quantity: volumen, fees: commission, profit, notes: 'Importado desde MT5', ratio,
              beneficio: profit, beneficioNeto: profit + commission, cantidad: volumen,
              sesion: detectSession(row[0], sessions), resultado: profit >= 0 ? 'TakeProfit' : 'StopLoss',
              ticksSL: '', positionId: String(row[1] || '')
            }
          })
        const existingIds = new Set(trades.map(t => t.positionId).filter(Boolean))
        let filtered = tradesArr.filter(t => !t.positionId || !existingIds.has(t.positionId))
        const seenIds = new Set()
        filtered = filtered.filter(t => {
          if (!t.positionId) return true
          if (seenIds.has(t.positionId)) return false
          seenIds.add(t.positionId)
          return true
        })
        if (filtered.length === 0) { notify.info('Todas las posiciones ya estaban registradas'); setImporting(false); return }
        if (filtered.length < tradesArr.length) notify.info(`Se omitieron ${tradesArr.length - filtered.length} posiciones duplicadas`)
        const ok = window.confirm(`Se han detectado ${filtered.length} posiciones nuevas. ¿Añadir al Journal?`)
        if (ok) importTrades(filtered)
        setImporting(false)
      } catch (err) { console.error(err); notify.error('Error Excel: ' + err.message); setImporting(false) }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  return { importing, handleImportFile }
}
