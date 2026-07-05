import React, { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, AreaChart, Area
} from 'recharts'
import { getNet, getValue } from '../utils/tradeCalculations'
import SummaryTable from './SummaryTable'

const InfoIcon = ({ tip }) => (
  <div className="tooltip tooltip-info" data-tip={tip}>
    <span className="inline-flex items-center justify-center w-4 h-4 text-xs border border-current rounded-full opacity-40 hover:opacity-90 cursor-help transition-opacity">
      i
    </span>
  </div>
)

function Dashboard({ trades, displayMode = 'dollar', initialCapital = 0, capitalMovements = [] }) {
  const [summaryView, setSummaryView] = useState('bySymbol')
  const [chartView, setChartView] = useState('cumulative')

  if (trades.length === 0) {
    return (
      <div className="stats shadow mb-8">
        <div className="stat">
          <div className="stat-title">Dashboard</div>
          <div className="stat-value text-primary">Sin datos</div>
          <div className="stat-desc">Añade operaciones para ver métricas</div>
        </div>
      </div>
    )
  }

  const totalProfit = trades.reduce((sum, t) => sum + getNet(t), 0)
  const totalFees = trades.reduce((sum, t) => sum + (Number(t.fees) || 0), 0)
  const totalResult = trades.reduce((sum, t) => sum + getValue(t, displayMode), 0)

  const winningTrades = trades.filter(t => getNet(t) > 0)
  const losingTrades = trades.filter(t => getNet(t) < 0)
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length * 100).toFixed(1) : 0
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + getNet(t), 0) / winningTrades.length : 0
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + getNet(t), 0) / losingTrades.length) : 0

  const winningTradesR = trades.filter(t => getValue(t, displayMode) > 0)
  const losingTradesR = trades.filter(t => getValue(t, displayMode) < 0)
  const avgWinR = winningTradesR.length > 0 ? winningTradesR.reduce((s,t) => s + getValue(t, displayMode), 0) / winningTradesR.length : 0
  const avgLossR = losingTradesR.length > 0 ? Math.abs(losingTradesR.reduce((s,t) => s + getValue(t, displayMode), 0) / losingTradesR.length) : 0

  const ratios = trades.map(t => parseFloat(t.ratio)).filter(r => !isNaN(r) && r > 0)
  const avgR = ratios.length > 0 ? (ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(2) : '0'
  const maxR = ratios.length > 0 ? Math.max(...ratios).toFixed(2) : '0'

  const grossProfit = winningTrades.reduce((sum, t) => sum + getNet(t), 0)
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + getNet(t), 0))
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? '∞' : '0')
  const expectancyPerTrade = trades.length > 0 ? (totalProfit / trades.length).toFixed(2) : 0

  const bestGain = trades.length > 0 ? Math.max(...trades.map(t => getNet(t))) : 0
  const worstLoss = trades.length > 0 ? Math.min(...trades.map(t => getNet(t))) : 0
  const bestGainR = trades.length > 0 ? Math.max(...trades.map(t => getValue(t, displayMode))) : 0
  const worstLossR = trades.length > 0 ? Math.min(...trades.map(t => getValue(t, displayMode))) : 0

  const sortedTrades = [...trades].sort((a,b) => new Date(a.date) - new Date(b.date))
  let maxTpStreak = 0, maxSlStreak = 0
  let curTp = 0, curSl = 0
  sortedTrades.forEach(t => {
    if (t.resultado === 'TakeProfit') { curTp += 1; maxTpStreak = Math.max(maxTpStreak, curTp); curSl = 0 }
    else if (t.resultado === 'StopLoss') { curSl += 1; maxSlStreak = Math.max(maxSlStreak, curSl); curTp = 0 }
    else { curTp = 0; curSl = 0 }
  })

  let cumEquity = 0, peakEquity = 0, lastPeakDate = null, maxStagnationDays = 0
  for (const t of sortedTrades) {
    cumEquity += getNet(t)
    if (cumEquity > peakEquity) {
      if (lastPeakDate) {
        const days = Math.floor((new Date(t.date) - new Date(lastPeakDate)) / (86400000))
        if (days > maxStagnationDays) maxStagnationDays = days
      }
      peakEquity = cumEquity
      lastPeakDate = t.date
    }
  }

  const totalTrades = trades.length
  const monthlyCount = {}
  trades.forEach(t => {
    const month = new Date(t.date).toLocaleString('es-ES', { month: 'short', year: '2-digit' })
    monthlyCount[month] = (monthlyCount[month] || 0) + 1
  })
  const numMonths = Object.keys(monthlyCount).length || 1
  const avgTradesPerMonth = (totalTrades / numMonths).toFixed(1)

  const weekCount = {}
  trades.forEach(t => {
    const d = new Date(t.date)
    const year = d.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const days = Math.floor((d - startOfYear) / (24*60*60*1000))
    const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7)
    const weekKey = `${year}-W${weekNum}`
    weekCount[weekKey] = (weekCount[weekKey] || 0) + 1
  })
  const numWeeks = Object.keys(weekCount).length || 1
  const avgTradesPerWeek = (totalTrades / numWeeks).toFixed(1)

  const dayCount = {}
  trades.forEach(t => {
    const day = new Date(t.date).toLocaleDateString('es-ES')
    dayCount[day] = (dayCount[day] || 0) + 1
  })
  const numDays = Object.keys(dayCount).length || 1
  const avgTradesPerDay = (totalTrades / numDays).toFixed(1)

  const buyCount = trades.filter(t => t.type === 'long').length
  const sellCount = trades.filter(t => t.type === 'short').length

  const sessionCounts = {}
  trades.forEach(t => {
    const sess = t.sesion || 'Desconocida'
    sessionCounts[sess] = (sessionCounts[sess] || 0) + 1
  })

  const symbolCounts = {}
  trades.forEach(t => {
    const sym = t.symbol || 'Desconocido'
    symbolCounts[sym] = (symbolCounts[sym] || 0) + 1
  })
  let preferredSymbol = '-', maxSymbolCount = 0
  Object.entries(symbolCounts).forEach(([sym, count]) => {
    if (count > maxSymbolCount) { maxSymbolCount = count; preferredSymbol = sym }
  })

  let chartData = [], balanceData = [], drawdownData = []
  if (trades.length > 0) {
    chartData = trades.slice().sort((a, b) => new Date(a.date) - new Date(b.date)).map(trade => ({
      date: new Date(trade.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
      profit: getValue(trade, displayMode),
      cumulative: 0
    }))
    let cumulative = 0
    chartData.forEach(item => { cumulative += item.profit; item.cumulative = parseFloat(cumulative.toFixed(2)) })

    const sortedForBalance = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
    let balance = Number(initialCapital) || 0
    const balanceEvents = []
    sortedForBalance.forEach(t => {
      balanceEvents.push({ date: new Date(t.date).toISOString(), net: getNet(t) })
    })
    ;(capitalMovements || []).forEach(m => {
      balanceEvents.push({ date: new Date(m.date).toISOString(), net: Number(m.amount) || 0, movementId: m.id })
    })
    balanceEvents.sort((a, b) => new Date(a.date) - new Date(b.date))
    balanceData = balanceEvents.map(e => {
      balance += e.net
      return { date: new Date(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }), balance: parseFloat(balance.toFixed(2)) }
    })

    let cum = 0, peak = 0
    drawdownData = sortedForBalance.map(trade => {
      cum += getNet(trade)
      if (cum > peak) peak = cum
      const drawdown = peak - cum
      return { date: new Date(trade.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }), drawdown: -parseFloat(drawdown.toFixed(2)) }
    })
  }

  const balances = balanceData.map(d => d.balance)
  const minBal = Math.min(...balances)
  const maxBal = Math.max(...balances)
  const margin = (maxBal - minBal) * 0.05 || 1
  const yDomain = [minBal - margin, maxBal + margin]

  let maxDrawdown = 0, peak = -Infinity
  chartData.forEach(item => {
    if (item.cumulative > peak) peak = item.cumulative
    const dd = peak - item.cumulative
    if (dd > maxDrawdown) maxDrawdown = dd
  })
  const maxDrawdownValue = maxDrawdown.toFixed(2)

  const calmarRatioDollar = maxDrawdown !== 0 ? (totalProfit / maxDrawdown) : (totalProfit > 0 ? Infinity : 0)

  const netValuesDollar = trades.map(t => getNet(t))
  const meanNetDollar = netValuesDollar.reduce((s, v) => s + v, 0) / (netValuesDollar.length || 1)
  const varianceNetDollar = netValuesDollar.reduce((s, v) => s + Math.pow(v - meanNetDollar, 2), 0) / (netValuesDollar.length || 1)
  const volatilityDollar = Math.sqrt(varianceNetDollar)
  const sharpeRatio = volatilityDollar > 0 ? ((totalProfit / trades.length) / volatilityDollar * Math.sqrt(252)).toFixed(2) : '0'

  const hourlyData = {}
  for (let h = 0; h < 24; h++) hourlyData[h] = { profit: 0, wins: 0, total: 0 }
  trades.forEach(t => {
    const hour = new Date(t.date).getHours()
    if (!hourlyData[hour]) hourlyData[hour] = { profit: 0, wins: 0, total: 0 }
    hourlyData[hour].profit += getNet(t)
    hourlyData[hour].total++
    if (getNet(t) > 0) hourlyData[hour].wins++
  })

  const breakevenCount = trades.filter(t => {
    const net = getNet(t)
    return (Math.abs(net) < 0.01) || (t.resultado && t.resultado.toLowerCase().includes('even'))
  }).length

  const sortedByDate = [...trades].sort((a,b) => new Date(a.date) - new Date(b.date))
  let maxLossStreakDollar = 0, curLossSumDollar = 0
  sortedByDate.forEach(t => {
    const net = getNet(t)
    if (net < 0) { curLossSumDollar += net; if (curLossSumDollar < maxLossStreakDollar) maxLossStreakDollar = curLossSumDollar }
    else { curLossSumDollar = 0 }
  })

  const monthlyData = {}
  trades.slice().sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(trade => {
    const month = new Date(trade.date).toLocaleString('es-ES', { month: 'short', year: '2-digit' })
    monthlyData[month] = (monthlyData[month] || 0) + getNet(trade)
  })
  const avgProfitPerMonthDollar = totalProfit / (Object.keys(monthlyData).length || 1)
  const monthlyChartData = Object.entries(monthlyData).map(([month, profit]) => ({ month, profit: parseFloat(profit.toFixed(2)) }))

  const dailyData = {}
  trades.slice().sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(trade => {
    const day = new Date(trade.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    dailyData[day] = (dailyData[day] || 0) + getNet(trade)
  })
  const dailyChartData = Object.entries(dailyData).map(([day, profit]) => ({ day, profit: parseFloat(profit.toFixed(2)) }))

  const symbolData = {}
  trades.forEach(trade => {
    const sym = trade.symbol || 'Desconocido'
    symbolData[sym] = (symbolData[sym] || 0) + getNet(trade)
  })
  const symbolChartData = Object.entries(symbolData).map(([symbol, profit]) => ({ symbol, profit: parseFloat(profit.toFixed(2)) }))

  return (
    <div className="mb-8 overflow-x-hidden">
      <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
      <div className="mb-4 flex items-center gap-2">
        <label className="font-medium">Tipo de gráfica:</label>
        <select value={chartView} onChange={e => setChartView(e.target.value)} className="select select-bordered">
          <option value="balance">Balance de cuenta</option>
          <option value="cumulative">Beneficio acumulado</option>
          <option value="drawdown">Drawdown</option>
        </select>
      </div>

      <div className="card bg-gray-900 mb-6">
        <div className="card-body">
          {chartView === 'balance' ? (
            <ResponsiveContainer width="100%" height={450}>
                <LineChart data={balanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={yDomain} tickFormatter={(value) => Math.round(value)} />
                  <Tooltip />
                  <ReferenceLine y={Number(initialCapital) || 0} stroke="#666" strokeDasharray="3 3" label="Capital inicial" />
                  <Line type="monotone" dataKey="balance" stroke="#10B981" strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>
          ) : chartView === 'drawdown' ? (
            <ResponsiveContainer width="100%" height={450}>
              <AreaChart data={drawdownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => '$' + Math.abs(value).toFixed(0)} />
                <Tooltip formatter={(value) => '$' + Math.abs(value).toFixed(2)} labelFormatter={(label) => 'Fecha: ' + label} />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" label="0" />
                <Area type="monotone" dataKey="drawdown" stroke="#EF4444" strokeWidth={2} dot={false} fill="#EF4444" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={450}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" label="0" />
                  <Line type="monotone" dataKey="cumulative" stroke="#F59E0B" strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Métricas Principales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Beneficio Total</span>
              <InfoIcon tip="Suma total del beneficio neto de todas las operaciones" />
            </div>
            <div className={`stat-value ${totalProfit >= 0 ? 'text-success' : 'text-error'}`}>
              {displayMode === 'dollar' ? `$${totalProfit.toFixed(2)}` : `${totalResult.toFixed(2)} R`}
            </div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Win Rate</span>
              <InfoIcon tip="Porcentaje de operaciones ganadoras sobre el total" />
            </div>
            <div className="stat-value text-primary">{winRate}%</div>
            <div className="stat-desc">{winningTrades.length} ganadas / {trades.length} total</div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Expectancy / Trade</span>
              <InfoIcon tip="Beneficio neto promedio por operación" />
            </div>
            <div className={`stat-value ${expectancyPerTrade >= 0 ? 'text-success' : 'text-error'}`}>
              {displayMode === 'dollar' ? `$${expectancyPerTrade}` : `${(totalResult/trades.length).toFixed(2)} R`}
            </div>
            <div className="stat-desc">Promedio por operación</div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Max Drawdown</span>
              <InfoIcon tip="Máxima caída desde un pico hasta el punto más bajo" />
            </div>
            <div className="stat-value text-error">-{displayMode === 'R' ? maxDrawdown.toFixed(2) + ' R' : '$' + maxDrawdownValue}</div>
            <div className="stat-desc">Máxima caída acumulada</div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Max Stagnation</span>
              <InfoIcon tip="Máximo número de días sin superar un máximo histórico de equity" />
            </div>
            <div className="stat-value text-warning">{maxStagnationDays} días</div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Total Trades</span>
              <InfoIcon tip="Número total de operaciones registradas" />
            </div>
            <div className="stat-value text-primary">{totalTrades}</div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Beneficio Promedio/Mes</span>
              <InfoIcon tip="Promedio de beneficio por mes con operaciones" />
            </div>
            <div className={`stat-value ${avgProfitPerMonthDollar >= 0 ? 'text-success' : 'text-error'}`}>
              {displayMode === 'dollar' ? `$${avgProfitPerMonthDollar.toFixed(2)}` : `${(totalResult/Object.keys(monthlyData).length || 1).toFixed(2)} R`}
            </div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Profit Factor</span>
              <InfoIcon tip="Ratio entre ganancias brutas y pérdidas brutas" />
            </div>
            <div className="stat-value text-primary">{profitFactor}</div>
            <div className="stat-desc">Ganancia / Pérdida</div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Rentabilidad</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Promedio Ganancia</span>
              <InfoIcon tip="Promedio de beneficio en operaciones ganadoras" />
            </div>
            <div className="stat-value text-success">{displayMode === 'dollar' ? `$${avgWin.toFixed(2)}` : `${avgWinR.toFixed(2)} R`}</div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Promedio Pérdida</span>
              <InfoIcon tip="Promedio de pérdida en operaciones perdedoras" />
            </div>
            <div className="stat-value text-error">{displayMode === 'dollar' ? `$${avgLoss.toFixed(2)}` : `${avgLossR.toFixed(2)} R`}</div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>RR Promedio</span>
              <InfoIcon tip="Ratio riesgo:recompensa promedio de las operaciones" />
            </div>
            <div className="stat-value text-primary">{avgR}</div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>RR Máximo</span>
              <InfoIcon tip="Mayor ratio riesgo:recompensa alcanzado" />
            </div>
            <div className="stat-value text-primary">{maxR}</div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Volatilidad Retornos</span>
              <InfoIcon tip="Desviación estándar de los retornos de las operaciones" />
            </div>
            <div className="stat-value text-primary">{volatilityDollar.toFixed(2)}</div>
            <div className="stat-desc">Desv. estándar</div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Total Comisiones</span>
              <InfoIcon tip="Suma total de comisiones pagadas en todas las operaciones" />
            </div>
            <div className="stat-value text-warning">-${Math.abs(totalFees).toFixed(2)}</div>
            <div className="stat-desc">Suma de fees</div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Sharpe Ratio</span>
              <InfoIcon tip="Rentabilidad ajustada al riesgo. Anualizado multiplicando por √252" />
            </div>
            <div className={`stat-value ${sharpeRatio > 0 ? 'text-success' : 'text-error'}`}>{sharpeRatio}</div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Rachas y Símbolo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Mejor Ganancia</span>
              <InfoIcon tip="Mayor beneficio neto en una sola operación" />
            </div>
            <div className={`stat-value ${displayMode === 'dollar' ? (bestGain >= 0 ? 'text-success' : 'text-error') : (bestGainR >= 0 ? 'text-success' : 'text-error')}`}>
              {displayMode === 'dollar' ? `$${bestGain.toFixed(2)}` : `${bestGainR.toFixed(2)} R`}
            </div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Mayor Pérdida</span>
              <InfoIcon tip="Mayor pérdida neta en una sola operación" />
            </div>
            <div className={`stat-value ${displayMode === 'dollar' ? (worstLoss < 0 ? 'text-error' : 'text-success') : (worstLossR < 0 ? 'text-error' : 'text-success')}`}>
              {displayMode === 'dollar' ? `$${worstLoss.toFixed(2)}` : `${worstLossR.toFixed(2)} R`}
            </div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Racha Máx. TPs</span>
              <InfoIcon tip="Máximo número consecutivo de take profits" />
            </div>
            <div className="stat-value text-success">{maxTpStreak}</div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Racha Máx. SLs</span>
              <InfoIcon tip="Máximo número consecutivo de stop losses" />
            </div>
            <div className="stat-value text-error">{maxSlStreak}</div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Calmar Ratio</span>
              <InfoIcon tip="Beneficio total dividido por el máximo drawdown" />
            </div>
            <div className={`stat-value ${calmarRatioDollar > 0 ? 'text-success' : 'text-error'}`}>
              {calmarRatioDollar === Infinity ? '∞' : calmarRatioDollar.toFixed(2)}
            </div>
            <div className="stat-desc">Beneficio / Max Drawdown</div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Operaciones Breakeven</span>
              <InfoIcon tip="Operaciones con beneficio neto cercano a cero" />
            </div>
            <div className="stat-value text-warning">{breakevenCount}</div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Racha Máx. Pérdidas ($)</span>
              <InfoIcon tip="Suma máxima acumulada de pérdidas consecutivas" />
            </div>
            <div className="stat-value text-error">${maxLossStreakDollar.toFixed(2)}</div>
          </div>

          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Símbolo Preferido</span>
              <InfoIcon tip="Símbolo con mayor número de operaciones" />
            </div>
            <div className="stat-value text-primary">{preferredSymbol}</div>
            <div className="stat-desc">Operaciones: {maxSymbolCount}</div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Frecuencia de Operaciones</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Avg Trades/Mes</span>
              <InfoIcon tip="Promedio de operaciones por mes calendario" />
            </div>
            <div className="stat-value text-primary">{avgTradesPerMonth}</div>
          </div>
          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Avg Trades/Semana</span>
              <InfoIcon tip="Promedio de operaciones por semana" />
            </div>
            <div className="stat-value text-primary">{avgTradesPerWeek}</div>
          </div>
          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Avg Trades/Dia</span>
              <InfoIcon tip="Promedio de operaciones por día con actividad" />
            </div>
            <div className="stat-value text-primary">{avgTradesPerDay}</div>
          </div>
          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Total Operaciones Win</span>
              <InfoIcon tip="Número total de operaciones con beneficio positivo" />
            </div>
            <div className="stat-value text-success">{winningTrades.length}</div>
          </div>
          <div className="stat bg-gray-900 rounded-box min-h-32">
            <div className="stat-title flex items-center gap-2">
              <span>Total Operaciones Loss</span>
              <InfoIcon tip="Número total de operaciones con beneficio negativo" />
            </div>
            <div className="stat-value text-error">{losingTrades.length}</div>
          </div>
        </div>
      </div>

      <div className="card bg-gray-900 mb-6">
        <div className="card-body">
          <h3 className="card-title mb-4">Heatmap Horario</h3>
          <p className="text-sm opacity-60 mb-4">Rendimiento por hora del día. Verde = beneficio positivo, Rojo = negativo. Entre paréntesis el winrate de esa hora.</p>
          <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
            {Array.from({ length: 24 }, (_, h) => {
              const d = hourlyData[h]
              const isProfitable = d.profit >= 0
              const intensity = Math.min(Math.abs(d.profit) / (Math.max(...Object.values(hourlyData).map(v => Math.abs(v.profit))) || 1), 1)
              return (
                <div
                  key={h}
                  className="rounded-lg p-2 text-center text-xs"
                  style={{
                    backgroundColor: isProfitable
                      ? `rgba(16, 185, 129, ${0.2 + intensity * 0.6})`
                      : `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`
                  }}
                  title={`${h}:00 - $${d.profit.toFixed(2)} | ${d.wins}/${d.total} winrate`}
                >
                  <div className="font-bold">{h}:00</div>
                  <div>${d.profit.toFixed(0)}</div>
                  {d.total > 0 && <div className="opacity-70">{d.wins}/{d.total} ({(d.wins / d.total * 100).toFixed(0)}%)</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card bg-gray-900">
          <div className="card-body">
            <h3 className="card-title">Distribución Buy vs Sell</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={[{ name: 'Buy (Long)', value: buyCount }, { name: 'Sell (Short)', value: sellCount }]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  <Cell key="cell-buy" fill="#10B981" />
                  <Cell key="cell-sell" fill="#EF4444" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card bg-gray-900">
          <div className="card-body">
            <h3 className="card-title">Distribución de Sesiones Operativas</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={Object.entries(sessionCounts).map(([name, value]) => ({ name, value }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {Object.entries(sessionCounts).map((_, idx) => (
                    <Cell key={`cell-session-${idx}`} fill={['#3B82F6','#10B981','#EF4444','#F59E0B','#8B5CF6'][idx % 5]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card bg-gray-900 mb-6">
        <div className="card-body">
          <h3 className="card-title">Beneficio por Símbolo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={symbolChartData} cursor={false}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="symbol" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="profit" name="Beneficio" maxBarSize={50}>
                {symbolChartData.map((entry, index) => (
                  <Cell key={`cell-symbol-${index}`} fill={entry.profit >= 0 ? '#10B981' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card bg-gray-900">
          <div className="card-body">
            <h3 className="card-title">Beneficio por Operación</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} cursor={false}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="profit" name="Beneficio">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10B981' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card bg-gray-900 lg:col-span-2">
          <div className="card-body">
            <h3 className="card-title">Resumen Mensual</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChartData} cursor={false}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="profit" fill="#8B5CF6" name="Beneficio Mensual" maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card bg-gray-900 lg:col-span-2">
          <div className="card-body">
            <h3 className="card-title">Beneficio por Día</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyChartData} cursor={false}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="profit" name="Beneficio Diario">
                  {dailyChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10B981' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <SummaryTable trades={trades} displayMode={displayMode} summaryView={summaryView} setSummaryView={setSummaryView} getProfit={(t) => getValue(t, displayMode)} />
    </div>
  )
}

export default Dashboard
