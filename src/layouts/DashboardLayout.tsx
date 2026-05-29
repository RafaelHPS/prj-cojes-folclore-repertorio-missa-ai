import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'

import { useLogout } from '@/features/auth/hooks/useAuth'
import { useActiveTeam } from '@/hooks/useActiveTeam'
import { useAppStore } from '@/app/app.store'

const NAV_ITEMS = [
  { to: '/dashboard',     label: 'Dashboard',    icon: '◈' },
  { to: '/missas',        label: 'Missas',        icon: '✦' },
  { to: '/musicas',       label: 'Músicas',       icon: '♪' },
  { to: '/estatisticas',  label: 'Estatísticas',  icon: '◉' },
  { to: '/configuracoes', label: 'Configurações', icon: '⚙' },
] as const

interface SidebarProps {
  onClose?: () => void
}

function Sidebar({ onClose }: SidebarProps) {
  const logout = useLogout()
  const activeTeam = useActiveTeam()
  const setActiveTeam = useAppStore((s) => s.setActiveTeam)
  const navigate = useNavigate()

  function handleSwitchTeam() {
    setActiveTeam(null)
    navigate('/selecionar-equipe')
  }

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col bg-violet-900 text-white">
      <div className="flex items-center justify-between border-b border-violet-800 px-6 py-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">Equipe</p>
          <p className="mt-1 truncate font-semibold">{activeTeam?.name}</p>
          <p className="text-xs capitalize text-violet-400">{activeTeam?.role}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="ml-3 flex-shrink-0 rounded-lg p-1 text-violet-300 transition hover:bg-violet-800 hover:text-white lg:hidden"
          >
            ✕
          </button>
        )}
      </div>

      <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-violet-700 text-white'
                  : 'text-violet-200 hover:bg-violet-800 hover:text-white'
              }`
            }
          >
            <span aria-hidden="true" className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-violet-800 px-4 py-4 space-y-1">
        <button
          onClick={handleSwitchTeam}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-violet-300 transition-colors hover:bg-violet-800 hover:text-white"
        >
          Trocar equipe
        </button>
        <button
          onClick={logout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-violet-300 transition-colors hover:bg-violet-800 hover:text-white"
        >
          Sair
        </button>
      </div>
    </aside>
  )
}

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const activeTeam = useActiveTeam()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          aria-hidden="true"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <div
        className={`fixed inset-y-0 left-0 z-30 transition-transform duration-200 lg:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Abrir menu de navegação"
            aria-expanded={isSidebarOpen}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
          >
            <span aria-hidden="true" className="block h-0.5 w-5 bg-current mb-1" />
            <span aria-hidden="true" className="block h-0.5 w-5 bg-current mb-1" />
            <span aria-hidden="true" className="block h-0.5 w-5 bg-current" />
          </button>
          <span className="truncate font-semibold text-gray-800">{activeTeam?.name}</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
