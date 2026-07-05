import React, { useState, useEffect } from 'react'
import { notify } from '../utils/toast'
import { apiBase, api } from '../utils/tradeCalculations'

const STORAGE_KEY = 'journex-le-settings'

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} }
  catch { return {} }
}

function saveSettingsToStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function Settings({ selectedSession, onSettingsChange, onTradesRefresh, setTrades, onBack, backupFn, triggerRestore, theme, onThemeChange }) {
  const [sessions, setSessions] = useState([])
  const [displayMode, setDisplayMode] = useState('dollar')
  const [editingIdx, setEditingIdx] = useState(-1)
  const [form, setForm] = useState({ name: '', start: '09:00', end: '17:00' })
  const [savedTags, setSavedTags] = useState([])
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    const data = loadSettings()
    setSessions(data.sessions || [])
    setDisplayMode(data.displayMode || 'dollar')
    setSavedTags(data.tags || [])
  }, [])

  const save = (newSessions, newDisplayMode, newTags, newTheme) => {
    const data = loadSettings()
    const merged = {
      ...data,
      sessions: newSessions !== undefined ? newSessions : data.sessions,
      displayMode: newDisplayMode !== undefined ? newDisplayMode : data.displayMode,
      tags: newTags !== undefined ? newTags : data.tags,
      theme: newTheme !== undefined ? newTheme : data.theme
    }
    saveSettingsToStorage(merged)
    if (onSettingsChange) onSettingsChange()
  }

  const handleDisplayModeChange = (e) => {
    const newMode = e.target.value
    setDisplayMode(newMode)
    save(sessions, newMode, savedTags)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) { notify.error('El nombre de la sesión es obligatorio'); return }
    let newSessions = [...sessions]
    if (editingIdx >= 0) {
      newSessions[editingIdx] = { ...form }
    } else {
      newSessions.push({ ...form })
    }
    setSessions(newSessions)
    save(newSessions, displayMode, savedTags)
    setForm({ name: '', start: '09:00', end: '17:00' })
    setEditingIdx(-1)
  }

  const startEdit = (idx) => { setForm({ ...sessions[idx] }); setEditingIdx(idx) }
  const cancelEdit = () => { setForm({ name: '', start: '09:00', end: '17:00' }); setEditingIdx(-1) }

  const deleteSession = (idx) => {
    if (!window.confirm('¿Eliminar esta sesión?')) return
    const newSessions = sessions.filter((_, i) => i !== idx)
    setSessions(newSessions)
    save(newSessions, displayMode, savedTags)
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-6">Ajustes</h2>

      <div className="card bg-base-200 shadow-xl mb-6">
        <div className="card-body">
          <h3 className="card-title mb-4">Resultados</h3>
          <p className="text-sm opacity-60 mb-4">Elige cómo se muestran los resultados de las operaciones.</p>
          <div className="form-control max-w-xs">
            <label className="label"><span className="label-text">Mostrar resultados en</span></label>
            <select className="select select-bordered" value={displayMode} onChange={handleDisplayModeChange}>
              <option value="dollar">Beneficio ($)</option>
              <option value="R">Unidad de Riesgo (R)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl mb-6">
        <div className="card-body">
          <h3 className="card-title mb-4">Color del tema</h3>
          <p className="text-sm opacity-60 mb-4">Elige el color principal de la aplicación.</p>
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'dark-blue', label: 'Azul', color: '#3B82F6' },
              { id: 'dark-green', label: 'Verde', color: '#22C55E' },
              { id: 'dark-red', label: 'Rojo', color: '#EF4444' },
              { id: 'dark-yellow', label: 'Amarillo', color: '#EAB308' },
              { id: 'dark-purple', label: 'Morado', color: '#A855F7' },
              { id: 'dark-pink', label: 'Rosa', color: '#EC4899' },
            ].map(c => (
              <button
                key={c.id}
                className={`btn btn-sm gap-2 ${theme === c.id ? 'btn-primary ring-2 ring-offset-2 ring-offset-base-100' : 'btn-outline'}`}
                style={{ borderColor: theme === c.id ? 'transparent' : c.color, color: theme === c.id ? undefined : c.color }}
                onClick={() => { onThemeChange(c.id); save(sessions, displayMode, savedTags, c.id) }}
              >
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }}></span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl mb-6">
        <div className="card-body">
          <h3 className="card-title mb-4">Sesiones Operativas</h3>
          <p className="text-sm opacity-60 mb-4">Define los rangos horarios de tus sesiones. Al registrar o importar operaciones, la sesión se asignará automáticamente.</p>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6">
            <div className="form-control">
              <label className="label"><span className="label-text">Nombre</span></label>
              <input type="text" name="name" placeholder="Ej. Londres" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input input-bordered w-full" required />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Hora inicio</span></label>
              <input type="time" name="start" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} className="input input-bordered w-full" required />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Hora fin</span></label>
              <input type="time" name="end" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} className="input input-bordered w-full" required />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">{editingIdx >= 0 ? 'Actualizar' : 'Añadir'}</button>
              {editingIdx >= 0 && <button type="button" className="btn btn-ghost" onClick={cancelEdit}>Cancelar</button>}
            </div>
          </form>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead><tr><th>Nombre</th><th>Inicio</th><th>Fin</th><th>Acciones</th></tr></thead>
              <tbody>
                {sessions.length === 0 && <tr><td colSpan="4" className="text-center opacity-50 py-4">No hay sesiones definidas.</td></tr>}
                {sessions.map((s, idx) => (
                  <tr key={idx} className="hover"><td className="font-bold">{s.name}</td><td>{s.start}</td><td>{s.end}</td>
                    <td><button className="btn btn-xs btn-primary mr-1" onClick={() => startEdit(idx)}>✏️</button><button className="btn btn-xs btn-error" onClick={() => deleteSession(idx)}>🗑️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl mb-6">
        <div className="card-body">
          <h3 className="card-title mb-4">Gestión de Backups</h3>
          <p className="text-sm opacity-60 mb-4">Crea un respaldo completo de los trades de la sesión seleccionada o restaura una sesión desde un archivo JSON.</p>
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={!selectedSession} onClick={backupFn}>Crear Backup</button>
            <button className="btn btn-outline" disabled={!selectedSession} onClick={triggerRestore}>Restaurar Backup</button>
          </div>
          {!selectedSession && <p className="text-xs opacity-50 mt-2">No hay ninguna sesión seleccionada.</p>}
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl mb-6">
        <div className="card-body items-start">
          <h3 className="card-title mb-4">Eliminar historial de trades</h3>
          <p className="text-sm opacity-60 mb-4">Esta acción borrará todos los trades guardados para la sesión seleccionada. No se puede deshacer.</p>
          <button className="btn btn-error btn-sm" disabled={!selectedSession} onClick={async () => {
            if (!window.confirm('¿Estás seguro de eliminar todo el historial de trades?')) return
            try {
              await api(`/api/sessions/${selectedSession.id}/trades`, 'DELETE')
              if (onTradesRefresh) onTradesRefresh()
              if (setTrades) setTrades([])
              if (onBack) onBack()
            } catch (e) { notify.error('Error: ' + e.message) }
          }}>Eliminar historial</button>
          {!selectedSession && <p className="text-xs opacity-50 mt-2">No hay ninguna sesión seleccionada.</p>}
        </div>
      </div>

      <div className="card bg-base-200 shadow-xl mb-6">
        <div className="card-body">
          <h3 className="card-title mb-4">Etiquetas guardadas</h3>
          <p className="text-sm opacity-60 mb-4">Gestiona etiquetas reutilizables para operaciones.</p>
          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="Nueva etiqueta" value={newTag} onChange={e => setNewTag(e.target.value)} className="input input-bordered flex-1" />
            <button className="btn btn-primary" onClick={() => {
              const tag = newTag.trim()
              if (!tag) return
              if (!savedTags.includes(tag)) {
                const updated = [...savedTags, tag]
                setSavedTags(updated)
                save(sessions, displayMode, updated)
                notify.success(`Etiqueta "${tag}" añadida`)
              } else { notify.info('La etiqueta ya existe') }
              setNewTag('')
            }}>Añadir</button>
          </div>
          {savedTags.length === 0 ? <p className="text-xs opacity-50">No hay etiquetas guardadas.</p> : (
            <ul className="list-disc list-inside">
              {savedTags.map((t, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span>{t}</span>
                  <button className="btn btn-xs btn-error" onClick={() => {
                    const updated = savedTags.filter((_, idx) => idx !== i)
                    setSavedTags(updated)
                    save(sessions, displayMode, updated)
                  }}>🗑️</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings
