import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useActiveTeam } from '@/hooks/useActiveTeam'
import { formatDateShort, formatTime } from '@/utils/date.util'

import {
  fetchUpcomingMasses,
  fetchMassCount,
  fetchTopSongs,
} from '@/features/masses/masses.service'
import { fetchSongCount } from '@/features/songs/songs.service'
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
    <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-6 tonal-shadow transition-all hover:shadow-md">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
        <span aria-hidden="true" className="material-symbols-outlined text-xl">
          {icon}
        </span>
      </div>
      <p className="font-headline text-3xl text-on-surface">{value}</p>
      <p className="mt-1 text-xs font-semibold text-on-surface-variant">{label}</p>
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
        const [sCount, mCount, upcoming, top] = await Promise.all([
          fetchSongCount(team.id),
          fetchMassCount(team.id),
          fetchUpcomingMasses(team.id, 5),
          fetchTopSongs(team.id, 5),
        ])
        setSongCount(sCount)
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
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status" aria-label="Carregando">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <header className="mb-10">
        <p className="text-xs font-bold uppercase tracking-wider text-outline">{todayLabel}</p>
        <h1 className="font-headline mt-1.5 text-2xl text-on-surface lg:text-3xl">{team?.name}</h1>
        <p className="mt-2 text-outline">Bem-vindo ao seu painel de gestão litúrgica.</p>
      </header>

      {/* Stat cards */}
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Músicas no repertório" value={songCount} icon="music_note" to="/musicas" />
        <StatCard label="Missas registradas" value={massCount} icon="church" to="/missas" />
        <StatCard
          label="Próximas celebrações"
          value={upcomingMasses.length}
          icon="upcoming"
          to="/missas"
        />
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Próximas missas */}
        <section
          aria-labelledby="upcoming-title"
          className="overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-lowest tonal-shadow"
        >
          <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-4">
            <h2 id="upcoming-title" className="font-headline font-bold text-on-surface">
              Próximas celebrações
            </h2>
            <Link
              to="/missas"
              className="text-sm font-semibold text-primary transition hover:text-secondary"
            >
              Ver todas
            </Link>
          </div>

          {upcomingMasses.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-4xl text-outline block mb-2"
              >
                event_busy
              </span>
              <p className="text-sm text-outline">Nenhuma missa agendada.</p>
              <Link
                to="/missas"
                className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
              >
                Criar celebração
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant/10">
              {upcomingMasses.map((mass) => (
                <li
                  key={mass.id}
                  className="flex items-center justify-between gap-3 px-6 py-4 transition-colors hover:bg-surface-container-low/50"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                      <span aria-hidden="true" className="material-symbols-outlined text-lg">
                        church
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-on-surface">{mass.title}</p>
                      <p className="text-xs text-outline">
                        {formatDateShort(mass.date)}
                        {mass.time && ` · ${formatTime(mass.time)}`}
                        {mass.liturgical_year &&
                          ` · ${LITURGICAL_YEAR_LABEL[mass.liturgical_year]}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {mass.is_public && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                        Público
                      </span>
                    )}
                    <Link
                      to={`/missas/${mass.id}/gerenciar`}
                      className="flex items-center gap-1 rounded-xl bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/15"
                      aria-label={`Ver repertório de ${mass.title}`}
                    >
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined text-sm leading-none"
                      >
                        queue_music
                      </span>
                      <span className="hidden sm:inline">Repertório</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Músicas mais usadas */}
        <section
          aria-labelledby="topsongs-title"
          className="overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-lowest tonal-shadow"
        >
          <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-4">
            <h2 id="topsongs-title" className="font-headline font-bold text-on-surface">
              Músicas mais usadas
            </h2>
            <Link
              to="/musicas"
              className="text-sm font-semibold text-primary transition hover:text-secondary"
            >
              Ver repertório
            </Link>
          </div>

          {topSongs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-4xl text-outline block mb-2"
              >
                music_off
              </span>
              <p className="text-sm text-outline">Nenhuma música usada ainda.</p>
            </div>
          ) : (
            <ol className="divide-y divide-outline-variant/10">
              {topSongs.map((song, i) => (
                <li
                  key={song.id}
                  className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-container-low/50"
                >
                  <span
                    aria-label={`${i + 1}º lugar`}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-on-surface">{song.title}</p>
                    {song.artist && <p className="truncate text-xs text-outline">{song.artist}</p>}
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-bold text-on-surface-variant">
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
