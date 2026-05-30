import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/app/app.store'
import { useLogout } from '@/features/auth/hooks/useAuth'
import type { UserRole } from '@/types/database'

interface TeamWithRole {
  id: string
  name: string
  slug: string | null
  role: UserRole
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  contributor: 'Colaborador',
  viewer: 'Visualizador',
}

type TeamRow = {
  role: string
  teams: { id: string; name: string; slug: string | null } | null
}

export default function SelectTeamPage() {
  const [teams, setTeams] = useState<TeamWithRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const setActiveTeam = useAppStore((s) => s.setActiveTeam)
  const navigate = useNavigate()
  const logout = useLogout()

  useEffect(() => {
    async function loadTeams() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setIsLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('team_members')
        .select('role, teams(id, name, slug)')
        .eq('user_id', user.id)

      if (fetchError) {
        setError(fetchError.message)
        setIsLoading(false)
        return
      }

      const mapped: TeamWithRole[] = ((data ?? []) as TeamRow[]).flatMap((row) => {
        if (!row.teams) return []
        return [
          {
            id: row.teams.id,
            name: row.teams.name,
            slug: row.teams.slug,
            role: row.role as UserRole,
          },
        ]
      })

      setTeams(mapped)
      setIsLoading(false)
    }

    void loadTeams()
  }, [])

  function handleSelectTeam(team: TeamWithRole) {
    setActiveTeam({ id: team.id, name: team.name, role: team.role })
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary shadow-lg shadow-primary/30">
            <span aria-hidden="true" className="material-symbols-outlined text-3xl text-on-primary">
              groups
            </span>
          </div>
          <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
            Selecionar equipe
          </h1>
          <p className="mt-1 text-sm text-outline">Escolha com qual equipe deseja trabalhar</p>
        </div>

        {isLoading ? (
          <div
            className="flex justify-center py-12"
            role="status"
            aria-live="polite"
            aria-label="Carregando equipes"
          >
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-3xl border border-error/20 bg-error/5 p-6 text-center"
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-3xl text-error mb-2 block"
            >
              error
            </span>
            <p className="text-sm font-semibold text-error">Erro ao carregar equipes</p>
            <p className="mt-1 text-xs text-outline">{error}</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-10 text-center tonal-shadow">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-4xl text-outline mb-3 block"
            >
              group_off
            </span>
            <p className="font-semibold text-on-surface">Nenhuma equipe encontrada</p>
            <p className="mt-1 text-sm text-outline">Você não pertence a nenhuma equipe ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleSelectTeam(team)}
                className="group w-full rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 text-left tonal-shadow transition-all hover:border-primary/30 hover:bg-surface-container-low"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5 text-primary transition-colors group-hover:bg-primary/10">
                      <span aria-hidden="true" className="material-symbols-outlined">
                        church
                      </span>
                    </div>
                    <div>
                      <p className="font-headline font-bold text-on-surface">{team.name}</p>
                      {team.slug && <p className="text-xs text-outline">{team.slug}</p>}
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {ROLE_LABEL[team.role]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={logout}
          className="mt-8 flex w-full items-center justify-center gap-1.5 text-sm font-medium text-outline transition hover:text-primary"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            logout
          </span>
          Sair da conta
        </button>
      </div>
    </div>
  )
}
