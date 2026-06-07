import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'

import { useActiveTeam } from '@/hooks/useActiveTeam'
import { fetchSongs } from '@/features/songs/songs.service'
import type { Song } from '@/features/songs/types'
import { ORIGIN_LABEL, BOOK_ORIGINS } from '@/features/songs/songs.schemas'
import { FileViewerModal } from '@/features/songs/components/FileViewerModal'
import type { MassPart } from '@/types/database'

import { addSongToMass, fetchMassSongs } from '../masses.service'

// ── Arquivos disponíveis por música ───────────────────────────

const FILE_META = [
  { key: 'partitura_url', label: 'Partitura', icon: 'description' },
  { key: 'letra_url', label: 'Letra', icon: 'article' },
  { key: 'cifra_url', label: 'Cifra', icon: 'piano' },
  { key: 'singer_file_url', label: 'Cantor', icon: 'mic' },
  { key: 'instrumental_file_url', label: 'Instrumentos', icon: 'queue_music' },
] as const

type FileKey = (typeof FILE_META)[number]['key']

interface ViewerState {
  title: string
  url: string
}

const PART_LABEL: Record<MassPart, string> = {
  entrada: 'Entrada',
  ato_penitencial: 'Ato Penitencial',
  hino_de_louvor: 'Glória',
  salmo: 'Salmo Responsorial',
  sequencia: 'Sequência',
  aclamacao: 'Aclamação ao Evangelho',
  ofertorio: 'Ofertório',
  santo: 'Santo',
  cordeiro: 'Cordeiro de Deus',
  comunhao: 'Comunhão',
  pos_comunhao: 'Pós-Comunhão',
  final: 'Final',
}

interface LocationState {
  songs?: Song[]
  currentCount?: number
  existingIds?: string[]
}

export default function SongPickerPage() {
  const { id: massId, part } = useParams<{ id: string; part: string }>()
  const { state } = useLocation() as { state: LocationState | null }
  const navigate = useNavigate()
  const team = useActiveTeam()

  const [songs, setSongs] = useState<Song[]>(state?.songs ?? [])
  const [isLoading, setIsLoading] = useState(!state?.songs)
  const [currentCount, setCurrentCount] = useState(state?.currentCount ?? 0)
  const [existingIds] = useState<Set<string>>(new Set(state?.existingIds ?? []))
  const [search, setSearch] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [viewer, setViewer] = useState<ViewerState | null>(null)

  const massPart = part as MassPart
  const partLabel = PART_LABEL[massPart] ?? part

  useEffect(() => {
    if (state?.songs) return
    if (!team) return

    async function load() {
      setIsLoading(true)
      try {
        const [fetchedSongs, massSongs] = await Promise.all([
          fetchSongs(team!.id),
          massId ? fetchMassSongs(massId) : Promise.resolve([]),
        ])
        setSongs(fetchedSongs)
        const partSongs = massSongs.filter((s) => s.part === massPart)
        setCurrentCount(partSongs.length)
        partSongs.forEach((s) => existingIds.add(s.song_id))
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [team?.id, massId, massPart, state?.songs])

  const available = useMemo(() => songs.filter((s) => !existingIds.has(s.id)), [songs, existingIds])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const matches = available.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.artist ?? '').toLowerCase().includes(q) ||
        (s.key ?? '').toLowerCase().includes(q) ||
        (s.book_number ?? '').toLowerCase().includes(q),
    )
    // Sugeridas para esta parte aparecem primeiro
    return [
      ...matches.filter((s) => s.suggested_parts?.includes(massPart)),
      ...matches.filter((s) => !s.suggested_parts?.includes(massPart)),
    ]
  }, [available, search, massPart])

  const hiddenCount = songs.length - available.length

  async function handleSelect(song: Song) {
    if (!massId || isAdding) return
    setAddError(null)
    setIsAdding(true)
    try {
      await addSongToMass(massId, song.id, massPart, currentCount)
      navigate(`/missas/${massId}/gerenciar`)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Erro ao adicionar música.')
      setIsAdding(false)
    }
  }

  const backUrl = `/missas/${massId}/gerenciar`

  return (
    <div className="mx-auto max-w-lg">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm font-medium text-outline">
        <Link to="/missas" className="transition-colors hover:text-primary">
          Missas
        </Link>
        <span aria-hidden="true" className="material-symbols-outlined text-xs">
          chevron_right
        </span>
        <Link to={backUrl} className="transition-colors hover:text-primary">
          Repertório
        </Link>
        <span aria-hidden="true" className="material-symbols-outlined text-xs">
          chevron_right
        </span>
        <span className="font-semibold text-primary">Adicionar música</span>
      </nav>

      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-outline">{partLabel}</p>
        <h1 className="font-headline mt-1 text-3xl font-extrabold tracking-tight text-on-surface">
          Adicionar música
        </h1>
      </div>

      {/* Busca */}
      <div className="mb-4">
        <div className="relative">
          <span
            aria-hidden="true"
            className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline"
          >
            search
          </span>
          <input
            autoFocus
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, artista, tom ou nº…"
            aria-label="Buscar música"
            className="w-full rounded-2xl border border-outline-variant bg-surface-container-lowest py-3 pl-12 pr-4 text-sm text-on-surface outline-none placeholder:text-outline transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {hiddenCount > 0 && (
        <p className="mb-4 rounded-2xl bg-surface-container-low px-4 py-2.5 text-xs text-outline">
          {hiddenCount} música{hiddenCount !== 1 ? 's' : ''} já adicionada
          {hiddenCount !== 1 ? 's' : ''} nesta parte e ocultada{hiddenCount !== 1 ? 's' : ''}.
        </p>
      )}

      {addError && (
        <p role="alert" className="mb-4 rounded-2xl bg-error/5 px-4 py-3 text-sm text-error">
          {addError}
        </p>
      )}

      {/* Lista */}
      <div className="overflow-hidden rounded-3xl border border-outline-variant/10 bg-surface-container-lowest tonal-shadow">
        {isLoading ? (
          <div className="flex justify-center py-16" role="status" aria-label="Carregando">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <span
              aria-hidden="true"
              className="material-symbols-outlined mb-3 text-4xl text-outline"
            >
              music_off
            </span>
            <p className="text-sm font-semibold text-on-surface">
              {search ? 'Nenhuma música encontrada.' : 'Nenhuma música no repertório.'}
            </p>
            {!search && (
              <Link
                to="/musicas/nova"
                className="mt-3 text-sm font-semibold text-primary hover:underline"
              >
                Adicionar músicas ao repertório
              </Link>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant/10">
            {filtered.map((song) => {
              const availableFiles = FILE_META.filter((f) => !!song[f.key as FileKey])
              const hasAudio = !!song.audio_url
              return (
                <li key={song.id} className="flex items-stretch">
                  {/* Área clicável para selecionar — ocupa todo o espaço menos os botões de arquivo */}
                  <button
                    onClick={() => void handleSelect(song)}
                    disabled={isAdding}
                    className="min-w-0 flex-1 px-5 py-4 text-left transition hover:bg-surface-container-low disabled:opacity-60"
                  >
                    {/* Título + badge Sugerida */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-semibold text-on-surface">{song.title}</p>
                      {song.suggested_parts?.includes(massPart) && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                          Sugerida
                        </span>
                      )}
                    </div>

                    {/* Artista + Tom */}
                    {(song.artist || song.key) && (
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {song.artist && <span className="text-xs text-outline">{song.artist}</span>}
                        {song.key && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                            {song.key}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Origem + Número */}
                    {song.origin !== 'outros' && BOOK_ORIGINS.includes(song.origin) && (
                      <p className="mt-0.5 text-xs text-secondary">
                        {ORIGIN_LABEL[song.origin]}
                        {song.book_number && ` · nº ${song.book_number}`}
                      </p>
                    )}

                    {/* Ícones de arquivos disponíveis — clicáveis inline */}
                    {(availableFiles.length > 0 || hasAudio) && (
                      <div
                        className="mt-2 flex flex-wrap gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {availableFiles.map((f) => (
                          <button
                            key={f.key}
                            type="button"
                            onClick={() =>
                              setViewer({
                                title: `${f.label} · ${song.title}`,
                                url: song[f.key as FileKey]!,
                              })
                            }
                            aria-label={`Abrir ${f.label} de ${song.title}`}
                            className="flex items-center gap-1 rounded-full border border-outline-variant/40 bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-on-surface-variant transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                          >
                            <span
                              aria-hidden="true"
                              className="material-symbols-outlined text-sm leading-none"
                            >
                              {f.icon}
                            </span>
                            {f.label}
                          </button>
                        ))}
                        {hasAudio && (
                          <a
                            href={song.audio_url!}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Ouvir áudio de ${song.title}`}
                            className="flex items-center gap-1 rounded-full border border-outline-variant/40 bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-on-surface-variant transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                          >
                            <span
                              aria-hidden="true"
                              className="material-symbols-outlined text-sm leading-none"
                            >
                              headphones
                            </span>
                            Áudio
                          </a>
                        )}
                      </div>
                    )}
                  </button>

                  {/* Indicador de carregamento à direita */}
                  {isAdding && (
                    <div className="flex items-center pr-5">
                      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Rodapé */}
      <div className="mt-6 flex justify-between text-sm text-outline">
        <span>
          {filtered.length} música{filtered.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => navigate(backUrl)}
          className="font-semibold text-primary hover:underline"
        >
          Cancelar
        </button>
      </div>

      {/* Visualizador de arquivos */}
      {viewer && (
        <FileViewerModal title={viewer.title} url={viewer.url} onClose={() => setViewer(null)} />
      )}
    </div>
  )
}
