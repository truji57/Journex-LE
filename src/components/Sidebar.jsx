import React from 'react'
import { HomeIcon, ChartBarIcon, CalendarIcon, FireIcon, Cog8ToothIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, DocumentArrowUpIcon, PlusIcon } from "@heroicons/react/24/outline"

function Sidebar({ activeTab, setActiveTab, sidebarCollapsed, setSidebarCollapsed, showForm, toggleForm, showCapitalForm, toggleCapitalForm }) {
  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <HomeIcon className="text-gray-300 w-5 h-5" /> },
    { key: 'trades', label: 'Trades', icon: <ChartBarIcon className="text-gray-300 w-5 h-5" /> },
    { key: 'calendar', label: 'Calendario', icon: <CalendarIcon className="text-gray-300 w-5 h-5" /> },
    { key: 'montecarlo', label: 'Monte Carlo', icon: <FireIcon className="text-gray-300 w-5 h-5" /> }
  ]

  return (
    <aside className={`fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-700 flex flex-col transition-all duration-200 z-40 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="p-6 border-b border-gray-700 flex items-center justify-between">
        <h2 className={`font-bold text-primary whitespace-nowrap overflow-hidden ${sidebarCollapsed ? 'text-sm' : 'text-xl'}`}>Journex LE</h2>
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-gray-300 hover:text-primary transition-colors">
          {sidebarCollapsed ? <ChevronDoubleRightIcon className="w-6 h-6" /> : <ChevronDoubleLeftIcon className="w-6 h-6" />}
        </button>
      </div>

      <nav className="flex-1 px-2 pt-6 pb-3 space-y-2 overflow-y-auto">
        <div className="grid gap-1">
          {navItems.map(item => (
            <button key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${activeTab === item.key ? 'bg-primary text-primary-content font-medium' : 'hover:bg-gray-700/50'}`}
            >
              {item.icon}
              {!sidebarCollapsed && <span className="text-base font-bold text-gray-300">{item.label}</span>}
            </button>
          ))}
        </div>
      </nav>

      {!sidebarCollapsed && (
        <div className="px-3 pb-2">
          <button className={`btn w-full ${showForm ? 'btn-error' : 'btn-primary'}`} onClick={toggleForm}>
            {showForm ? 'Cerrar' : 'Nueva Operación'}
          </button>
        </div>
      )}
      {sidebarCollapsed && (
        <div className="flex justify-center pb-2">
          <button className={`btn btn-sm ${showForm ? 'btn-error' : 'btn-primary'}`} onClick={toggleForm}>
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {!sidebarCollapsed && (
        <div className="px-3 pb-2">
          <button className={`btn w-full ${showCapitalForm ? 'btn-error' : 'btn-outline btn-primary'}`} onClick={toggleCapitalForm}>
            {showCapitalForm ? 'Cerrar' : 'Depósito/Retiro'}
          </button>
        </div>
      )}
      {sidebarCollapsed && (
        <div className="flex justify-center pb-2">
          <button className={`btn btn-sm ${showCapitalForm ? 'btn-error' : 'btn-outline btn-primary'}`} onClick={toggleCapitalForm}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>
      )}

      {!sidebarCollapsed && (
        <div className="px-3 pb-2">
          <button className="btn btn-primary w-full" onClick={() => setActiveTab('import')}>Importar</button>
        </div>
      )}
      {sidebarCollapsed && (
        <div className="flex justify-center pb-2">
          <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('import')}>
            <DocumentArrowUpIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="border-t border-gray-700 p-3">
        <button onClick={() => setActiveTab('settings')}
          className="flex items-center gap-3 w-full px-3 py-2 rounded hover:bg-gray-700/50 transition-colors text-left text-sm text-gray-300">
          <Cog8ToothIcon className="w-5 h-5 text-gray-300" />
          {!sidebarCollapsed && <span>Ajustes</span>}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
