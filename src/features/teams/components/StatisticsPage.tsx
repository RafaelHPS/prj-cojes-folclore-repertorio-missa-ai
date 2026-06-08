import { useEffect, useState } from 'react'

import { useActiveTeam } from '@/hooks/useActiveTeam'
import { ORIGIN_LABEL } from '@/features/songs/songs.schemas'
import type { SongOrigin } from '@/features/songs/types'

import {
  fetchStatsSummary,
  fetchTopSongs,
  fetchSongsByOrigin,
  fetchMassesByMonth,
  fetchMassesByLiturgicalYear,
  fetchTopParts,
} from '../statistics.service'
import type {
  StatsSummary,
  TopSong,
  OriginCount,
  MonthCount,
  LiturgicalYearCount,
  PartCount,
} from '../statistics.service'

// ── Constantes ────────────────────────────────────────────────

const PART_LABEL: Record<string, string> = {
  entrada: 'Entrada',
  ato_penitencial: 'Ato Penitencial',
  hino_de_louvor: 'Glória',
  refrao_orante: 'Refrão Orante',
  salmo: 'Salmo Responsorial',
  sequencia: 'Sequência',
  aclamacao: 'Aclamação ao Evangelho',
  ofertorio: 'Ofertório',
  santo: 'Santo',
  oracao_eucaristica: 'Oração Eucarística',
  doxologia: 'Doxologia Amém',
  cordeiro: 'Cordeiro de Deus',
  comunhao: 'Comunhão',
  pos_comunhao: 'Pós-Comunhão',
  final: 'Final',
}

const LITURGICAL_YEAR_LABEL: Record<string, string> = {
  A: 'Ano A',
  B: 'Ano B',
  C: 'Ano C',
  'Não definido': 'Não definido',
}

// ── Componentes base ──────────────────────────────────────────

function Card({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-lowest tonal-shadow">
      <div className="flex items-center gap-2 border-b border-outline-variant/10 px-6 py-4">
        <span aria-hidden="true" className="material-symbols-outlined text-primary">
          {icon}
        </span>
        <h2 className="font-headline font-bold text-on-surface">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-container-highest">
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string
  value: string | number
  icon: string
  sub?: string
}) {
  return (
    <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-6 tonal-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-outline">{label}</p>
          <p className="mt-2 font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-outline">{sub}</p>}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5 text-primary">
          <span aria-hidden="true" className="material-symbols-outlined">
            {icon}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────

export default function StatisticsPage() {
  const team = useActiveTeam()
  const [isLoading, setIsLoading] = useState(true)

  const [summary, setSummary] = useState<StatsSummary | null>(null)
  const [topSongs, setTopSongs] = useState<TopSong[]>([])
  const [songsByOrigin, setSongsByOrigin] = useState<OriginCount[]>([])
  const [massesByMonth, setMassesByMonth] = useState<MonthCount[]>([])
  const [massesByYear, setMassesByYear] = useState<LiturgicalYearCount[]>([])
  const [topParts, setTopParts] = useState<PartCount[]>([])

  useEffect(() => {
    if (!team) return
    const teamId = team.id

    async function load() {
      setIsLoading(true)
      try {
        const [s, songs, origins, months, years, parts] = await Promise.all([
          fetchStatsSummary(teamId),
          fetchTopSongs(teamId, 10),
          fetchSongsByOrigin(teamId),
          fetchMassesByMonth(teamId),
          fetchMassesByLiturgicalYear(teamId),
          fetchTopParts(teamId),
        ])
        setSummary(s)
        setTopSongs(songs)
        setSongsByOrigin(origins)
        setMassesByMonth(months)
        setMassesByYear(years)
        setTopParts(parts)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [team?.id])

  const maxSongCount = topSongs[0]?.count ?? 1
  const maxMonthCount = Math.max(...massesByMonth.map((m) => m.count), 1)
  const maxOriginCount = songsByOrigin[0]?.count ?? 1
  const maxPartCount = topParts[0]?.count ?? 1
  const currentYear = new Date().getFullYear()

  if (isLoading) {
    return (
      <div
        className="flex h-64 items-center justify-center"
        role="status"
        aria-label="Carregando estatísticas"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <header className="mb-10">
        <nav className="mb-3 flex items-center gap-1.5 text-sm font-medium text-outline">
          <span>Home</span>
          <span aria-hidden="true" className="material-symbols-outlined text-xs">
            chevron_right
          </span>
          <span className="font-semibold text-primary">Estatísticas</span>
        </nav>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface lg:text-5xl">
          Estatísticas
        </h1>
        <p className="mt-2 text-outline">Visão geral do repertório e das celebrações da equipe.</p>
      </header>

      {/* Cards de resumo */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Músicas no repertório"
          value={summary?.totalSongs ?? 0}
          icon="music_note"
        />
        <SummaryCard label="Missas registradas" value={summary?.totalMasses ?? 0} icon="church" />
        <SummaryCard
          label="Missas públicas"
          value={summary?.publicMasses ?? 0}
          icon="public"
          sub={
            summary && summary.totalMasses > 0
              ? `${Math.round((summary.publicMasses / summary.totalMasses) * 100)}% do total`
              : undefined
          }
        />
        <SummaryCard
          label="Média músicas/missa"
          value={summary?.avgSongsPerMass ?? 0}
          icon="playlist_add_check"
          sub="músicas por celebração"
        />
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top músicas */}
        <Card title="Músicas mais usadas" icon="bar_chart">
          {topSongs.length === 0 ? (
            <p className="text-sm text-outline">Nenhuma música usada ainda.</p>
          ) : (
            <ol className="space-y-3">
              {topSongs.map((song, i) => (
                <li key={song.id}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-on-surface">
                          {song.title}
                        </p>
                        {song.artist && (
                          <p className="truncate text-xs text-outline">{song.artist}</p>
                        )}
                      </div>
                    </div>
                    <span className="flex-shrink-0 rounded-full bg-surface-container px-2 py-0.5 text-xs font-bold text-on-surface-variant">
                      {song.count}×
                    </span>
                  </div>
                  <ProgressBar value={song.count} max={maxSongCount} />
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Músicas por origem */}
        <Card title="Músicas por origem" icon="library_music">
          {songsByOrigin.length === 0 ? (
            <p className="text-sm text-outline">Nenhuma música cadastrada.</p>
          ) : (
            <ul className="space-y-4">
              {songsByOrigin.map(({ origin, count }) => (
                <li key={origin}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-on-surface">
                      {ORIGIN_LABEL[origin as SongOrigin] ?? origin}
                    </span>
                    <span className="text-sm font-bold text-on-surface">{count}</span>
                  </div>
                  <ProgressBar value={count} max={maxOriginCount} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Celebrações por mês */}
        <Card title={`Celebrações em ${currentYear}`} icon="calendar_month">
          {massesByMonth.every((m) => m.count === 0) ? (
            <p className="text-sm text-outline">Nenhuma celebração registrada este ano.</p>
          ) : (
            <div className="space-y-2">
              {massesByMonth.map((m) => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className="w-14 flex-shrink-0 text-xs font-semibold text-outline">
                    {m.label}
                  </span>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="h-6 flex-1 overflow-hidden rounded-lg bg-surface-container-highest">
                      <div
                        className="flex h-full items-center justify-end rounded-lg bg-primary px-1.5 transition-all duration-500"
                        style={{
                          width: `${maxMonthCount > 0 ? Math.max(8, (m.count / maxMonthCount) * 100) : 0}%`,
                          display: m.count === 0 ? 'none' : 'flex',
                        }}
                      >
                        {m.count > 0 && (
                          <span className="text-[10px] font-bold text-on-primary">{m.count}</span>
                        )}
                      </div>
                    </div>
                    {m.count === 0 && <span className="text-xs text-outline">—</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Direita: Ano Litúrgico + Momentos mais usados */}
        <div className="space-y-6">
          {/* Distribuição por Ano Litúrgico */}
          <Card title="Distribuição litúrgica" icon="auto_stories">
            {massesByYear.length === 0 ? (
              <p className="text-sm text-outline">Nenhuma missa registrada.</p>
            ) : (
              <ul className="space-y-3">
                {massesByYear.map(({ year, count }) => (
                  <li key={year} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/10 text-xs font-extrabold text-secondary">
                        {year === 'Não definido' ? '?' : year}
                      </span>
                      <span className="text-sm font-medium text-on-surface">
                        {LITURGICAL_YEAR_LABEL[year] ?? year}
                      </span>
                    </div>
                    <span className="rounded-full bg-surface-container px-3 py-0.5 text-sm font-bold text-on-surface-variant">
                      {count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Momentos mais usados */}
          <Card title="Momentos mais usados" icon="queue_music">
            {topParts.length === 0 ? (
              <p className="text-sm text-outline">Nenhum momento registrado.</p>
            ) : (
              <ul className="space-y-3">
                {topParts.slice(0, 6).map(({ part, count }) => (
                  <li key={part}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-on-surface">
                        {PART_LABEL[part] ?? part}
                      </span>
                      <span className="text-sm font-bold text-on-surface">{count}</span>
                    </div>
                    <ProgressBar value={count} max={maxPartCount} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
