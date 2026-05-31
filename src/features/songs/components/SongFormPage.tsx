import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { useActiveTeam } from '@/hooks/useActiveTeam'
import {
  fetchSongById,
  createSong,
  updateSong,
  uploadSongFile,
  removeSongFile,
  updateSongFileUrl,
} from '../songs.service'
import type { SongFileType } from '../songs.service'
import { songSchema, BOOK_ORIGINS, ORIGIN_LABEL } from '../songs.schemas'
import type { SongFormData } from '../songs.schemas'
import { MUSICAL_KEYS, FILE_CONFIG } from '../songs.constants'
import type { Song } from '../types'

import { FileRow } from './FileRow'
import { FileViewerModal } from './FileViewerModal'

const EMPTY_FORM: SongFormData = {
  title: '',
  artist: '',
  key: '',
  origin: 'outros',
  book_number: '',
}

export default function SongFormPage() {
  const { id } = useParams<{ id: string }>()
  const { state } = useLocation() as { state: { song?: Song } | null }
  const navigate = useNavigate()
  const team = useActiveTeam()

  const isEdit = !!id
  const [song, setSong] = useState<Song | null>(state?.song ?? null)
  const [isLoadingSong, setIsLoadingSong] = useState(isEdit && !state?.song)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [viewer, setViewer] = useState<{ label: string; url: string } | null>(null)
  const [fileUrls, setFileUrls] = useState({
    partitura: song?.partitura_url ?? null,
    letra: song?.letra_url ?? null,
    cifra: song?.cifra_url ?? null,
  })

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SongFormData>({
    resolver: zodResolver(songSchema),
    defaultValues: EMPTY_FORM,
  })

  useEffect(() => {
    if (!isEdit || state?.song) return

    async function load() {
      setIsLoadingSong(true)
      try {
        const fetched = await fetchSongById(id!)
        if (!fetched) {
          setLoadError('Música não encontrada.')
          return
        }
        setSong(fetched)
        setFileUrls({
          partitura: fetched.partitura_url ?? null,
          letra: fetched.letra_url ?? null,
          cifra: fetched.cifra_url ?? null,
        })
        reset({
          title: fetched.title,
          artist: fetched.artist ?? '',
          key: fetched.key ?? '',
          origin: fetched.origin ?? 'outros',
          book_number: fetched.book_number ?? '',
        })
      } catch {
        setLoadError('Erro ao carregar a música.')
      } finally {
        setIsLoadingSong(false)
      }
    }

    void load()
  }, [id, isEdit, state?.song, reset])

  useEffect(() => {
    if (state?.song) {
      reset({
        title: state.song.title,
        artist: state.song.artist ?? '',
        key: state.song.key ?? '',
        origin: state.song.origin ?? 'outros',
        book_number: state.song.book_number ?? '',
      })
    }
  }, [state?.song, reset])

  async function onSubmit(form: SongFormData) {
    if (!team) return
    setSaveError(null)
    try {
      if (isEdit && song) {
        await updateSong(song.id, form)
        navigate('/musicas')
      } else {
        const created = await createSong(team.id, form)
        navigate(`/musicas/${created.id}/editar`, { replace: true })
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar.')
    }
  }

  async function handleUpload(type: SongFileType, file: File) {
    if (!song) return
    const url = await uploadSongFile(song.team_id, song.id, type, file)
    await updateSongFileUrl(song.id, `${type}_url`, url)
    setFileUrls((prev) => ({ ...prev, [type]: url }))
  }

  async function handleRemove(type: SongFileType) {
    if (!song) return
    await removeSongFile(song.team_id, song.id, type)
    await updateSongFileUrl(song.id, `${type}_url`, null)
    setFileUrls((prev) => ({ ...prev, [type]: null }))
  }

  if (isLoadingSong) {
    return (
      <div className="flex justify-center py-20" role="status" aria-label="Carregando">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span aria-hidden="true" className="material-symbols-outlined mb-4 text-5xl text-error">
          error
        </span>
        <p className="font-headline text-lg font-bold text-on-surface">{loadError}</p>
        <Link to="/musicas" className="mt-4 text-sm font-semibold text-primary hover:underline">
          Voltar ao repertório
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm font-medium text-outline">
        <Link to="/musicas" className="hover:text-primary transition-colors">
          Músicas
        </Link>
        <span aria-hidden="true" className="material-symbols-outlined text-xs">
          chevron_right
        </span>
        <span className="font-semibold text-primary">
          {isEdit ? 'Editar música' : 'Nova música'}
        </span>
      </nav>

      <h1 className="font-headline mb-8 text-3xl font-extrabold tracking-tight text-on-surface">
        {isEdit ? (song?.title ?? 'Editar música') : 'Nova música'}
      </h1>

      {/* Formulário */}
      <div className="rounded-3xl bg-surface-container-lowest p-6 tonal-shadow">
        <form id="song-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => navigate('/musicas')}
              className="flex-1 rounded-full border border-outline-variant px-4 py-3 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-low"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-on-primary shadow-md shadow-primary/20 transition hover:bg-secondary disabled:opacity-60"
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
        </form>
      </div>

      {/* Arquivos — só no modo edição */}
      {isEdit && song && (
        <div className="mt-6 rounded-3xl bg-surface-container-lowest p-6 tonal-shadow">
          <p className="mb-1 text-sm font-bold text-on-surface">Arquivos</p>
          <p className="mb-4 text-xs text-outline">PDF, imagem ou documento de texto</p>
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

      {/* Aviso pós-criação para upload de arquivos */}
      {isEdit && song && (
        <p className="mt-4 text-center text-xs text-outline">
          Música salva. Você pode adicionar arquivos acima ou{' '}
          <button
            onClick={() => navigate('/musicas')}
            className="font-semibold text-primary hover:underline"
          >
            voltar ao repertório
          </button>
          .
        </p>
      )}

      {viewer && (
        <FileViewerModal title={viewer.label} url={viewer.url} onClose={() => setViewer(null)} />
      )}
    </div>
  )
}
