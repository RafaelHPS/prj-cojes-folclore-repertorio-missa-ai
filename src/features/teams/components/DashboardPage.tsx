import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useActiveTeam } from '@/hooks/useActiveTeam'
import { formatDateShort, formatTime } from '@/utils/date.util'

import { fetchUpcomingMasses, fetchMassCount, fetchTopSongs } from '@/features/masses/masses.service'
import { fetchSongs } from '@/features/songs/songs.service'
import type { Mass } from '@/features/masses/types'

const LITURGICAL_YEAR_LABEL = { A: 'Ano A', B: 'Ano B', C: 'Ano C' } as const

interface StatCardProps {
  label: string
  value: number | string
  icon: string
  to?: string
}

function StatCard({ label, value, icon, to }: StatCardProps) {
  const content = (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span aria-hidden="true" className="text-2xl">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

interface TopSong {
  id: string
  title: string
  artist: string | null
  count: number
}

export default function DashboardPage() {
  const team = useActiveTeam()
  const [isLoading, setIsLoading] = useState(true)
  const [songCount, setSongCount] = useState(0)
  const [massCount, setMassCount] = useState(0)
  const [upcomingMasses, setUpcomingMasses] = useState<Mass[]>([])
  const [topSongs, setTopSongs] = useState<TopSong[]>([])

  useEffect(() => {
    if (!team) return

    async function loadDashboard() {
      if (!team) return
      setIsLoading(true)
      try {
        const [songs, mCount, upcoming, top] = await Promise.all([
          fetchSongs(team.id),
          fetchMassCount(team.id),
          fetchUpcomingMasses(team.id, 5),
          fetchTopSongs(team.id, 5),
        ])
        setSongCount(songs.length)
        setMassCount(mCount)
        setUpcomingMasses(upcoming)
        setTopSongs(top)
      } finally {
        setIsLoading(false)
      }
    }

    void loadDashboard()
  }, [team])

  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center" role="status" aria-live="polite" aria-label="Carregando dashboard">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="mb-8">
        <p className="text-sm capitalize text-gray-400">{todayLabel}</p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">Olá, {team?.name} 👋</h1>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Músicas no repertório" value={songCount} icon="♪" to="/musicas" />
        <StatCard label="Missas registradas" value={massCount} icon="✦" to="/missas" />
        <StatCard label="Próximas celebrações" value={upcomingMasses.length} icon="📅" to="/missas" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="upcoming-masses-title" className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 id="upcoming-masses-title" className="font-semibold text-gray-800">Próximas celebrações</h2>
            <Link to="/missas" className="text-sm text-violet-600 hover:underline">Ver todas</Link>
          </div>

          {upcomingMasses.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-gray-400">Nenhuma missa agendada.</p>
              <Link to="/missas" className="mt-2 inline-block text-sm text-violet-600 hover:underline">
                Criar celebração
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {upcomingMasses.map((mass) => (
                <li key={mass.id} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{mass.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {formatDateShort(mass.date)}
                      {mass.time && ` · ${formatTime(mass.time)}`}
                      {mass.liturgical_year && ` · ${LITURGICAL_YEAR_LABEL[mass.liturgical_year]}`}
                    </p>
                  </div>
                  {mass.is_public && (
                    <span className="ml-3 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      Público
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="top-songs-title" className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 id="top-songs-title" className="font-semibold text-gray-800">Músicas mais usadas</h2>
            <Link to="/musicas" className="text-sm text-violet-600 hover:underline">Ver repertório</Link>
          </div>

          {topSongs.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-gray-400">Nenhuma música usada ainda.</p>
            </div>
          ) : (
            <ol className="divide-y divide-gray-100">
              {topSongs.map((song, i) => (
                <li key={song.id} className="flex items-center gap-4 px-6 py-4">
                  <span
                    aria-label={`${i + 1}º lugar`}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{song.title}</p>
                    {song.artist && <p className="truncate text-xs text-gray-400">{song.artist}</p>}
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {song.count}×
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
