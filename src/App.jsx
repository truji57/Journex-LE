import React, { useState, useEffect, useRef, useMemo } from 'react'
import Dashboard from './components/Dashboard'
import TradeForm from './components/TradeForm'
import TradeList from './components/TradeList'
import Settings from './components/Settings'
import Calendar from './components/Calendar'
import MonteCarlo from './components/MonteCarlo'
import Robustness from './components/Robustness'
import ImportPage from './components/ImportPage'
import CapitalForm from './components/CapitalForm'
import SessionCreator from './components/SessionCreator'
import Sidebar from './components/Sidebar'
import FilterBar from './components/FilterBar'
import { Toaster } from 'react-hot-toast'
import { api, apiBase } from './utils/tradeCalculations'
import { notify } from './utils/toast'
import './index.css'

const SETTINGS_KEY = 'journex-le-settings'

function loadStoredSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {} }
  catch { return {} }
}

function App() {
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [trades, setTrades] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showCapitalForm, setShowCapitalForm] = useState(false)
  const restoreFileInputRef = useRef(null)
  const formRef = useRef(null)
  const [editingTrade, setEditingTrade] = useState(null)
  const [userSettings, setUserSettings] = useState(() => loadStoredSettings())
  const [activeTab, setActiveTab] = useState('dashboard')
  const [symbolFilter, setSymbolFilter] = useState('')
  const [sessionFilter, setSessionFilter] = useState('')
  const [weekdayFilter, setWeekdayFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const [editSessionName, setEditSessionName] = useState('')
  const [editSessionCapital, setEditSessionCapital] = useState('')
  const [theme, setTheme] = useState(() => localStorage.getItem('journex-theme') || 'dark-blue')
  const importTradesRef = useRef(null)
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    fetch(`${apiBase}/api/version`).then(r => r.json()).then(d => setAppVersion(d.version || '')).catch(() => {})
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const currentSessionBalance = useMemo(() => {
    if (!selectedSession) return 0
    const initial = Number(selectedSession.initialCapital || 0)
    const totalNet = trades.reduce((sum, t) => {
      const net = t.beneficioNeto !== undefined && t.beneficioNeto !== null
        ? Number(t.beneficioNeto)
        : (Number(t.profit) || 0) + (Number(t.fees) || 0)
      return sum + net
    }, 0)
    const adjustments = (selectedSession.capitalMovements || []).reduce((s, m) => s + (Number(m.amount) || 0), 0)
    return initial + totalNet + adjustments
  }, [selectedSession, trades])

  const uniqueSessions = useMemo(() => [...new Set(trades.map(t => t.sesion).filter(Boolean))].sort(), [trades])
  const uniqueWeekdays = useMemo(() => {
    const days = new Set(trades.map(t => {
      try { return new Date(t.date).toLocaleString('es-ES', { weekday: 'long' }) } catch(e) { return null }
    }))
    return [...days].filter(Boolean).sort()
  }, [trades])
  const uniqueMonths = useMemo(() => {
    const months = new Set(trades.map(t => {
      try { return new Date(t.date).toLocaleString('es-ES', { month: 'long', year: 'numeric' }) } catch(e) { return null }
    }))
    return [...months].filter(Boolean).sort()
  }, [trades])
  const uniqueYears = useMemo(() => {
    const years = new Set(trades.map(t => {
      try { return new Date(t.date).getFullYear().toString() } catch(e) { return null }
    }))
    return [...years].filter(Boolean).sort()
  }, [trades])

  const filteredTrades = useMemo(() => {
    let result = [...trades]
    if (symbolFilter) result = result.filter(t => t.symbol?.toLowerCase() === symbolFilter.toLowerCase())
    if (sessionFilter) result = result.filter(t => t.sesion === sessionFilter)
    if (weekdayFilter) result = result.filter(t => {
      try { return new Date(t.date).toLocaleString('es-ES', { weekday: 'long' }) === weekdayFilter } catch(e) { return false }
    })
    if (monthFilter) result = result.filter(t => {
      try { return new Date(t.date).toLocaleString('es-ES', { month: 'long', year: 'numeric' }) === monthFilter } catch(e) { return false }
    })
    if (yearFilter) result = result.filter(t => {
      try { return new Date(t.date).getFullYear().toString() === yearFilter } catch(e) { return false }
    })
    if (dateStart) result = result.filter(t => new Date(t.date) >= new Date(dateStart))
    if (dateEnd) result = result.filter(t => new Date(t.date) <= new Date(dateEnd + 'T23:59:59'))
    return result
  }, [trades, symbolFilter, sessionFilter, weekdayFilter, monthFilter, yearFilter, dateStart, dateEnd])

  useEffect(() => { loadSessions(); loadUserSettings() }, [])
  useEffect(() => {
    if (selectedSession) { loadTrades(selectedSession.id) }
    else { setTrades([]) }
  }, [selectedSession])

  useEffect(() => {
    if (!selectedSession) return
    const raw = sessionStorage.getItem('importedTrades')
    if (!raw) return
    try {
      const trades = JSON.parse(raw)
      sessionStorage.removeItem('importedTrades')
      sessionStorage.removeItem('importPlatform')
      importTradesRef.current?.(trades)
      setActiveTab('trades')
    } catch (e) { console.error('Error importando trades desde sessionStorage', e) }
  }, [selectedSession, activeTab])

  useEffect(() => {
    if (showForm && formRef.current) {
      setTimeout(() => { formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 100)
    }
  }, [showForm])

  const loadUserSettings = async () => {
    let data = null
    let fromServer = false
    try {
      const response = await fetch(`${apiBase}/api/settings`)
      if (response.ok) {
        const remote = await response.json()
        if (remote && Object.keys(remote).length > 0) { data = remote; fromServer = true }
      }
    } catch {}
    if (!data) data = loadStoredSettings()
    if (!fromServer && data && Object.keys(data).length > 0) {
      try {
        await fetch(`${apiBase}/api/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
      } catch {}
    }
    setUserSettings(data)
    if (data.theme) {
      setTheme(data.theme)
      localStorage.setItem('journex-theme', data.theme)
    }
  }

  const loadSessions = async () => {
    try {
      const data = await api('/api/sessions')
      const sessionsWithBalance = await Promise.all(data.map(async (s) => {
        const trades = await api(`/api/sessions/${s.id}/trades`)
        const net = trades.reduce((sum, t) => {
          if (t.beneficioNeto !== undefined && t.beneficioNeto !== null) return sum + Number(t.beneficioNeto)
          return sum + (Number(t.profit) || 0)
        }, 0)
        const stored = localStorage.getItem(`journex_capital_${s.id}`)
        const capitalMovements = stored ? JSON.parse(stored) : (s.capitalMovements || [])
        return { ...s, balance: Number(s.initialCapital || 0) + net, capitalMovements }
      }))
      setSessions(sessionsWithBalance)
    } catch (e) { console.error('Error cargando sesiones', e) }
  }

  const createSession = async (name, type, initialCapital) => {
    try {
      await api('/api/sessions', 'POST', { name, type, initialCapital: initialCapital ? parseFloat(initialCapital) : 0 })
      loadSessions()
    } catch (err) { notify.error('Error creando sesión: ' + err.message) }
  }

  const deleteSession = async (id) => {
    if (!window.confirm('¿Eliminar sesión y todos sus trades?')) return
    try {
      await api(`/api/sessions/${id}`, 'DELETE')
      if (selectedSession?.id === id) setSelectedSession(null)
      loadSessions()
    } catch (err) { notify.error('Error borrando sesión: ' + err.message) }
  }

  const startEditSession = (session) => {
    setEditingSession(session)
    setEditSessionName(session.name)
    setEditSessionCapital(session.initialCapital !== undefined ? session.initialCapital : '')
  }
  const cancelEditSession = () => { setEditingSession(null); setEditSessionName(''); setEditSessionCapital('') }
  const updateSession = async () => {
    if (!editingSession || !editSessionName.trim()) return
    try {
      await api(`/api/sessions/${editingSession.id}`, 'PUT', { name: editSessionName.trim(), initialCapital: editSessionCapital })
      cancelEditSession()
      loadSessions()
    } catch (err) { notify.error('Error actualizando sesión: ' + err.message) }
  }

  const loadTrades = async (sessionId) => {
    try {
      const data = await api(`/api/sessions/${sessionId}/trades`)
      setTrades(data.sort((a, b) => new Date(b.date) - new Date(a.date)))
    } catch (e) { console.error('Error cargando trades', e) }
  }

  const addTrade = async (trade) => {
    if (!selectedSession) return
    try {
      const res = await api(`/api/sessions/${selectedSession.id}/trades`, 'POST', trade)
      setTrades(prev => [res, ...prev])
      setShowForm(false)
    } catch (e) { console.error('Error añadiendo trade', e) }
  }

  const startEdit = (trade) => { setEditingTrade(trade); setShowForm(true) }
  const cancelEdit = () => { setEditingTrade(null); setShowForm(false) }
  const updateTrade = async (tradeData) => {
    if (!selectedSession || !editingTrade) return
    try {
      await api(`/api/sessions/${selectedSession.id}/trades/${editingTrade.id}`, 'PUT', tradeData)
      await loadTrades(selectedSession.id)
      setEditingTrade(null)
      setShowForm(false)
    } catch (e) { console.error('Error actualizando trade', e) }
  }

  const deleteTrade = async (id) => {
    if (!selectedSession) return
    try {
      await api(`/api/sessions/${selectedSession.id}/trades/${id}`, 'DELETE')
      setTrades(prev => prev.filter(t => t.id !== id))
    } catch (e) { console.error('Error borrando trade', e) }
  }

  const saveCapitalMovements = async (movements) => {
    if (!selectedSession) return
    try {
      localStorage.setItem(`journex_capital_${selectedSession.id}`, JSON.stringify(movements))
      const updated = await api(`/api/sessions/${selectedSession.id}`, 'PUT', { capitalMovements: movements })
      setSelectedSession({ ...updated, capitalMovements: movements })
    } catch (e) {
      notify.error('Error guardando movimientos de capital')
      console.error(e)
    }
  }

  const importTrades = async (tradesArray) => {
    if (!selectedSession) return
    const toastId = notify.loading(`Importando ${tradesArray.length} trades...`)
    try {
      const existing = await api(`/api/sessions/${selectedSession.id}/trades`)
      const existingIds = new Set(existing.map(t => String(t.id)))
      const baseId = Date.now()
      let idCounter = 0
      const newTrades = tradesArray.filter(t => !existingIds.has(String(t.id)))
      for (const t of newTrades) {
        if (!t.id || existingIds.has(String(t.id))) { t.id = baseId + (idCounter++) }
        else { existingIds.add(String(t.id)) }
      }
      const merged = [...existing, ...newTrades]
      await api(`/api/sessions/${selectedSession.id}/restore`, 'POST', merged)
      await loadTrades(selectedSession.id)
      notify.dismiss(toastId)
      notify.success(`${newTrades.length} trades importados`)
    } catch (e) {
      notify.dismiss(toastId)
      notify.error('Error al importar: ' + e.message)
    }
  }

  useEffect(() => {
    importTradesRef.current = importTrades
  })

  const backupSession = async () => {
    if (!selectedSession) return
    try {
      const resp = await fetch(`${apiBase}/api/sessions/${selectedSession.id}/backup`)
      if (!resp.ok) throw new Error('Error generando backup')
      const blob = await resp.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `backup_session_${selectedSession.name}_${selectedSession.id}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err) { notify.error('Error backup: ' + err.message) }
  }

  const handleRestoreFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!Array.isArray(data)) throw new Error('El archivo no contiene un array de trades')
        const ok = window.confirm(`Se restaurarán ${data.length} trades, reemplazando la sesión actual. ¿Continuar?`)
        if (!ok) { e.target.value = ''; return }
        await api(`/api/sessions/${selectedSession.id}/restore`, 'POST', data)
        await loadTrades(selectedSession.id)
        notify.success('Sesión restaurada correctamente')
        setActiveTab('dashboard')
      } catch (err) { notify.error('Error restaurando: ' + err.message) }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  if (!selectedSession) {
    return (
      <div className="min-h-screen bg-black text-base-content">
        <Toaster />
        <header className="navbar bg-gradient-to-r from-indigo-900 via-gray-900 to-indigo-900 rounded-box mb-4 p-4 shadow-lg">
          <div className="flex-1 flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-primary tracking-tight">Journex LE</h1>
            {appVersion && <span className="badge badge-sm badge-primary badge-outline">{appVersion}</span>}
          </div>
        </header>
        <div className="container mx-auto p-4">
          <h2 className="text-xl font-bold mb-6">Mis Sesiones</h2>
          <div className="mb-6">
            <SessionCreator onCreate={createSession} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {sessions.map(s => (
              <div key={s.id} className={`card shadow-md ${s.type === 'Backtest' ? 'bg-gray-800 border-l-4 border-l-warning' : 'bg-gray-800 border-l-4 border-l-success'}`}>
                <div className="card-body">
                  {editingSession?.id === s.id ? (
                    <>
                      <input type="text" className="input input-sm input-bordered w-full mb-2" value={editSessionName} onChange={e => setEditSessionName(e.target.value)} autoFocus />
                      <input type="number" min="0" step="0.01" className="input input-sm input-bordered w-full mb-2" placeholder="Capital inicial" value={editSessionCapital} onChange={e => setEditSessionCapital(e.target.value)} />
                      <div className="card-actions justify-end mt-2">
                        <button className="btn btn-sm btn-primary" onClick={updateSession}>Guardar</button>
                        <button className="btn btn-sm btn-ghost" onClick={cancelEditSession}>Cancelar</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="card-title">{s.name}</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl opacity-50">${Number(s.balance || 0).toFixed(2)}</span>
                        <span className="text-sm opacity-50">/ ${Number(s.initialCapital || 0).toFixed(2)}</span>
                      </div>
                      <span className={`badge ${s.type === 'Backtest' ? 'badge-warning' : 'badge-success'} mt-1`}>{s.type}</span>
                      <div className="card-actions justify-end mt-4">
                        <button className="btn btn-sm btn-primary" onClick={() => setSelectedSession(s)}>Abrir</button>
                        <button className="btn btn-sm btn-outline" onClick={() => startEditSession(s)}>Editar</button>
                        <button className="btn btn-sm btn-error" onClick={() => deleteSession(s.id)}>Eliminar</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          {sessions.length === 0 && <p className="opacity-60 mt-4">No tienes sesiones. Crea una arriba.</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-base-content">
      <Toaster />
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        showForm={showForm}
        toggleForm={() => { setEditingTrade(null); setShowForm(f => !f); setActiveTab('trades') }}
        showCapitalForm={showCapitalForm}
        toggleCapitalForm={() => { setShowCapitalForm(f => !f); setActiveTab('trades') }}
      />

      <main className={`transition-all duration-200 ${sidebarCollapsed ? 'ml-20' : 'ml-64'} p-4 min-h-screen`}>
        <input type="file" ref={restoreFileInputRef} className="hidden" accept=".json" onChange={handleRestoreFile} />

        {selectedSession && (
          <header className="flex items-center justify-between mb-4 p-4 bg-gray-900/50 rounded-box min-h-24">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-box bg-primary/20 flex items-center justify-center text-primary text-xl font-bold">
                {selectedSession.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{selectedSession.name}</span>
                  <span className="badge badge-outline text-xs">{selectedSession.type}</span>
                  <button className="link link-primary link-hover text-xs" onClick={() => { setSelectedSession(null); setTrades([]); loadSessions() }}>
                    Cambiar sesión
                  </button>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span>Balance: <span className={`font-semibold ${currentSessionBalance >= Number(selectedSession.initialCapital || 0) ? 'text-success' : 'text-error'}`}>${currentSessionBalance.toFixed(2)}</span></span>
                  <span>Capital: <span className="text-gray-300">${Number(selectedSession.initialCapital || 0).toFixed(2)}</span></span>
                  {(() => {
                    const adj = (selectedSession.capitalMovements || []).reduce((s, m) => s + (Number(m.amount) || 0), 0)
                    if (adj === 0) return null
                    return <span>Ajuste: <span className={adj >= 0 ? 'text-success' : 'text-error'}>${adj >= 0 ? '+' : ''}{adj.toFixed(2)}</span></span>
                  })()}
                </div>
              </div>
            </div>
            <FilterBar
              trades={trades}
              symbolFilter={symbolFilter} setSymbolFilter={setSymbolFilter}
              sessionFilter={sessionFilter} setSessionFilter={setSessionFilter}
              weekdayFilter={weekdayFilter} setWeekdayFilter={setWeekdayFilter}
              monthFilter={monthFilter} setMonthFilter={setMonthFilter}
              yearFilter={yearFilter} setYearFilter={setYearFilter}
              dateStart={dateStart} setDateStart={setDateStart}
              dateEnd={dateEnd} setDateEnd={setDateEnd}
              clearFilters={() => { setSymbolFilter(''); setSessionFilter(''); setWeekdayFilter(''); setMonthFilter(''); setYearFilter(''); setDateStart(''); setDateEnd('') }}
              uniqueSessions={uniqueSessions} uniqueWeekdays={uniqueWeekdays} uniqueMonths={uniqueMonths} uniqueYears={uniqueYears}
            />
          </header>
        )}

        {activeTab === 'settings' ? (
          <Settings
            theme={theme}
            onThemeChange={(t) => { setTheme(t); localStorage.setItem('journex-theme', t) }}
            onBack={() => { setActiveTab('dashboard'); loadUserSettings() }}
            onSettingsChange={() => loadUserSettings()}
            selectedSession={selectedSession}
            backupFn={backupSession}
            triggerRestore={() => restoreFileInputRef.current?.click()}
            onTradesRefresh={() => loadTrades(selectedSession?.id)}
            setTrades={setTrades}
          />
        ) : (
          <>
            {showForm && (
              <div className="mb-4" ref={formRef}>
                <TradeForm
                  onSubmit={addTrade}
                  onUpdate={updateTrade}
                  onCancel={cancelEdit}
                  editingTrade={editingTrade}
                  userSettings={userSettings}
                  existingSymbols={Array.from(new Set(trades.map(t => t.symbol).filter(Boolean)))}
                  onNewTag={async (tag) => {
                    const settings = userSettings || { sessions: [], displayMode: 'dollar', tags: [] }
                    const newTags = [...(settings.tags || []), tag]
                    const updated = { ...settings, tags: newTags }
                    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
                    try {
                      await fetch(`${apiBase}/api/settings`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updated)
                      })
                    } catch {}
                    loadUserSettings()
                  }}
                />
              </div>
            )}

            {showCapitalForm && selectedSession && (
              <CapitalForm
                movements={selectedSession.capitalMovements || []}
                onSave={saveCapitalMovements}
                onCancel={() => setShowCapitalForm(false)}
              />
            )}

            <div className="space-y-4">
              {activeTab === 'dashboard' && (
                <Dashboard trades={filteredTrades} displayMode={userSettings?.displayMode || 'dollar'} initialCapital={selectedSession?.initialCapital || 0} capitalMovements={selectedSession?.capitalMovements || []} />
              )}
              {activeTab === 'trades' && (
                <>
                  <h2 className="text-xl font-semibold mb-4">Listado de trades</h2>
                  <TradeList trades={filteredTrades} onDelete={deleteTrade} onEdit={startEdit} userSettings={userSettings} />
                </>
              )}
              {activeTab === 'calendar' && (
                <Calendar trades={filteredTrades} displayMode={userSettings?.displayMode || 'dollar'} />
              )}
              {activeTab === 'montecarlo' && (
                <MonteCarlo trades={filteredTrades} displayMode={userSettings?.displayMode || 'dollar'} />
              )}
              {activeTab === 'robustness' && (
                <Robustness trades={filteredTrades} displayMode={userSettings?.displayMode || 'dollar'} />
              )}
              {activeTab === 'import' && (
                <ImportPage onBack={() => setActiveTab('dashboard')} sessionType={selectedSession?.type} userSettings={userSettings} />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default App
