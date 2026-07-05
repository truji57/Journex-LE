import React, { useState } from 'react'

function SessionCreator({ onCreate }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('Live')
  const [capital, setCapital] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name) return
    onCreate(name, type, capital)
    setName('')
    setCapital('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <div className="flex-1">
        <label className="label">Nombre de la sesión</label>
        <input type="text" placeholder="Ej: Mi Live" className="input input-bordered w-full" value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div>
        <label className="label">Tipo</label>
        <select className="select select-bordered" value={type} onChange={e => setType(e.target.value)}>
          <option value="Live">Live</option>
          <option value="Backtest">Backtest</option>
        </select>
      </div>
      <div>
        <label className="label">Capital inicial</label>
        <input type="number" min="0" step="0.01" placeholder="0" className="input input-bordered w-full" value={capital} onChange={e => setCapital(e.target.value)} />
      </div>
      <button className="btn btn-primary">Crear Sesión</button>
    </form>
  )
}

export default SessionCreator
