import React from 'react'

function FilterBar({
  trades,
  symbolFilter, setSymbolFilter,
  sessionFilter, setSessionFilter,
  weekdayFilter, setWeekdayFilter,
  monthFilter, setMonthFilter,
  yearFilter, setYearFilter,
  dateStart, setDateStart,
  dateEnd, setDateEnd,
  clearFilters,
  uniqueSessions, uniqueWeekdays, uniqueMonths, uniqueYears
}) {
  const hasFilters = symbolFilter || sessionFilter || weekdayFilter || monthFilter || yearFilter || dateStart || dateEnd

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 border border-transparent rounded-box">
      <span className="text-sm font-bold mr-2">Filtros rápidos:</span>
      <select className={`select select-bordered select-sm ${symbolFilter ? 'border-primary' : ''}`} value={symbolFilter} onChange={e => setSymbolFilter(e.target.value)}>
        <option value="">Todos símbolos</option>
        {Array.from(new Set(trades.map(t => t.symbol).filter(Boolean))).map(sym => (
          <option key={sym} value={sym}>{sym}</option>
        ))}
      </select>
      <select className={`select select-bordered select-sm ${sessionFilter ? 'border-primary' : ''}`} value={sessionFilter} onChange={e => setSessionFilter(e.target.value)}>
        <option value="">Todas sesiones</option>
        {uniqueSessions.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select className={`select select-bordered select-sm ${weekdayFilter ? 'border-primary' : ''}`} value={weekdayFilter} onChange={e => setWeekdayFilter(e.target.value)}>
        <option value="">Todos días</option>
        {uniqueWeekdays.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      <select className={`select select-bordered select-sm ${monthFilter ? 'border-primary' : ''}`} value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
        <option value="">Todos meses</option>
        {uniqueMonths.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <select className={`select select-bordered select-sm ${yearFilter ? 'border-primary' : ''}`} value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
        <option value="">Todos años</option>
        {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <input type="date" className={`input input-bordered input-sm ${dateStart ? 'border-primary' : ''}`} value={dateStart} onChange={e => setDateStart(e.target.value)} />
      <span className="text-xs">a</span>
      <input type="date" className={`input input-bordered input-sm ${dateEnd ? 'border-primary' : ''}`} value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
      <button className={`btn btn-xs ${hasFilters ? 'btn-primary' : 'btn-ghost text-xs'}`} onClick={clearFilters}>
        Limpiar filtros
      </button>
    </div>
  )
}

export default FilterBar
