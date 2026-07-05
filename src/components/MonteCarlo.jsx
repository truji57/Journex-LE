import React, { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

function MonteCarlo({ trades, displayMode = 'dollar' }) {
  const [simulations, setSimulations] = useState(1000)
  const [sequenceLength, setSequenceLength] = useState(0)
  const [winRateInput, setWinRateInput] = useState(null)
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)

  const getValue = (t) => {
    if (displayMode === 'R') {
      if (t.resultado && t.resultado.toLowerCase().includes('even')) return 0
      if (t.resultado && t.resultado.toLowerCase().includes('loss')) return -1
      return t.ratio ? Number(t.ratio) : 1
    }
    if (t.beneficioNeto !== undefined && t.beneficioNeto !== null) return Number(t.beneficioNeto)
    return (Number(t.profit) || 0) + (Number(t.fees) || 0)
  }

  // Valores de todas las operaciones (excluye ceros)
  const tradeValues = useMemo(() => trades.map(t => getValue(t)).filter(v => v !== 0), [trades, displayMode])
  // Valores ganadores y perdedores por separado
  const winningValues = useMemo(() => trades.filter(t => getValue(t) > 0).map(t => getValue(t)), [trades, displayMode])
  const losingValues = useMemo(() => trades.filter(t => getValue(t) < 0).map(t => getValue(t)), [trades, displayMode])
  // Win rate del journal (porcentaje)
  const defaultWinRate = useMemo(() => {
    const total = tradeValues.length
    const win = winningValues.length
    return total > 0 ? (win / total) * 100 : 0
  }, [tradeValues.length, winningValues.length])

  // Campos editables opcionales
  const [avgWinInput, setAvgWinInput] = useState(null)
  const [avgLossInput, setAvgLossInput] = useState(null)

  // Valores promedio de ganancia y pérdida (para mostrar)
  const avgWinValue = useMemo(() => {
    if (winningValues.length === 0) return 0
    return winningValues.reduce((s, v) => s + v, 0) / winningValues.length
  }, [winningValues])
  const avgLossValue = useMemo(() => {
    if (losingValues.length === 0) return 0
    return losingValues.reduce((s, v) => s + v, 0) / losingValues.length
  }, [losingValues])

  const runSimulation = () => {
    if (tradeValues.length === 0) return
    setRunning(true)

    const length = sequenceLength > 0 ? sequenceLength : tradeValues.length
    const sims = simulations
    const results = []
    const curves = []

    // Win rate a usar: manual o el del journal
    const winRate = winRateInput !== null ? winRateInput : defaultWinRate // porcentaje
    const winFraction = winRate / 100

    for (let i = 0; i < sims; i++) {
      let equity = 0
      const curve = [0]
      for (let j = 0; j < length; j++) {
        const isWin = Math.random() < winFraction
        if (isWin) {
          // usar valor promedio de ganancia si se ha especificado, sino muestrear
          if (avgWinInput !== null) {
            equity += avgWinInput
          } else if (winningValues.length > 0) {
            const idx = Math.floor(Math.random() * winningValues.length)
            equity += winningValues[idx]
          } else {
            const idx = Math.floor(Math.random() * tradeValues.length)
            equity += tradeValues[idx]
          }
        } else {
          // usar valor promedio de pérdida si se ha especificado, sino muestrear
          if (avgLossInput !== null) {
            equity += avgLossInput
          } else if (losingValues.length > 0) {
            const idx = Math.floor(Math.random() * losingValues.length)
            equity += losingValues[idx]
          } else {
            const idx = Math.floor(Math.random() * tradeValues.length)
            equity += tradeValues[idx]
          }
        }
        curve.push(equity)
      }
      results.push(equity)
      if (i < 50) curves.push(curve) // store only first 50 for display
    }

    results.sort((a, b) => a - b)

    const mean = results.reduce((s, v) => s + v, 0) / results.length
    const variance = results.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / results.length
    const stdDev = Math.sqrt(variance)
    const median = results[Math.floor(results.length / 2)]
    const p5 = results[Math.floor(results.length * 0.05)]
    const p95 = results[Math.floor(results.length * 0.95)]
    const min = results[0]
    const max = results[results.length - 1]
    const profitableCount = results.filter(r => r > 0).length
    const profitProbability = (profitableCount / results.length * 100).toFixed(1)

    // Histogram bins
    const binCount = 30
    const range = max - min
    const binSize = range / binCount || 1
    const bins = {}
    results.forEach(v => {
      const binIdx = Math.min(Math.floor((v - min) / binSize), binCount - 1)
      const binKey = (min + binIdx * binSize).toFixed(2)
      bins[binKey] = (bins[binKey] || 0) + 1
    })
    const histogramData = Object.entries(bins)
      .map(([x, count]) => ({ x: parseFloat(x), count }))
      .sort((a, b) => a.x - b.x)

    // Prepare equity curve data
    const maxLen = Math.max(...curves.map(c => c.length))
    const curveData = []
    for (let i = 0; i < maxLen; i++) {
      const point = { step: i }
      curves.forEach((curve, ci) => {
        point[`sim${ci}`] = curve[i] !== undefined ? curve[i] : curve[curve.length - 1]
      })
      // compute average at this step across all curves
      let sum = 0
      curves.forEach(c => { sum += c[i] !== undefined ? c[i] : c[c.length - 1] })
      point.average = sum / curves.length
      curveData.push(point)
    }

    setResult({
      mean,
      stdDev,
      median,
      p5,
      p95,
      min,
      max,
      profitProbability,
      histogramData,
      curveData,
      curveCount: curves.length,
      length
    })
    setRunning(false)
  }

  if (tradeValues.length === 0) {
    return (
      <div className="card bg-gray-900 shadow-lg">
        <div className="card-body text-center">
          <h2 className="card-title justify-center">Monte Carlo</h2>
          <p className="text-gray-400">No hay operaciones para simular.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card bg-gray-900 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">Test de Monte Carlo</h2>
          <p className="text-sm text-gray-400 mb-4">
            Simula miles de escenarios combinando aleatoriamente tus resultados actuales para estimar posibles resultados futuros.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
            <div className="form-control">
              <label className="label"><span className="label-text">Operaciones por simulación</span></label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={sequenceLength || tradeValues.length}
                onChange={e => setSequenceLength(e.target.value ? parseInt(e.target.value) : 0)}
                min={1}
              />
              <span className="text-xs text-gray-500 mt-1">Por defecto: total actual ({tradeValues.length})</span>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Win Rate (%)</span></label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={winRateInput !== null ? winRateInput : defaultWinRate.toFixed(1)}
                onChange={e => setWinRateInput(e.target.value ? parseFloat(e.target.value) : null)}
                min={0}
                max={100}
              />
              <span className="text-xs text-gray-500 mt-1">Por defecto: win rate del journal ({defaultWinRate.toFixed(1)}%)</span>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Valor Promedio Ganancia</span></label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={avgWinInput !== null ? avgWinInput : avgWinValue.toFixed(2)}
                onChange={e => setAvgWinInput(e.target.value ? parseFloat(e.target.value) : null)}
              />
              <span className="text-xs text-gray-500 mt-1">Por defecto: promedio ganancia ({avgWinValue.toFixed(2)})</span>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Valor Promedio Pérdida</span></label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={avgLossInput !== null ? avgLossInput : avgLossValue.toFixed(2)}
                onChange={e => setAvgLossInput(e.target.value ? parseFloat(e.target.value) : null)}
              />
              <span className="text-xs text-gray-500 mt-1">Por defecto: promedio pérdida ({avgLossValue.toFixed(2)})</span>
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

          <div className="text-xs text-gray-500">
            Basado en {tradeValues.length} resultados ({displayMode === 'R' ? 'en R' : 'en $'}). Muestra: [{tradeValues.slice(0, 5).map(v => v.toFixed(2)).join(', ')}{tradeValues.length > 5 ? '...' : ''}]
          </div>
        </div>
      </div>

      {result && (
        <>
          {/* Métricas resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="stat bg-gray-900 rounded-box min-h-24">
              <div className="stat-title text-xs">Resultado Medio</div>
              <div className={`stat-value text-sm ${result.mean >= 0 ? 'text-success' : 'text-error'}`}>
                {displayMode === 'R' ? `${result.mean.toFixed(2)} R` : `$${result.mean.toFixed(2)}`}
              </div>
            </div>
            <div className="stat bg-gray-900 rounded-box min-h-24">
              <div className="stat-title text-xs">Desv. Estándar</div>
              <div className="stat-value text-sm text-primary">
                {displayMode === 'R' ? `${result.stdDev.toFixed(2)} R` : `$${result.stdDev.toFixed(2)}`}
              </div>
            </div>
            <div className="stat bg-gray-900 rounded-box min-h-24">
              <div className="stat-title text-xs">Mediana</div>
              <div className={`stat-value text-sm ${result.median >= 0 ? 'text-success' : 'text-error'}`}>
                {displayMode === 'R' ? `${result.median.toFixed(2)} R` : `$${result.median.toFixed(2)}`}
              </div>
            </div>
            <div className="stat bg-gray-900 rounded-box min-h-24">
              <div className="stat-title text-xs">Peor Caso (P5)</div>
              <div className="stat-value text-sm text-error">
                {displayMode === 'R' ? `${result.p5.toFixed(2)} R` : `$${result.p5.toFixed(2)}`}
              </div>
            </div>
            <div className="stat bg-gray-900 rounded-box min-h-24">
              <div className="stat-title text-xs">Mejor Caso (P95)</div>
              <div className="stat-value text-sm text-success">
                {displayMode === 'R' ? `${result.p95.toFixed(2)} R` : `$${result.p95.toFixed(2)}`}
              </div>
            </div>
            <div className="stat bg-gray-900 rounded-box min-h-24">
              <div className="stat-title text-xs">Min / Max</div>
              <div className="stat-value text-sm">
                {displayMode === 'R' ? `${result.min.toFixed(1)} / ${result.max.toFixed(1)} R` : `$${result.min.toFixed(0)} / $${result.max.toFixed(0)}`}
              </div>
            </div>
            <div className="stat bg-gray-900 rounded-box min-h-24">
              <div className="stat-title text-xs">Prob. Beneficio</div>
              <div className="stat-value text-sm text-success">{result.profitProbability}%</div>
            </div>
          </div>

          {/* Histograma de resultados */}
          <div className="card bg-gray-900 shadow-lg">
            <div className="card-body">
              <h3 className="card-title">Distribución de Resultados</h3>
              <p className="text-xs text-gray-400 mb-2">Resultado final tras {result.length} operaciones - {simulations} simulaciones</p>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={result.histogramData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    tickFormatter={v => displayMode === 'R' ? `${v.toFixed(1)}` : `$${v.toFixed(0)}`}
                    label={{ value: 'Resultado', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    label={{ value: 'Frecuencia', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    formatter={(value, name) => [value, 'Frecuencia']}
                    labelFormatter={v => `Resultado: ${displayMode === 'R' ? `${Number(v).toFixed(2)} R` : `$${Number(v).toFixed(2)}`}`}
                  />
                  <Bar dataKey="count" name="Frecuencia" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Curvas de equity */}
          <div className="card bg-gray-900 shadow-lg">
            <div className="card-body">
              <h3 className="card-title">Curvas de Equity Simuladas</h3>
              <p className="text-xs text-gray-400 mb-2">Muestra de {result.curveCount} simulaciones a lo largo de {result.length} operaciones</p>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={result.curveData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="step" />
                  <YAxis
                    tickFormatter={v => displayMode === 'R' ? `${v.toFixed(1)}` : `$${v.toFixed(0)}`}
                  />
                  <Legend />
                  {result.curveData.length > 0 && Object.keys(result.curveData[0])
                    .filter(k => k.startsWith('sim'))
                    .map((key, idx) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke="rgba(59, 130, 246, 0.15)"
                        dot={false}
                        strokeWidth={1}
                        isAnimationActive={false}
                        legendType="none"
                      />
                    ))}
                  <Line
                    type="monotone"
                    dataKey="average"
                    stroke="#F59E0B"
                    strokeWidth={3}
                    dot={false}
                    isAnimationActive={false}
                    name="Promedio"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default MonteCarlo
