import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useActiveTeam } from '@/hooks/useActiveTeam'
import { formatDateTime } from '@/utils/date.util'

import { fetchSongs, deleteSong } from '../songs.service'
import type { Song } from '../types'
import { ORIGIN_LABEL, MASS_PART_LABEL } from '../songs.schemas'

import { DeleteConfirmModal } from './DeleteConfirmModal'
import { FileBadges } from './FileBadges'
import { FileViewerModal } from './FileViewerModal'

type ViewMode = 'grid' | 'list'
type SortKey = 'title' | 'artist' | 'key' | 'origin' | 'created_at' | 'updated_at'
type SortDir = 'asc' | 'desc'

interface SortableThProps {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (k: SortKey) => void
}

function SortableTh({ label, sortKey, current, dir, onSort }: SortableThProps) {
  const isActive = current === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      className="cursor-pointer select-none px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-outline transition hover:text-on-surface"
    >
      <span className="flex items-center gap-1">
        {label}
        <span aria-hidden="true" className="material-symbols-outlined text-sm">
          {isActive ? (dir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}
        </span>
      </span>
    </th>
  )
}

interface ViewerState {
  label: string
  url: string
}

export default function SongsPage() {
  const team = useActiveTeam()
  const navigate = useNavigate()
  const canEdit = team?.role !== 'viewer'
  const canDelete = team?.role === 'admin' || team?.role === 'editor'
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>('grid')
  const [toDelete, setToDelete] = useState<Song | null>(null)
  const [viewer, setViewer] = useState<ViewerState | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    if (!team) return
    const teamId = team.id

    async function load() {
      setIsLoading(true)
      try {
        setSongs(await fetchSongs(teamId))
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [team?.id])

  const filteredSongs = useMemo(() => {
    const q = search.toLowerCase()
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.artist ?? '').toLowerCase().includes(q) ||
        (s.key ?? '').toLowerCase().includes(q) ||
        (s.book_number ?? '').toLowerCase().includes(q) ||
        (s.suggested_parts ?? []).some((p) => MASS_PART_LABEL[p].toLowerCase().includes(q)),
    )
  }, [songs, search])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedSongs = useMemo(() => {
    return [...filteredSongs].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'title') cmp = a.title.localeCompare(b.title, 'pt-BR')
      else if (sortKey === 'artist') cmp = (a.artist ?? '').localeCompare(b.artist ?? '', 'pt-BR')
      else if (sortKey === 'key') cmp = (a.key ?? '').localeCompare(b.key ?? '', 'pt-BR')
      else if (sortKey === 'origin') cmp = a.origin.localeCompare(b.origin, 'pt-BR')
      else if (sortKey === 'created_at') cmp = a.created_at.localeCompare(b.created_at)
      else if (sortKey === 'updated_at') cmp = a.updated_at.localeCompare(b.updated_at)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filteredSongs, sortKey, sortDir])

  async function handleDelete() {
    if (!toDelete) return
    await deleteSong(toDelete.id)
    setSongs((prev) => prev.filter((s) => s.id !== toDelete.id))
  }

  return (
    <div>
      {/* Page header */}
      <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="mb-3 flex items-center gap-1.5 text-sm font-medium text-outline">
            <span>Home</span>
            <span aria-hidden="true" className="material-symbols-outlined text-xs">
              chevron_right
            </span>
            <span className="font-semibold text-primary">Músicas</span>
          </nav>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface lg:text-5xl">
            Músicas
          </h1>
          <p className="mt-2 text-outline">
            {songs.length} música{songs.length !== 1 ? 's' : ''} no repertório
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => navigate('/musicas/nova')}
            className="flex w-fit items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition hover:bg-secondary"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              add
            </span>
            Nova música
          </button>
        )}
      </header>

      {/* Filter bar */}
      <section className="mb-8 rounded-3xl bg-surface-container-low p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-sm">
            <span
              aria-hidden="true"
              className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline"
            >
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar título, artista, tom…"
              aria-label="Buscar músicas"
              className="w-full rounded-2xl border-none bg-surface-container-lowest py-3 pl-12 pr-4 text-sm text-on-surface outline-none placeholder:text-outline focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Ordenação (sempre visível) */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="song-sort"
              className="text-xs font-semibold text-outline whitespace-nowrap"
            >
              Ordenar por
            </label>
            <select
              id="song-sort"
              value={`${sortKey}-${sortDir}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split('-') as [SortKey, SortDir]
                setSortKey(k)
                setSortDir(d)
              }}
              className="rounded-xl border-none bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="title-asc">Nome A→Z</option>
              <option value="title-desc">Nome Z→A</option>
              <option value="artist-asc">Artista A→Z</option>
              <option value="artist-desc">Artista Z→A</option>
              <option value="key-asc">Tom A→Z</option>
              <option value="key-desc">Tom Z→A</option>
              <option value="origin-asc">Origem A→Z</option>
              <option value="origin-desc">Origem Z→A</option>
              <option value="updated_at-desc">Atualização recente</option>
              <option value="updated_at-asc">Atualização antiga</option>
              <option value="created_at-desc">Adição recente</option>
              <option value="created_at-asc">Adição antiga</option>
            </select>
          </div>

          <div
            className="flex overflow-hidden rounded-xl bg-surface-container p-1"
            role="group"
            aria-label="Modo de visualização"
          >
            <button
              onClick={() => setView('grid')}
              aria-pressed={view === 'grid'}
              aria-label="Grade"
              className={`rounded-lg p-2 transition ${view === 'grid' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-outline hover:text-on-surface'}`}
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                grid_view
              </span>
            </button>
            <button
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
              aria-label="Lista"
              className={`rounded-lg p-2 transition ${view === 'list' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-outline hover:text-on-surface'}`}
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                format_list_bulleted
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Content */}
      {isLoading ? (
        <div
          className="flex justify-center py-20"
          role="status"
          aria-live="polite"
          aria-label="Carregando"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span aria-hidden="true" className="material-symbols-outlined mb-4 text-5xl text-outline">
            music_off
          </span>
          <p className="font-headline text-lg font-bold text-on-surface">
            {search ? 'Nenhuma música encontrada' : 'Repertório vazio'}
          </p>
          <p className="mt-1 text-sm text-outline">
            {search ? 'Tente outro termo de busca.' : 'Clique em "Nova música" para começar.'}
          </p>
        </div>
      ) : view === 'grid' ? (
        <GridView
          songs={sortedSongs}
          onEdit={(song) => navigate(`/musicas/${song.id}/editar`, { state: { song } })}
          onDelete={setToDelete}
          onView={(label, url) => setViewer({ label, url })}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      ) : (
        <ListView
          songs={sortedSongs}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onEdit={(song) => navigate(`/musicas/${song.id}/editar`, { state: { song } })}
          onDelete={setToDelete}
          onView={(label, url) => setViewer({ label, url })}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}

      {viewer && (
        <FileViewerModal title={viewer.label} url={viewer.url} onClose={() => setViewer(null)} />
      )}

      {toDelete && (
        <DeleteConfirmModal
          song={toDelete}
          onClose={() => setToDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

// ── Sub-views ─────────────────────────────────────────────────

interface ViewProps {
  songs: Song[]
  onEdit: (song: Song) => void
  onDelete: (song: Song) => void
  onView: (label: string, url: string) => void
  canEdit: boolean
  canDelete: boolean
  sortKey?: SortKey
  sortDir?: SortDir
  onSort?: (k: SortKey) => void
}

function GridView({ songs, onEdit, onDelete, onView, canEdit, canDelete }: ViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {songs.map((song) => (
        <div
          key={song.id}
          className="group relative overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 tonal-shadow transition-all hover:border-primary/20 hover:shadow-md"
        >
          {/* Icon */}
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/5 text-primary">
            <span aria-hidden="true" className="material-symbols-outlined">
              music_note
            </span>
          </div>

          <p className="font-headline pr-14 font-bold text-on-surface truncate">{song.title}</p>
          {song.artist && <p className="mt-0.5 truncate text-sm text-outline">{song.artist}</p>}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {song.key && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                {song.key}
              </span>
            )}
            {song.origin !== 'outros' && (
              <span className="rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-semibold text-secondary">
                {ORIGIN_LABEL[song.origin]}
                {song.book_number && ` nº ${song.book_number}`}
              </span>
            )}
          </div>

          {(song.suggested_parts ?? []).length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {song.suggested_parts.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-outline-variant/40 bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant"
                >
                  {MASS_PART_LABEL[p]}
                </span>
              ))}
            </div>
          )}

          <FileBadges song={song} onView={onView} />

          <div className="mt-3 space-y-0.5">
            <p className="text-xs text-outline">Adicionado em {formatDateTime(song.created_at)}</p>
            {song.updated_at !== song.created_at && (
              <p className="text-xs text-outline">
                Atualizado em {formatDateTime(song.updated_at)}
              </p>
            )}
          </div>

          {/* Hover actions */}
          {(canEdit || canDelete) && (
            <div className="absolute right-3 top-3 flex gap-1 opacity-100 md:opacity-0 transition-opacity md:group-hover:opacity-100">
              {canEdit && (
                <button
                  onClick={() => onEdit(song)}
                  aria-label={`Editar ${song.title}`}
                  className="rounded-xl p-2 text-outline transition hover:bg-primary/5 hover:text-primary"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">
                    edit
                  </span>
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(song)}
                  aria-label={`Remover ${song.title}`}
                  className="rounded-xl p-2 text-outline transition hover:bg-error/5 hover:text-error"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-lg">
                    delete
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ListView({
  songs,
  onEdit,
  onDelete,
  onView,
  canEdit,
  canDelete,
  sortKey = 'title',
  sortDir = 'asc',
  onSort = () => {},
}: ViewProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-outline-variant/10 bg-surface-container-lowest tonal-shadow">
      {/* Mobile: cards */}
      <div className="md:hidden divide-y divide-outline-variant/10">
        {songs.map((song) => (
          <div key={song.id} className="flex items-center gap-3 px-4 py-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary">
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                music_note
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-on-surface">{song.title}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                {song.artist && (
                  <span className="truncate text-xs text-outline">{song.artist}</span>
                )}
                {song.key && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                    {song.key}
                  </span>
                )}
                {song.origin !== 'outros' && (
                  <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">
                    {ORIGIN_LABEL[song.origin]}
                    {song.book_number && ` nº ${song.book_number}`}
                  </span>
                )}
              </div>
              {(song.suggested_parts ?? []).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {song.suggested_parts.map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-outline-variant/40 bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant"
                    >
                      {MASS_PART_LABEL[p]}
                    </span>
                  ))}
                </div>
              )}
              <FileBadges song={song} onView={onView} />
            </div>
            {(canEdit || canDelete) && (
              <div className="flex flex-shrink-0 gap-1">
                {canEdit && (
                  <button
                    onClick={() => onEdit(song)}
                    aria-label={`Editar ${song.title}`}
                    className="rounded-lg p-2 text-outline transition hover:bg-primary/5 hover:text-primary"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-lg">
                      edit
                    </span>
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => onDelete(song)}
                    aria-label={`Remover ${song.title}`}
                    className="rounded-lg p-2 text-outline transition hover:bg-error/5 hover:text-error"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-lg">
                      delete
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: tabela completa */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-[700px] w-full text-sm">
          <thead>
            <tr className="bg-surface-container-low/50">
              <SortableTh
                label="Título"
                sortKey="title"
                current={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                label="Artista"
                sortKey="artist"
                current={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                label="Tom"
                sortKey="key"
                current={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                label="Origem"
                sortKey="origin"
                current={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-outline">
                Momentos
              </th>
              <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-outline">
                Arquivos
              </th>
              <SortableTh
                label="Adicionado em"
                sortKey="created_at"
                current={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <SortableTh
                label="Atualizado em"
                sortKey="updated_at"
                current={sortKey}
                dir={sortDir}
                onSort={onSort}
              />
              <th className="px-8 py-5 text-right text-xs font-bold uppercase tracking-wider text-outline">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {songs.map((song) => (
              <tr
                key={song.id}
                className="group transition-colors hover:bg-surface-container-low/30"
              >
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                      <span aria-hidden="true" className="material-symbols-outlined text-lg">
                        music_note
                      </span>
                    </div>
                    <span className="font-bold text-on-surface">{song.title}</span>
                  </div>
                </td>
                <td className="px-6 py-5 text-on-surface-variant">{song.artist ?? '—'}</td>
                <td className="px-6 py-5">
                  {song.key ? (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                      {song.key}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-6 py-5">
                  {song.origin !== 'outros' ? (
                    <div>
                      <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">
                        {ORIGIN_LABEL[song.origin]}
                      </span>
                      {song.book_number && (
                        <span className="ml-1.5 text-xs text-outline">nº {song.book_number}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-outline">Outros</span>
                  )}
                </td>
                <td className="px-6 py-5">
                  {(song.suggested_parts ?? []).length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {song.suggested_parts.map((p) => (
                        <span
                          key={p}
                          className="rounded-full border border-outline-variant/40 bg-surface-container px-2 py-0.5 text-xs text-on-surface-variant"
                        >
                          {MASS_PART_LABEL[p]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-outline">—</span>
                  )}
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-1.5">
                    {song.partitura_url && (
                      <button
                        onClick={() => onView('Partitura', song.partitura_url!)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Partitura
                      </button>
                    )}
                    {song.letra_url && (
                      <button
                        onClick={() => onView('Letra', song.letra_url!)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Letra
                      </button>
                    )}
                    {song.cifra_url && (
                      <button
                        onClick={() => onView('Cifra', song.cifra_url!)}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Cifra
                      </button>
                    )}
                    {song.audio_url && (
                      <a
                        href={song.audio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Áudio
                      </a>
                    )}
                    {!song.partitura_url &&
                      !song.letra_url &&
                      !song.cifra_url &&
                      !song.audio_url && <span className="text-xs text-outline">—</span>}
                  </div>
                </td>
                <td className="px-6 py-5 text-xs text-outline">
                  {formatDateTime(song.created_at)}
                </td>
                <td className="px-6 py-5 text-xs text-outline">
                  {song.updated_at !== song.created_at ? formatDateTime(song.updated_at) : '—'}
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    {canEdit && (
                      <button
                        onClick={() => onEdit(song)}
                        aria-label={`Editar ${song.title}`}
                        className="rounded-lg p-2 text-outline transition hover:bg-primary/5 hover:text-primary"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">
                          edit
                        </span>
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => onDelete(song)}
                        aria-label={`Remover ${song.title}`}
                        className="rounded-lg p-2 text-outline transition hover:bg-error/5 hover:text-error"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">
                          delete
                        </span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* end desktop */}
    </div>
  )
}
