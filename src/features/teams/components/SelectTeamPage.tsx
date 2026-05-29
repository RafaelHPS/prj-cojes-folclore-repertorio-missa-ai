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
      const { data, error: fetchError } = await supabase
        .from('team_members')
        .select('role, teams(id, name, slug)')

      if (fetchError) {
        setError(fetchError.message)
        setIsLoading(false)
        return
      }

      const mapped: TeamWithRole[] = ((data ?? []) as TeamRow[]).flatMap((row) => {
        if (!row.teams) return []
        return [{ id: row.teams.id, name: row.teams.name, slug: row.teams.slug, role: row.role as UserRole }]
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <div aria-hidden="true" className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-2xl text-white shadow-lg">✦</div>
          <h1 className="text-2xl font-bold text-gray-900">Selecionar equipe</h1>
          <p className="mt-1 text-sm text-gray-500">Escolha com qual equipe deseja trabalhar</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12" role="status" aria-live="polite" aria-label="Carregando equipes">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-700">Erro ao carregar equipes</p>
            <p className="mt-1 text-xs text-red-500">{error}</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">Você não pertence a nenhuma equipe ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => handleSelectTeam(team)}
                className="w-full rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:border-violet-400 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{team.name}</p>
                    {team.slug && <p className="mt-0.5 text-sm text-gray-400">{team.slug}</p>}
                  </div>
                  <span className="ml-4 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                    {ROLE_LABEL[team.role]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={logout}
          className="mt-6 w-full text-center text-sm text-gray-400 transition hover:text-gray-600 hover:underline"
        >
          Sair da conta
        </button>
      </div>
    </div>
  )
}
