import React, { useState } from 'react'

function CapitalForm({ movements, onSave, onCancel }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [concept, setConcept] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!parsed || parsed === 0) return
    const newMovement = {
      id: Date.now(),
      date: new Date(date).toISOString(),
      amount: parsed,
      concept: concept.trim() || (parsed > 0 ? 'Depósito' : 'Retiro')
    }
    onSave([...movements, newMovement])
    setAmount('')
    setConcept('')
    setDate(new Date().toISOString().split('T')[0])
  }

  const handleDelete = (id) => {
    if (!window.confirm('¿Eliminar este movimiento?')) return
    onSave(movements.filter(m => m.id !== id))
  }

  const totalAdjustments = movements.reduce((s, m) => s + m.amount, 0)

  return (
    <div className="card bg-base-200 shadow-xl mb-4">
      <div className="card-body">
        <h3 className="card-title mb-4">Depósitos / Retiros</h3>
        <p className="text-sm opacity-60 mb-4">Registra depósitos y retiros de capital para ajustar la curva de balance.</p>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Fecha</span></label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input input-bordered w-full" required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Importe</span></label>
            <input type="number" step="any" placeholder="Ej: 1000 o -500" value={amount} onChange={e => setAmount(e.target.value)} className="input input-bordered w-full" required />
          </div>
          <div className="form-control">
            <label className="label"><span className="label-text">Concepto</span></label>
            <input type="text" placeholder="Ej: Depósito inicial, Retiro mensual" value={concept} onChange={e => setConcept(e.target.value)} className="input input-bordered w-full" />
          </div>
          <button type="submit" className="btn btn-primary">Añadir</button>
        </form>

        {movements.length > 0 && (
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Importe</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => (
                  <tr key={m.id}>
                    <td>{new Date(m.date).toLocaleDateString('es-ES')}</td>
                    <td>{m.concept}</td>
                    <td className={m.amount >= 0 ? 'text-success font-bold' : 'text-error font-bold'}>
                      {m.amount >= 0 ? '+' : ''}${m.amount.toFixed(2)}
                    </td>
                    <td>
                      <button type="button" className="btn btn-xs btn-error" onClick={() => handleDelete(m.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right mt-2 font-bold">
              Ajuste total: <span className={totalAdjustments >= 0 ? 'text-success' : 'text-error'}>${totalAdjustments.toFixed(2)}</span>
            </div>
          </div>
        )}

        {movements.length === 0 && (
          <p className="text-xs opacity-50">No hay movimientos registrados.</p>
        )}

        <div className="mt-4">
          <button className="btn btn-ghost" onClick={onCancel}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

export default CapitalForm