import { useRef, useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'

import { useLogout } from '@/features/auth/hooks/useAuth'
import { useActiveTeam } from '@/hooks/useActiveTeam'
import { useAppStore } from '@/app/app.store'

const NAV_ITEMS = [
  { to: '/', label: 'Início', end: true, icon: 'home' },
  { to: '/musicas', label: 'Músicas', end: false, icon: 'library_music' },
  { to: '/missas', label: 'Missas', end: false, icon: 'event' },
  { to: '/estatisticas', label: 'Estatísticas', end: false, icon: 'bar_chart' },
  { to: '/configuracoes', label: 'Configurações', end: false, icon: 'settings' },
] as const

const MOBILE_TAB_ITEMS = [
  { to: '/', label: 'Início', end: true, icon: 'home' },
  { to: '/musicas', label: 'Músicas', end: false, icon: 'library_music' },
  { to: '/missas', label: 'Missas', end: false, icon: 'event' },
] as const

const MORE_PATHS = ['/estatisticas', '/configuracoes']

function activeSidebarLinkClass({ isActive }: { isActive: boolean }): string {
  return isActive
    ? 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-primary bg-primary-container'
    : 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface'
}

export function DashboardLayout() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const logout = useLogout()
  const activeTeam = useActiveTeam()
  const setActiveTeam = useAppStore((s) => s.setActiveTeam)
  const navigate = useNavigate()
  const location = useLocation()

  function handleSwitchTeam() {
    setActiveTeam(null)
    navigate('/selecionar-equipe')
    setIsUserMenuOpen(false)
  }

  async function handleLogout() {
    setIsUserMenuOpen(false)
    setIsMoreMenuOpen(false)
    await logout()
  }

  const teamInitial = activeTeam?.name?.[0]?.toUpperCase() ?? 'E'
  const isMoreActive = MORE_PATHS.some((p) => location.pathname.startsWith(p))

  return (
    <div className="flex min-h-screen bg-surface">
      {/* ── Sidebar (desktop) ─────────────────────────── */}
      <aside className="hidden w-[252px] flex-none flex-col border-r border-outline-variant bg-surface-container-lowest p-4 md:flex">
        {/* Equipe / trocar equipe */}
        <button
          onClick={handleSwitchTeam}
          title="Trocar de equipe"
          className="mb-5 flex items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-surface-container-high"
        >
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary-container font-bold text-on-primary">
            {teamInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-on-surface">{activeTeam?.name}</p>
            <p className="truncate text-xs text-outline">Repertório de Missas</p>
          </div>
          <span
            aria-hidden="true"
            className="material-symbols-outlined flex-none text-lg text-outline"
          >
            unfold_more
          </span>
        </button>

        <nav className="flex flex-col gap-1" role="navigation" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={activeSidebarLinkClass}>
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Rodapé: usuário */}
        <div className="mt-auto flex items-center gap-2.5 border-t border-outline-variant pt-4">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary-container text-xs font-bold text-on-primary">
            V
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-on-surface">Você</p>
            <p className="truncate text-[11px] capitalize text-outline">{activeTeam?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sair"
            title="Sair"
            className="flex-none rounded-lg p-1.5 text-outline transition-colors hover:bg-error/5 hover:text-error"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg">
              logout
            </span>
          </button>
        </div>
      </aside>

      {/* ── Coluna principal ──────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar mobile */}
        <div className="sticky top-0 z-30 flex h-14 flex-none items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-4 md:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-secondary-container text-xs font-bold text-on-primary">
              {teamInitial}
            </div>
            <span className="font-headline text-sm font-semibold text-on-surface">
              {activeTeam?.name}
            </span>
          </div>

          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setIsUserMenuOpen((v) => !v)}
              aria-label="Menu do usuário"
              aria-expanded={isUserMenuOpen}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary-container text-xs font-bold text-on-primary"
            >
              V
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-lg tonal-shadow">
                <div className="border-b border-outline-variant/60 px-4 py-3">
                  <p className="text-xs font-bold text-on-surface">{activeTeam?.name}</p>
                  <p className="text-[10px] capitalize text-outline">{activeTeam?.role}</p>
                </div>
                <button
                  onClick={handleSwitchTeam}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-base">
                    swap_horiz
                  </span>
                  Trocar equipe
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-error transition-colors hover:bg-error/5"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-base">
                    logout
                  </span>
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Overlay para fechar user menu ao clicar fora */}
        {isUserMenuOpen && (
          <div
            className="fixed inset-0 z-20"
            aria-hidden="true"
            onClick={() => setIsUserMenuOpen(false)}
          />
        )}

        {/* ── Conteúdo ──────────────────────────────────── */}
        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 sm:py-10 md:pb-10">
          <div className="mx-auto max-w-screen-xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Bottom tab bar (mobile) ───────────────────── */}
      <nav
        role="navigation"
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-outline-variant bg-surface-container-lowest pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {MOBILE_TAB_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setIsMoreMenuOpen(false)}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition-colors ${
                isActive ? 'text-primary' : 'text-outline'
              }`
            }
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={() => setIsMoreMenuOpen((v) => !v)}
          aria-expanded={isMoreMenuOpen}
          aria-label="Mais opções"
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition-colors ${
            isMoreActive || isMoreMenuOpen ? 'text-primary' : 'text-outline'
          }`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
            more_horiz
          </span>
          Mais
        </button>
      </nav>

      {/* "Mais" popover (mobile) */}
      {isMoreMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-30 md:hidden"
            aria-hidden="true"
            onClick={() => setIsMoreMenuOpen(false)}
          />
          <div className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-lg tonal-shadow md:hidden">
            <NavLink
              to="/estatisticas"
              onClick={() => setIsMoreMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`
              }
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                bar_chart
              </span>
              Estatísticas
            </NavLink>
            <NavLink
              to="/configuracoes"
              onClick={() => setIsMoreMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 border-t border-outline-variant/60 px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`
              }
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                settings
              </span>
              Configurações
            </NavLink>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 border-t border-outline-variant/60 px-4 py-3 text-sm font-semibold text-error transition-colors hover:bg-error/5"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                logout
              </span>
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  )
}
