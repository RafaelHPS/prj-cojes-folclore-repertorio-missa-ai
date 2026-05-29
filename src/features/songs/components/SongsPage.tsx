import { useEffect, useState, useMemo } from 'react'

import { useActiveTeam } from '@/hooks/useActiveTeam'
import { formatDateTime } from '@/utils/date.util'

import { fetchSongs, createSong, updateSong, deleteSong } from '../songs.service'
import type { SongFileType } from '../songs.service'
import type { Song } from '../types'
import type { SongFormData } from '../songs.schemas'

import { SongModal } from './SongModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { FileBadges } from './FileBadges'
import { FileViewerModal } from './FileViewerModal'

const EMPTY_FORM: SongFormData = { title: '', artist: '', key: '' }

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

  async function loadSongs() {
    if (!team) return
    setIsLoading(true)
    try {
      setSongs(await fetchSongs(team.id))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void loadSongs() }, [team?.id])

  const filteredSongs = useMemo(() => {
    const query = search.toLowerCase()
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        (s.artist ?? '').toLowerCase().includes(query) ||
        (s.key ?? '').toLowerCase().includes(query),
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
      prev?.song?.id === songId ? { ...prev, song: { ...prev.song, [field]: url } } : prev
    )
  }

  async function handleDelete() {
    if (!toDelete) return
    await deleteSong(toDelete.id)
    setSongs((prev) => prev.filter((s) => s.id !== toDelete.id))
  }

  const editDefaultValues: SongFormData = modal?.mode === 'edit' && modal.song
    ? { title: modal.song.title, artist: modal.song.artist ?? '', key: modal.song.key ?? '' }
    : EMPTY_FORM

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Músicas</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {songs.length} música{songs.length !== 1 ? 's' : ''} no repertório
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
        >
          + Nova música
        </button>
      </div>

      {/* Busca + alternância de view */}
      <div className="mb-5 flex gap-3">
        <div className="relative flex-1">
          <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, artista ou tom…"
            aria-label="Buscar músicas"
            className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-4 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          />
        </div>
        <div className="flex overflow-hidden rounded-xl border border-gray-300" role="group" aria-label="Modo de visualização">
          <button
            onClick={() => setView('grid')}
            aria-pressed={view === 'grid'}
            aria-label="Visualização em grade"
            className={`px-3 py-2 text-sm transition ${view === 'grid' ? 'bg-violet-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            ⊞
          </button>
          <button
            onClick={() => setView('list')}
            aria-pressed={view === 'list'}
            aria-label="Visualização em lista"
            className={`px-3 py-2 text-sm transition ${view === 'list' ? 'bg-violet-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            ≡
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex justify-center py-20" role="status" aria-live="polite" aria-label="Carregando músicas">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p aria-hidden="true" className="mb-3 text-4xl">♪</p>
          <p className="font-medium text-gray-700">
            {search ? 'Nenhuma música encontrada' : 'Nenhuma música no repertório'}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {search ? 'Tente outro termo de busca.' : 'Clique em "+ Nova música" para começar.'}
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
          className="group relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
        >
          <p className="truncate pr-14 font-semibold text-gray-900">{song.title}</p>
          {song.artist && <p className="mt-0.5 truncate text-sm text-gray-500">{song.artist}</p>}
          {song.key && (
            <span className="mt-2 inline-block rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
              {song.key}
            </span>
          )}
          <FileBadges song={song} onView={onView} />
          <div className="mt-2 space-y-0.5">
            <p className="text-xs text-gray-400">Adicionado em {formatDateTime(song.created_at)}</p>
            {song.updated_at !== song.created_at && (
              <p className="text-xs text-gray-400">Atualizado em {formatDateTime(song.updated_at)}</p>
            )}
          </div>
          <div className="absolute right-4 top-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => onEdit(song)}
              aria-label={`Editar ${song.title}`}
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            >
              ✎
            </button>
            <button
              onClick={() => onDelete(song)}
              aria-label={`Remover ${song.title}`}
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ListView({ songs, onEdit, onDelete, onView }: ViewProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[640px] w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left">
              <th className="px-6 py-3 font-semibold text-gray-600">Título</th>
              <th className="px-6 py-3 font-semibold text-gray-600">Artista</th>
              <th className="px-6 py-3 font-semibold text-gray-600">Tom</th>
              <th className="px-6 py-3 font-semibold text-gray-600">Arquivos</th>
              <th className="px-6 py-3 font-semibold text-gray-600">Adicionado em</th>
              <th className="px-6 py-3 font-semibold text-gray-600">Atualizado em</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {songs.map((song) => (
              <tr key={song.id} className="transition-colors hover:bg-gray-50">
                <td className="px-6 py-3 font-medium text-gray-900">{song.title}</td>
                <td className="px-6 py-3 text-gray-500">{song.artist ?? '—'}</td>
                <td className="px-6 py-3">
                  {song.key ? (
                    <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                      {song.key}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-6 py-3">
                  <div className="flex flex-wrap gap-1">
                    {song.partitura_url && (
                      <button onClick={() => onView('Partitura', song.partitura_url!)} className="text-xs text-emerald-600 hover:underline">Partitura</button>
                    )}
                    {song.letra_url && (
                      <button onClick={() => onView('Letra', song.letra_url!)} className="text-xs text-emerald-600 hover:underline">Letra</button>
                    )}
                    {song.cifra_url && (
                      <button onClick={() => onView('Cifra', song.cifra_url!)} className="text-xs text-emerald-600 hover:underline">Cifra</button>
                    )}
                    {!song.partitura_url && !song.letra_url && !song.cifra_url && (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-3 text-sm text-gray-400">{formatDateTime(song.created_at)}</td>
                <td className="px-6 py-3 text-sm text-gray-400">
                  {song.updated_at !== song.created_at ? formatDateTime(song.updated_at) : '—'}
                </td>
                <td className="px-6 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(song)}
                      className="rounded-lg px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(song)}
                      className="rounded-lg px-3 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50"
                    >
                      Remover
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
