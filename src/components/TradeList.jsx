import React, { useState } from 'react'
import Papa from 'papaparse'

function TradeList({ trades, onDelete, onEdit, userSettings }) {
  const [showAll, setShowAll] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  const displayedTrades = showAll ? trades : trades.slice(0, 10)

  const handleExport = () => {
    const allKeys = new Set()
    for (const t of trades) {
      Object.keys(t).forEach(k => { if (k !== 'captura' && k !== 'screenshots') allKeys.add(k) })
    }
    const fields = Array.from(allKeys)
    const idIdx = fields.indexOf('id')
    if (idIdx > 0) { fields.splice(idIdx, 1); fields.unshift('id') }

    const cleanRows = trades.map(t => {
      const clean = {}
      for (const f of fields) {
        const val = t[f]
        if (val === null || val === undefined) clean[f] = ''
        else if (typeof val === 'object') clean[f] = JSON.stringify(val)
        else clean[f] = val
      }
      return clean
    })

    const csv = Papa.unparse({ fields, data: cleanRows })
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `journex_trades_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No hay operaciones registradas. ¡Añade tu primera operación!
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex justify-end mb-3">
        <button className="btn btn-sm btn-outline" onClick={handleExport}>
          Exportar CSV ({trades.length})
        </button>
      </div>
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Fecha</th>
                <th>Hora</th>
            <th>Símbolo</th>
            <th>Tipo</th>
            <th>Ratio</th>
            <th>{userSettings?.displayMode === 'R' ? 'Beneficio R' : 'Beneficio $'}</th>
<th>Comisiones</th>
<th>Beneficio Neto</th>
            <th>Sesión operativa</th>
            <th>Resultado</th>
            <th>Captura</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {displayedTrades.map((trade) => (
            <tr key={trade.id} className="hover">
              <td>{new Date(trade.date).toLocaleDateString('es-ES')}</td>
                      <td>{new Date(trade.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</td>
              <td className="font-bold">{trade.symbol}</td>
              <td>
                <span className={`badge ${trade.type === 'long' ? 'badge-success' : 'badge-error'}`}>
                  {trade.type === 'long' ? 'Long' : 'Short'}
                </span>
              </td>
              <td>{trade.ratio ? Number(trade.ratio).toFixed(2) : ''}</td>
              <td className={
                userSettings?.displayMode === 'R'
                  ? trade.resultado === 'BreakEven'
                    ? 'text-gray-400 font-bold'
                    : Number(trade.profit) >= 0
                    ? 'text-green-500 font-bold'
                    : 'text-red-500 font-bold'
                  : Number(trade.profit) >= 0
                  ? 'text-green-500 font-bold'
                  : 'text-red-500 font-bold'
              }>
                {userSettings?.displayMode === 'R'
                  ? trade.resultado === 'StopLoss'
                    ? '-1'
                    : (trade.resultado || '').toLowerCase().includes('even')
                    ? '0'
                    : trade.ratio
                    ? Number(trade.ratio).toFixed(2)
                    : '1'
                  : `$${Number(trade.profit).toFixed(2)}`}
              </td>
              <td className={Number(trade.fees) >= 0 ? 'text-green-500' : 'text-red-500'}>
                ${Number(trade.fees).toFixed(2)}
              </td>
              <td className={Number(trade.beneficioNeto) >= 0 ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                ${Number(trade.beneficioNeto).toFixed(2)}
              </td>
              <td>{trade.sesion}</td>
              <td>{trade.resultado}</td>
              <td>
                {trade.captura && trade.captura.startsWith('data:image') ? (
                  <img
                    src={trade.captura}
                    alt="Captura"
                    className="h-10 w-10 object-cover rounded cursor-pointer hover:opacity-80"
                    onClick={() => setPreviewImage(trade.captura)}
                  />
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td>
                <button
                  className="btn btn-xs btn-primary"
                  onClick={() => onEdit(trade)}
                >
                  ✏️
                </button>
                <button
                  className="btn btn-xs btn-error ml-1"
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de eliminar esta operación?')) {
                      onDelete(trade.id)
                    }
                  }}
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {trades.length > 10 && (
        <div className="mt-4 text-center">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Ver menos' : `Ver todo (${trades.length} operaciones)`}
          </button>
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-screen p-4">
            <img src={previewImage} alt="Captura completa" className="max-w-full max-h-screen object-contain rounded-lg" />
            <button
              className="absolute top-2 right-2 btn btn-circle btn-sm bg-base-100"
              onClick={() => setPreviewImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TradeList
