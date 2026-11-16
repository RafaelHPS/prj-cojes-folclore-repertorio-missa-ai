import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useCloseOnBack } from '@/hooks/useCloseOnBack'

import { fetchSongLyrics } from '../songs.service'
import { buildSungOrder } from '../lyrics.util'
import { LyricsSectionBlock } from './LyricsSectionBlock'
import type { LyricsTextSize } from './LyricsSectionBlock'
import type { LyricsSection } from '../types'

const TEXT_SIZES: readonly LyricsTextSize[] = ['text-base', 'text-lg', 'text-xl']

type LoadStatus = 'loading' | 'ready' | 'error'

interface LyricsViewerModalProps {
  songId: string
  title: string
  subtitle: string | null
  /** Letra já carregada junto com a música; `undefined` faz o modal buscar pelo id. */
  initialLyrics: LyricsSection[] | null | undefined
  onClose: () => void
}

function useSongLyrics(songId: string, initialLyrics: LyricsSection[] | null | undefined) {
  const [lyrics, setLyrics] = useState<LyricsSection[] | null>(initialLyrics ?? null)
  const [status, setStatus] = useState<LoadStatus>(
    initialLyrics === undefined ? 'loading' : 'ready',
  )

  useEffect(() => {
    if (initialLyrics !== undefined) return
    let isCurrent = true
    fetchSongLyrics(songId)
      .then((loaded) => {
        if (!isCurrent) return
        setLyrics(loaded)
        setStatus('ready')
      })
      .catch(() => {
        if (isCurrent) setStatus('error')
      })
    return () => {
      isCurrent = false
    }
  }, [songId, initialLyrics])

  return { lyrics, status }
}

const CONTROL_CLASS =
  'flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-bold text-on-surface-variant transition hover:bg-surface-container disabled:opacity-30'

export function LyricsViewerModal({
  songId,
  title,
  subtitle,
  initialLyrics,
  onClose,
}: LyricsViewerModalProps) {
  useCloseOnBack(onClose)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const { lyrics, status } = useSongLyrics(songId, initialLyrics)
  const [sizeIndex, setSizeIndex] = useState(1)
  const [isSungOrder, setIsSungOrder] = useState(false)

  const sungOrder = useMemo(() => buildSungOrder(lyrics ?? []), [lyrics])
  const canRepeatRefrain = sungOrder.length > (lyrics?.length ?? 0)
  const sections =
    isSungOrder && canRepeatRefrain
      ? sungOrder
      : (lyrics ?? []).map((s) => ({ ...s, isRepeatedRefrain: false }))

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    closeButtonRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const textSize = TEXT_SIZES[sizeIndex] ?? 'text-lg'

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lyrics-title"
      className="fixed inset-0 z-[60] flex flex-col bg-surface"
    >
      <header className="flex flex-shrink-0 items-center gap-2 border-b border-outline-variant/20 bg-surface-container-lowest px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2
            id="lyrics-title"
            className="truncate font-headline text-lg font-bold text-on-surface"
          >
            {title}
          </h2>
          {subtitle && <p className="truncate text-xs text-outline">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setSizeIndex((i) => Math.max(0, i - 1))}
          disabled={sizeIndex === 0}
          aria-label="Diminuir letra"
          className={CONTROL_CLASS}
        >
          A−
        </button>
        <button
          type="button"
          onClick={() => setSizeIndex((i) => Math.min(TEXT_SIZES.length - 1, i + 1))}
          disabled={sizeIndex === TEXT_SIZES.length - 1}
          aria-label="Aumentar letra"
          className={CONTROL_CLASS}
        >
          A+
        </button>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Fechar letra"
          className="ml-1 rounded-xl bg-surface-container p-2 leading-none text-on-surface transition hover:bg-surface-container-high"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-xl">
            close
          </span>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-6">
          {canRepeatRefrain && (
            <label className="mb-6 flex w-fit cursor-pointer items-center gap-2 rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface-variant">
              <input
                type="checkbox"
                checked={isSungOrder}
                onChange={(e) => setIsSungOrder(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Repetir o refrão após cada estrofe
            </label>
          )}

          <div aria-live="polite">
            {status === 'loading' && (
              <div
                className="flex justify-center py-16"
                role="status"
                aria-label="Carregando letra"
              >
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            )}
            {status === 'error' && (
              <p className="py-16 text-center text-on-surface-variant">
                Não foi possível carregar a letra. Tente novamente.
              </p>
            )}
            {status === 'ready' && sections.length === 0 && (
              <p className="py-16 text-center text-on-surface-variant">
                Esta música ainda não tem letra cadastrada.
              </p>
            )}
          </div>

          {status === 'ready' && sections.length > 0 && (
            <div className="space-y-5 pb-10">
              {sections.map((section, i) => (
                <LyricsSectionBlock key={i} section={section} textSize={textSize} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
