import React from 'react'

function SummaryTable({ trades, displayMode, summaryView, setSummaryView, getProfit }) {
  const summaryRows = (() => {
    if (trades.length === 0) return []
    const groups = {}
    trades.forEach(t => {
      let key
      switch (summaryView) {
        case 'bySymbol': key = t.symbol || 'Desconocido'; break
        case 'byDay': key = new Date(t.date).toLocaleString('es-ES', { weekday: 'long' }); break
        case 'byMonth': key = new Date(t.date).toLocaleString('es-ES', { month: 'short', year: 'numeric' }); break
        case 'byQuarter': {
          const d = new Date(t.date)
          const q = Math.floor(d.getMonth()/3)+1
          key = `Q${q} ${d.getFullYear()}`
          break
        }
        case 'bySession': key = t.sesion || 'Sin sesión'; break
        default: key = 'Otro'
      }
      if (!groups[key]) groups[key] = { trades: 0, profit: 0, wins: 0, grossProfit: 0, grossLoss: 0 }
      groups[key].trades++
      const net = getProfit(t)
      groups[key].profit += net
      if (net > 0) { groups[key].wins++; groups[key].grossProfit += net }
      else { groups[key].grossLoss += Math.abs(net) }
    })
    return Object.entries(groups).map(([label, d]) => ({
      label,
      trades: d.trades,
      winRate: d.trades ? ((d.wins/d.trades)*100).toFixed(1) : '0.0',
      profit: d.profit.toFixed(2),
      profitFactor: d.grossLoss > 0 ? (d.grossProfit / d.grossLoss).toFixed(2) : (d.grossProfit > 0 ? '∞' : '0')
    }))
  })()

  return (
    <div className="card bg-gray-900 mt-6 mb-6">
      <div className="card-body">
        <h3 className="card-title">Tabla Resumen</h3>
        <select className="select select-bordered w-full max-w-xs mb-4" value={summaryView} onChange={(e) => setSummaryView(e.target.value)}>
          <option value="bySymbol">Por símbolo</option>
          <option value="byDay">Por día de semana</option>
          <option value="byMonth">Por mes</option>
          <option value="byQuarter">Por trimestre</option>
          <option value="bySession">Por sesión</option>
        </select>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Trades</th>
                <th>Win Rate %</th>
                <th>Profit</th>
                <th>Profit Factor</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row, i) => (
                <tr key={i}>
                  <td className="font-medium">{row.label}</td>
                  <td>{row.trades}</td>
                  <td>{row.winRate}%</td>
                  <td className={row.profit >= 0 ? 'text-success' : 'text-error'}>
                    {displayMode === 'dollar' ? `$${row.profit}` : `${row.profit} R`}
                  </td>
                  <td className={parseFloat(row.profitFactor) >= 1 ? 'text-success' : 'text-error'}>{row.profitFactor}</td>
                </tr>
              ))}
              {summaryRows.length === 0 && (
                <tr><td colSpan="5" className="text-center opacity-60">No hay datos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default SummaryTable
