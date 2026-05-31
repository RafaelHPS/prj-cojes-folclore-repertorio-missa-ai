import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { uploadSongFile, removeSongFile, updateSongFileUrl } from '../songs.service'
import type { SongFileType } from '../songs.service'
import { songSchema, BOOK_ORIGINS, ORIGIN_LABEL } from '../songs.schemas'
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SongFormData>({
    resolver: zodResolver(songSchema),
    defaultValues,
  })

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
        className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/40 sm:items-center sm:px-4"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="song-dialog-title"
          className="flex w-full max-h-[90svh] flex-col rounded-t-3xl bg-surface-container-lowest shadow-2xl sm:max-w-md sm:max-h-[92dvh] sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle — visível apenas no mobile */}
          <div className="flex justify-center pt-3 sm:hidden" aria-hidden="true">
            <div className="h-1 w-10 rounded-full bg-outline-variant" />
          </div>

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/10 px-6 py-4">
            <h2 id="song-dialog-title" className="font-headline text-lg font-bold text-on-surface">
              {song ? 'Editar música' : 'Nova música'}
            </h2>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-xl p-2 text-outline transition hover:bg-surface-container-low hover:text-on-surface"
            >
              <span aria-hidden="true" className="material-symbols-outlined">
                close
              </span>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <form id="song-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="song-title"
                  className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
                >
                  Título *
                </label>
                <input
                  id="song-title"
                  type="text"
                  autoFocus
                  placeholder="Nome da música"
                  aria-describedby={errors.title ? 'song-title-error' : undefined}
                  aria-invalid={!!errors.title}
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-outline transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...register('title')}
                />
                {errors.title && (
                  <p id="song-title-error" role="alert" className="mt-1 text-xs text-error">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="song-artist"
                  className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
                >
                  Artista / Autor
                </label>
                <input
                  id="song-artist"
                  type="text"
                  placeholder="Ex: Padre Zezinho"
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-outline transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...register('artist')}
                />
              </div>

              <div>
                <label
                  htmlFor="song-key"
                  className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
                >
                  Tom
                </label>
                <select
                  id="song-key"
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...register('key')}
                >
                  <option value="">Selecionar tom</option>
                  {MUSICAL_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="song-origin"
                  className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
                >
                  Origem
                </label>
                <select
                  id="song-origin"
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...register('origin')}
                >
                  {(Object.entries(ORIGIN_LABEL) as [keyof typeof ORIGIN_LABEL, string][]).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {BOOK_ORIGINS.includes(watch('origin')) && (
                <div>
                  <label
                    htmlFor="song-book-number"
                    className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
                  >
                    Número no livro *
                  </label>
                  <input
                    id="song-book-number"
                    type="text"
                    placeholder="Ex: 42"
                    aria-describedby={errors.book_number ? 'song-book-number-error' : undefined}
                    aria-invalid={!!errors.book_number}
                    className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-outline transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    {...register('book_number')}
                  />
                  {errors.book_number && (
                    <p id="song-book-number-error" role="alert" className="mt-1 text-xs text-error">
                      {errors.book_number.message}
                    </p>
                  )}
                </div>
              )}

              {saveError && (
                <p role="alert" className="rounded-2xl bg-error/5 px-4 py-3 text-sm text-error">
                  {saveError}
                </p>
              )}
            </form>

            {/* Arquivos — só no modo edição */}
            {song && (
              <div className="mt-5 border-t border-outline-variant/10 pt-4">
                <p className="mb-1 text-sm font-bold text-on-surface">Arquivos</p>
                <p className="mb-3 text-xs text-outline">PDF, imagem ou documento de texto</p>
                <div className="divide-y divide-outline-variant/10">
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

          {/* Rodapé com botões — fixo, fora do scroll */}
          <div className="shrink-0 border-t border-outline-variant/10 px-6 py-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-low"
              >
                {song ? 'Fechar' : 'Cancelar'}
              </button>
              <button
                type="submit"
                form="song-form"
                disabled={isSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-on-primary shadow-md shadow-primary/20 transition hover:bg-secondary disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <span aria-hidden="true" className="material-symbols-outlined text-base">
                    save
                  </span>
                )}
                {isSubmitting ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewer && (
        <FileViewerModal title={viewer.label} url={viewer.url} onClose={() => setViewer(null)} />
      )}
    </>
  )
}
