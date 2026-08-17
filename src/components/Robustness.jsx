import React, { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getNet, getValue } from '../utils/tradeCalculations'

function Robustness({ trades, displayMode = 'dollar' }) {
  const [removePercent, setRemovePercent] = useState(20)
  const [simulations, setSimulations] = useState(1000)
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)

  const tradeValues = useMemo(() => trades.map(t => getValue(t, displayMode)), [trades, displayMode])

  const runSimulation = () => {
    if (tradeValues.length < 5) return
    setRunning(true)

    const removeCount = Math.floor(tradeValues.length * (removePercent / 100))
    if (removeCount < 1) { setRunning(false); return }

    const sims = simulations
    const results = []

    for (let i = 0; i < sims; i++) {
      const indices = new Set()
      while (indices.size < removeCount) {
        indices.add(Math.floor(Math.random() * tradeValues.length))
      }
      const remaining = tradeValues.filter((_, idx) => !indices.has(idx))
      const totalProfit = remaining.reduce((s, v) => s + v, 0)
      const wins = remaining.filter(v => v > 0).length
      const losses = remaining.filter(v => v < 0).length
      const winRate = remaining.length > 0 ? (wins / remaining.length) * 100 : 0
      const grossProfit = remaining.filter(v => v > 0).reduce((s, v) => s + v, 0)
      const grossLoss = Math.abs(remaining.filter(v => v < 0).reduce((s, v) => s + v, 0))
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0)

      results.push({ totalProfit, winRate, profitFactor, remaining: remaining.length })
    }

    results.sort((a, b) => a.totalProfit - b.totalProfit)

    const meanProfit = results.reduce((s, r) => s + r.totalProfit, 0) / results.length
    const meanWR = results.reduce((s, r) => s + r.winRate, 0) / results.length
    const medianProfit = results[Math.floor(results.length / 2)].totalProfit
    const p5Profit = results[Math.floor(results.length * 0.05)].totalProfit
    const p95Profit = results[Math.floor(results.length * 0.95)].totalProfit
    const minProfit = results[0].totalProfit
    const maxProfit = results[results.length - 1].totalProfit
    const profitableCount = results.filter(r => r.totalProfit > 0).length
    const profitProb = ((profitableCount / results.length) * 100).toFixed(1)

    const originalTotal = tradeValues.reduce((s, v) => s + v, 0)
    const improvementCount = results.filter(r => r.totalProfit > originalTotal).length
    const improvementProb = ((improvementCount / results.length) * 100).toFixed(1)

    const binCount = 30
    const range = maxProfit - minProfit
    const binSize = range / binCount || 1
    const bins = {}
    results.forEach(r => {
      const binIdx = Math.min(Math.floor((r.totalProfit - minProfit) / binSize), binCount - 1)
      const binKey = (minProfit + binIdx * binSize).toFixed(2)
      bins[binKey] = (bins[binKey] || 0) + 1
    })
    const histogramData = Object.entries(bins)
      .map(([x, count]) => ({ x: parseFloat(x), count }))
      .sort((a, b) => a.x - b.x)

    setResult({
      meanProfit, meanWR, medianProfit, p5Profit, p95Profit, minProfit, maxProfit,
      profitProb, improvementProb, histogramData, originalTotal, removeCount
    })
    setRunning(false)
  }

  if (tradeValues.length < 5) {
    return (
      <div className="card bg-gray-900 shadow-lg">
        <div className="card-body text-center">
          <h2 className="card-title justify-center">Test de Robustez</h2>
          <p className="text-gray-400">Se necesitan al menos 5 operaciones.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card bg-gray-900 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">Test de Robustez</h2>
          <p className="text-sm text-gray-400 mb-4">
            Elimina aleatoriamente un porcentaje de trades y recalcula las métricas miles de veces para medir qué tan robusta es tu estrategia. Si quitando trades al azar sigues siendo rentable, tu ventaja es real.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="form-control">
              <label className="label"><span className="label-text">% de trades a eliminar</span></label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={removePercent}
                onChange={e => setRemovePercent(Math.min(90, Math.max(5, parseInt(e.target.value) || 20)))}
                min={5}
                max={90}
              />
              <span className="text-xs text-gray-500 mt-1">Se eliminarán {Math.floor(tradeValues.length * (removePercent / 100))} de {tradeValues.length} trades</span>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Nº de Simulaciones</span></label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={simulations}
                onChange={e => setSimulations(Math.max(100, parseInt(e.target.value) || 1000))}
                min={100}
                max={10000}
              />
            </div>
            <div className="flex items-end">
              <button
                className="btn btn-primary w-full"
                onClick={runSimulation}
                disabled={running}
              >
                {running ? 'Simulando...' : 'Ejecutar Simulación'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat bg-gray-900 rounded-box min-h-24">
              <div className="stat-title text-xs">Beneficio Original</div>
              <div className={`stat-value text-sm ${result.originalTotal >= 0 ? 'text-success' : 'text-error'}`}>
                {displayMode === 'R' ? `${result.originalTotal.toFixed(2)} R` : `$${result.originalTotal.toFixed(2)}`}
              </div>
              <div className="stat-desc text-xs">{tradeValues.length} trades</div>
            </div>
            <div className="stat bg-gray-900 rounded-box min-h-24">
              <div className="stat-title text-xs">Beneficio Promedio (tras quitar)</div>
              <div className={`stat-value text-sm ${result.meanProfit >= 0 ? 'text-success' : 'text-error'}`}>
                {displayMode === 'R' ? `${result.meanProfit.toFixed(2)} R` : `$${result.meanProfit.toFixed(2)}`}
              </div>
              <div className="stat-desc text-xs">{result.removeCount} trades eliminados</div>
            </div>
            <div className="stat bg-gray-900 rounded-box min-h-24">
              <div className="stat-title text-xs">Probabilidad de Beneficio</div>
              <div className={`stat-value text-sm ${Number(result.profitProb) >= 50 ? 'text-success' : 'text-error'}`}>
                {result.profitProb}%
              </div>
              <div className="stat-desc text-xs">tras eliminar {removePercent}%</div>
            </div>
            <div className="stat bg-gray-900 rounded-box min-h-24">
              <div className="stat-title text-xs">Peor Caso (P5)</div>
              <div className={`stat-value text-sm ${result.p5Profit >= 0 ? 'text-success' : 'text-error'}`}>
                {displayMode === 'R' ? `${result.p5Profit.toFixed(2)} R` : `$${result.p5Profit.toFixed(2)}`}
              </div>
              <div className="stat-desc text-xs">percentil 5%</div>
            </div>
            <div className="stat bg-gray-900 rounded-box min-h-24">
              <div className="stat-title text-xs">Mejor Caso (P95)</div>
              <div className="stat-value text-sm text-success">
                {displayMode === 'R' ? `${result.p95Profit.toFixed(2)} R` : `$${result.p95Profit.toFixed(2)}`}
              </div>
              <div className="stat-desc text-xs">percentil 95%</div>
            </div>
            <div className="stat bg-gray-900 rounded-box min-h-24">
              <div className="stat-title text-xs">Win Rate Promedio</div>
              <div className="stat-value text-sm text-primary">{result.meanWR.toFixed(1)}%</div>
              <div className="stat-desc text-xs">tras eliminación</div>
            </div>
            <div className="stat bg-gray-900 rounded-box min-h-24">
              <div className="stat-title text-xs">Casos que Mejoran</div>
              <div className="stat-value text-sm text-warning">{result.improvementProb}%</div>
              <div className="stat-desc text-xs">mejor que el original</div>
            </div>
            <div className="stat bg-gray-900 rounded-box min-h-24">
              <div className="stat-title text-xs">Rango</div>
              <div className="stat-value text-sm">
                {displayMode === 'R'
                  ? `${result.minProfit.toFixed(1)} / ${result.maxProfit.toFixed(1)} R`
                  : `$${result.minProfit.toFixed(0)} / $${result.maxProfit.toFixed(0)}`}
              </div>
              <div className="stat-desc text-xs">min / max</div>
            </div>
          </div>

          <div className="card bg-gray-900 shadow-lg">
            <div className="card-body">
              <h3 className="card-title">Distribución de Beneficio Total</h3>
              <p className="text-xs text-gray-400 mb-2">
                {simulations} simulaciones eliminando {removePercent}% de {tradeValues.length} trades ({result.removeCount} trades) cada vez
              </p>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={result.histogramData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    tickFormatter={v => displayMode === 'R' ? v.toFixed(1) : '$' + v.toFixed(0)}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [value, 'Frecuencia']}
                    labelFormatter={v => `Beneficio: ${displayMode === 'R' ? Number(v).toFixed(2) + ' R' : '$' + Number(v).toFixed(2)}`}
                  />
                  <Bar dataKey="count" name="Frecuencia" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Robustness
