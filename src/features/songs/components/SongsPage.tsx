import { useEffect, useState, useMemo } from 'react'

import { useActiveTeam } from '@/hooks/useActiveTeam'
import { formatDateTime } from '@/utils/date.util'

import { fetchSongs, createSong, updateSong, deleteSong } from '../songs.service'
import type { SongFileType } from '../songs.service'
import type { Song } from '../types'
import type { SongFormData } from '../songs.schemas'
import { ORIGIN_LABEL } from '../songs.schemas'

import { SongModal } from './SongModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { FileBadges } from './FileBadges'
import { FileViewerModal } from './FileViewerModal'

const EMPTY_FORM: SongFormData = {
  title: '',
  artist: '',
  key: '',
  origin: 'outros',
  book_number: '',
}

type ViewMode = 'grid' | 'list'

interface ModalState {
  mode: 'create' | 'edit'
  song?: Song
}
interface ViewerState {
  label: string
  url: string
}

export default function SongsPage() {
  const team = useActiveTeam()
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>('grid')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [toDelete, setToDelete] = useState<Song | null>(null)
  const [viewer, setViewer] = useState<ViewerState | null>(null)

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
        (s.key ?? '').toLowerCase().includes(q),
    )
  }, [songs, search])

  async function handleSave(form: SongFormData) {
    if (!team) return
    if (modal?.mode === 'edit' && modal.song) {
      const updated = await updateSong(modal.song.id, form)
      setSongs((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)))
    } else {
      const created = await createSong(team.id, form)
      setSongs((prev) => [...prev, created])
    }
  }

  function handleFileUpdate(songId: string, field: `${SongFileType}_url`, url: string | null) {
    setSongs((prev) => prev.map((s) => (s.id === songId ? { ...s, [field]: url } : s)))
    setModal((prev) =>
      prev?.song?.id === songId ? { ...prev, song: { ...prev.song, [field]: url } } : prev,
    )
  }

  async function handleDelete() {
    if (!toDelete) return
    await deleteSong(toDelete.id)
    setSongs((prev) => prev.filter((s) => s.id !== toDelete.id))
  }

  const editDefaultValues: SongFormData =
    modal?.mode === 'edit' && modal.song
      ? {
          title: modal.song.title,
          artist: modal.song.artist ?? '',
          key: modal.song.key ?? '',
          origin: modal.song.origin ?? 'outros',
          book_number: modal.song.book_number ?? '',
        }
      : EMPTY_FORM

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
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex w-fit items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition hover:bg-secondary"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            add
          </span>
          Nova música
        </button>
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
              placeholder="Buscar por título, artista ou tom…"
              aria-label="Buscar músicas"
              className="w-full rounded-2xl border-none bg-surface-container-lowest py-3 pl-12 pr-4 text-sm text-on-surface outline-none placeholder:text-outline focus:ring-2 focus:ring-primary/20"
            />
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
          songs={filteredSongs}
          onEdit={(song) => setModal({ mode: 'edit', song })}
          onDelete={setToDelete}
          onView={(label, url) => setViewer({ label, url })}
        />
      ) : (
        <ListView
          songs={filteredSongs}
          onEdit={(song) => setModal({ mode: 'edit', song })}
          onDelete={setToDelete}
          onView={(label, url) => setViewer({ label, url })}
        />
      )}

      {viewer && (
        <FileViewerModal title={viewer.label} url={viewer.url} onClose={() => setViewer(null)} />
      )}

      {modal && (
        <SongModal
          defaultValues={editDefaultValues}
          song={modal.mode === 'edit' ? modal.song : undefined}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onFileUpdate={(field, url) => {
            if (modal.song) handleFileUpdate(modal.song.id, field, url)
          }}
        />
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
}

function GridView({ songs, onEdit, onDelete, onView }: ViewProps) {
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
          <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => onEdit(song)}
              aria-label={`Editar ${song.title}`}
              className="rounded-xl p-2 text-outline transition hover:bg-primary/5 hover:text-primary"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                edit
              </span>
            </button>
            <button
              onClick={() => onDelete(song)}
              aria-label={`Remover ${song.title}`}
              className="rounded-xl p-2 text-outline transition hover:bg-error/5 hover:text-error"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-lg">
                delete
              </span>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ListView({ songs, onEdit, onDelete, onView }: ViewProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-outline-variant/10 bg-surface-container-lowest tonal-shadow">
      <div className="overflow-x-auto">
        <table className="min-w-[700px] w-full text-sm">
          <thead>
            <tr className="bg-surface-container-low/50">
              <th className="px-8 py-5 text-left text-xs font-bold uppercase tracking-wider text-outline">
                Título
              </th>
              <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-outline">
                Artista
              </th>
              <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-outline">
                Tom
              </th>
              <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-outline">
                Origem
              </th>
              <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-outline">
                Arquivos
              </th>
              <th className="px-6 py-5 text-left text-xs font-bold uppercase tracking-wider text-outline">
                Adicionado em
              </th>
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
                    {!song.partitura_url && !song.letra_url && !song.cifra_url && (
                      <span className="text-xs text-outline">—</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5 text-xs italic text-outline">
                  {formatDateTime(song.created_at)}
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => onEdit(song)}
                      aria-label={`Editar ${song.title}`}
                      className="rounded-lg p-2 text-outline transition hover:bg-primary/5 hover:text-primary"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-lg">
                        edit
                      </span>
                    </button>
                    <button
                      onClick={() => onDelete(song)}
                      aria-label={`Remover ${song.title}`}
                      className="rounded-lg p-2 text-outline transition hover:bg-error/5 hover:text-error"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-lg">
                        delete
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
