import React, { useState, useMemo } from 'react'

function Calendar({ trades, displayMode }) {
  const [view, setView] = useState('monthly') // 'monthly' o 'annual'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedDay, setSelectedDay] = useState(null) // dateStr del día seleccionado

  // Helper to get value according to display mode
  const getValue = (t) => {
    if (displayMode === 'R') {
      if (t.resultado && t.resultado.toLowerCase().includes('even')) return 0;
      if (t.resultado && t.resultado.toLowerCase().includes('loss')) return -1;
      return t.ratio ? Number(t.ratio) : 1;
    }
    if (t.beneficioNeto !== undefined && t.beneficioNeto !== null) return Number(t.beneficioNeto);
    return (Number(t.profit) || 0) + (Number(t.fees) || 0);
  };

  // Calcular datos por día
  const dailyData = useMemo(() => {
    const data = {}
    trades.forEach(t => {
      const dateStr = new Date(t.date).toLocaleDateString('es-ES')
      if (!data[dateStr]) {
        data[dateStr] = { profit: 0, count: 0, trades: [] }
      }
      const net = getValue(t)
      data[dateStr].profit += net
      data[dateStr].count += 1
      data[dateStr].trades.push(t)
    })
    return data
  }, [trades, displayMode])

  // Obtener días del mes
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay()
    return (day + 6) % 7  // Lunes = 0, Domingo = 6
  }

  // Renderizado mensual
  const renderMonthly = () => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth)
    const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth)
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

    // Construir array de celdas (vacías + días)
    const cells = []
    for (let i = 0; i < firstDay; i++) {
      cells.push({ type: 'empty' })
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day)
      const dateStr = date.toLocaleDateString('es-ES')
      const dayData = dailyData[dateStr]
      cells.push({
        type: 'day',
        day,
        dateStr,
        dayData,
        hasData: dayData && dayData.count > 0,
        profit: dayData ? dayData.profit : 0
      })
    }

    // Agrupar en semanas (7 celdas por semana)
    const weeks = []
    for (let i = 0; i < cells.length; i += 7) {
      const week = cells.slice(i, i + 7)
      while (week.length < 7) {
        week.push({ type: 'empty' })
      }
      weeks.push(week)
    }

    return (
      <>
        <div>
          <div className="flex items-center justify-between mb-4">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                if (selectedMonth === 0) {
                  setSelectedMonth(11)
                  setSelectedYear(selectedYear - 1)
                } else {
                  setSelectedMonth(selectedMonth - 1)
                }
              }}
            >
              ←
            </button>
            <h3 className="text-lg font-semibold">{monthNames[selectedMonth]} {selectedYear}</h3>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                if (selectedMonth === 11) {
                  setSelectedMonth(0)
                  setSelectedYear(selectedYear + 1)
                } else {
                  setSelectedMonth(selectedMonth + 1)
                }
              }}
            >
              →
            </button>
          </div>

          <div className="grid grid-cols-8 gap-4 mb-2">
            {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom','Resultado'].map(d => (
              <div key={d} className="text-center text-xs text-gray-500 font-bold">{d}</div>
            ))}
          </div>

          <div className="space-y-4">
            {weeks.map((week, weekIndex) => {
              const weekProfit = week.reduce((sum, cell) => {
                if (cell.type === 'day' && cell.hasData) {
                  return sum + cell.profit
                }
                return sum
              }, 0)
              const hasWeekData = week.some(cell => cell.type === 'day' && cell.hasData)

              return (
                <div key={weekIndex} className="grid grid-cols-8 gap-4">
                  {week.map((cell, cellIndex) => {
                    if (cell.type === 'empty') {
                      return <div key={`empty-${weekIndex}-${cellIndex}`} className="p-2 min-h-24"></div>
                    }
                    let bgColor = 'bg-gray-800'
                    if (cell.hasData) {
                      bgColor = cell.profit >= 0 ? 'bg-green-900 hover:bg-green-800' : 'bg-red-900 hover:bg-red-800'
                    }
                    return (
                      <div
                        key={cell.day}
                        className={`p-2 min-h-24 flex flex-col cursor-pointer transition-colors rounded-lg ${bgColor} ${cell.hasData ? 'border border-gray-700' : ''} ${selectedDay === cell.dateStr ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => {
                          if (cell.hasData) {
                            setSelectedDay(prev => prev === cell.dateStr ? null : cell.dateStr)
                          } else {
                            setSelectedDay(null)
                          }
                        }}
                      >
                        <div className="text-sm text-gray-400 text-left">{cell.day}</div>
                        <div className="flex-1 flex items-center justify-center">
                          {cell.hasData && (
                            <div className="text-center">
                              <div className={`text-sm font-bold ${cell.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {displayMode === 'R' ? `${cell.profit >= 0 ? '+' : ''}${cell.profit.toFixed(2)} R` : `${cell.profit >= 0 ? '+' : ''}$${cell.profit.toFixed(2)}`}
                              </div>
                              <div className="text-xs text-gray-400">
                                {cell.dayData.count} trades
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                    <div className={`ml-6 p-2 min-h-24 flex flex-col items-center justify-center rounded-lg border border-gray-700 ${hasWeekData ? (weekProfit >= 0 ? 'bg-green-900' : 'bg-red-900') : 'bg-gray-800'}`}>
                      <div className={`text-sm font-bold ${hasWeekData ? (weekProfit >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}`}>
                        {hasWeekData ? (weekProfit >= 0 ? '+' : '') + weekProfit.toFixed(2) + (displayMode === 'R' ? ' R' : '') : '-'}
                      </div>
                      <div className="text-xs text-gray-500">semana</div>
                    </div>
                </div>
              )
            })}
          </div>
        </div>
        {selectedDay && dailyData[selectedDay] && (
          <div className="mt-4 p-4 bg-gray-800 rounded-lg">
            <h4 className="text-lg font-semibold mb-2">Operaciones del {selectedDay}</h4>
            <table className="table table-zebra w-full">
              <thead>
                <tr><th>Símbolo</th><th>Tipo</th><th>Beneficio</th><th>Sesion operativa</th><th>Resultado</th></tr>
              </thead>
              <tbody>
                {dailyData[selectedDay].trades.map(tr => (
                  <tr key={tr.id}>
                    <td>{tr.symbol}</td>
                    <td>{tr.type}</td>
                    <td className={getValue(tr) >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {displayMode === 'R' ? `${getValue(tr).toFixed(2)} R` : `$${getValue(tr).toFixed(2)}`}
                    </td>
                    <td>{tr.sesion}</td>
                    <td>{tr.resultado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    )
  }
// Renderizado anual
  const renderAnnual = () => {
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    const months = []

    for (let month = 0; month < 12; month++) {
      const monthTrades = trades.filter(t => {
        const d = new Date(t.date)
        return d.getFullYear() === selectedYear && d.getMonth() === month
      })

      const monthProfit = monthTrades.reduce((sum, t) => {
        const net = getValue(t)
        return sum + net
      }, 0)

      const hasData = monthTrades.length > 0
      let bgColor = 'bg-gray-800'
      if (hasData) {
        bgColor = monthProfit >= 0 ? 'bg-green-900' : 'bg-red-900'
      }

      months.push(
        <div
          key={month}
          className={`p-4 min-h-28 rounded-box text-center cursor-pointer transition-transform hover:scale-105 ${bgColor} border border-gray-700`}
          onClick={() => { setSelectedMonth(month); setView('monthly') }}
        >
          <div className="flex flex-col items-center h-full">
            <div className="text-lg font-bold w-full text-center">{monthNames[month]}</div>
            <div className="flex-1 flex items-center justify-center w-full">
              {hasData && (
                <div className={`text-lg font-semibold ${monthProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {displayMode === 'R' ? `${monthProfit >= 0 ? '+' : ''}${monthProfit.toFixed(2)} R` : `${monthProfit >= 0 ? '+' : ''}$${monthProfit.toFixed(2)}` }
                </div>
              )}
            </div>
            {hasData && (
              <div className="text-xs text-gray-400">
                {monthTrades.length} trades
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button className="btn btn-sm btn-ghost" onClick={() => setSelectedYear(selectedYear - 1)}>←</button>
          <h3 className="text-lg font-semibold">Año {selectedYear}</h3>
          <button className="btn btn-sm btn-ghost" onClick={() => setSelectedYear(selectedYear + 1)}>→</button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {months}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          className={view === 'monthly' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
          onClick={() => setView('monthly')}
        >
          Vista Mensual
        </button>
        <button
          className={view === 'annual' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
          onClick={() => setView('annual')}
        >
          Vista Anual
        </button>
      </div>

      {view === 'monthly' ? renderMonthly() : renderAnnual()}
    </div>
  )
}

export default Calendar