import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { uploadSongFile, removeSongFile, updateSongFileUrl } from '../songs.service'
import type { SongFileType } from '../songs.service'
import { songSchema } from '../songs.schemas'
import type { SongFormData } from '../songs.schemas'
import { MUSICAL_KEYS, FILE_CONFIG } from '../songs.constants'
import type { Song } from '../types'

import { FileRow } from './FileRow'
import { FileViewerModal } from './FileViewerModal'

interface Props {
  defaultValues: SongFormData
  song?: Song
  onClose: () => void
  onSave: (form: SongFormData) => Promise<void>
  onFileUpdate?: (field: `${SongFileType}_url`, url: string | null) => void
}

export function SongModal({ defaultValues, song, onClose, onSave, onFileUpdate }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SongFormData>({ resolver: zodResolver(songSchema), defaultValues })

  const [viewer, setViewer] = useState<{ label: string; url: string } | null>(null)
  const [fileUrls, setFileUrls] = useState({
    partitura: song?.partitura_url ?? null,
    letra: song?.letra_url ?? null,
    cifra: song?.cifra_url ?? null,
  })
  const [saveError, setSaveError] = useState<string | null>(null)

  async function onSubmit(data: SongFormData) {
    setSaveError(null)
    try {
      await onSave(data)
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar.')
    }
  }

  async function handleUpload(type: SongFileType, file: File) {
    if (!song) return
    const url = await uploadSongFile(song.team_id, song.id, type, file)
    await updateSongFileUrl(song.id, `${type}_url`, url)
    setFileUrls((prev) => ({ ...prev, [type]: url }))
    onFileUpdate?.(`${type}_url`, url)
  }

  async function handleRemove(type: SongFileType) {
    if (!song) return
    await removeSongFile(song.team_id, song.id, type)
    await updateSongFileUrl(song.id, `${type}_url`, null)
    setFileUrls((prev) => ({ ...prev, [type]: null }))
    onFileUpdate?.(`${type}_url`, null)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="song-dialog-title"
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="song-dialog-title" className="mb-5 text-lg font-semibold text-gray-900">
            {song ? 'Editar música' : 'Nova música'}
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label htmlFor="song-title" className="mb-1 block text-sm font-medium text-gray-700">
                Título *
              </label>
              <input
                id="song-title"
                type="text"
                autoFocus
                aria-describedby={errors.title ? 'song-title-error' : undefined}
                aria-invalid={!!errors.title}
                placeholder="Nome da música"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                {...register('title')}
              />
              {errors.title && (
                <p id="song-title-error" role="alert" className="mt-1 text-xs text-red-600">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="song-artist" className="mb-1 block text-sm font-medium text-gray-700">
                Artista / Autor
              </label>
              <input
                id="song-artist"
                type="text"
                placeholder="Ex: Padre Zezinho"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                {...register('artist')}
              />
            </div>

            <div>
              <label htmlFor="song-key" className="mb-1 block text-sm font-medium text-gray-700">
                Tom
              </label>
              <select
                id="song-key"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                {...register('key')}
              >
                <option value="">Selecionar tom</option>
                {MUSICAL_KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>

            {saveError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {saveError}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                {song ? 'Fechar' : 'Cancelar'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
              >
                {isSubmitting ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </form>

          {song && (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <p className="mb-1 text-sm font-semibold text-gray-700">Arquivos</p>
              <p className="mb-3 text-xs text-gray-400">PDF, imagem ou documento de texto</p>
              <div className="divide-y divide-gray-100">
                {FILE_CONFIG.map(({ type, label, accept }) => (
                  <FileRow
                    key={type}
                    label={label}
                    accept={accept}
                    url={fileUrls[type]}
                    onUpload={(file) => handleUpload(type, file)}
                    onRemove={() => handleRemove(type)}
                    onView={(url) => setViewer({ label, url })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {viewer && (
        <FileViewerModal
          title={viewer.label}
          url={viewer.url}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  )
}
