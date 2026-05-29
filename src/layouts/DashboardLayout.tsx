import { useRef, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'

import { useLogout } from '@/features/auth/hooks/useAuth'
import { useActiveTeam } from '@/hooks/useActiveTeam'
import { useAppStore } from '@/app/app.store'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/missas', label: 'Missas' },
  { to: '/musicas', label: 'Músicas' },
  { to: '/estatisticas', label: 'Estatísticas' },
  { to: '/configuracoes', label: 'Configurações' },
] as const

export function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const logout = useLogout()
  const activeTeam = useActiveTeam()
  const setActiveTeam = useAppStore((s) => s.setActiveTeam)
  const navigate = useNavigate()

  function handleSwitchTeam() {
    setActiveTeam(null)
    navigate('/selecionar-equipe')
    setIsUserMenuOpen(false)
  }

  async function handleLogout() {
    setIsUserMenuOpen(false)
    await logout()
  }

  const initial = activeTeam?.name?.[0]?.toUpperCase() ?? 'E'

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Top Nav ─────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-surface-container-lowest/80 glass-nav tonal-shadow border-b border-outline-variant/20">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-3">
          {/* Logo + links desktop */}
          <div className="flex items-center gap-8">
            <span className="font-headline text-lg font-bold tracking-tight text-primary">
              Repertório de Missas
            </span>
            <div
              className="hidden items-center gap-6 md:flex"
              role="navigation"
              aria-label="Navegação principal"
            >
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive
                      ? 'border-b-2 border-primary pb-0.5 text-sm font-semibold text-primary'
                      : 'text-sm font-medium text-on-surface-variant transition-colors hover:text-primary'
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Ações direita */}
          <div className="flex items-center gap-3">
            {/* User menu */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setIsUserMenuOpen((v) => !v)}
                aria-label="Menu do usuário"
                aria-expanded={isUserMenuOpen}
                className="flex items-center gap-3"
              >
                <div className="hidden text-right lg:block">
                  <p className="text-xs font-bold text-on-surface">{activeTeam?.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-outline capitalize">
                    {activeTeam?.role}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary-container font-bold text-white">
                  {initial}
                </div>
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-lg tonal-shadow">
                  <div className="border-b border-outline-variant/10 px-4 py-3">
                    <p className="text-xs font-bold text-on-surface">{activeTeam?.name}</p>
                    <p className="text-[10px] capitalize text-outline">{activeTeam?.role}</p>
                  </div>
                  <button
                    onClick={handleSwitchTeam}
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
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

            {/* Hamburger mobile */}
            <button
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={isMobileMenuOpen}
              className="rounded-xl p-2 text-on-surface-variant transition hover:bg-surface-container-low md:hidden"
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {isMobileMenuOpen && (
          <div className="border-t border-outline-variant/10 md:hidden">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-6 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/5 text-primary font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Overlay para fechar user menu ao clicar fora */}
      {isUserMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          aria-hidden="true"
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}

      {/* ── Conteúdo ────────────────────────────────── */}
      <main className="mx-auto max-w-screen-2xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
