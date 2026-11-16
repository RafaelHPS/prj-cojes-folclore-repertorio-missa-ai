import { useState } from 'react'

import { LyricsViewerModal } from './LyricsViewerModal'
import type { LyricsSection } from '../types'

interface LyricsButtonSong {
  id: string
  title: string
  book_number: string | null
  /** Quando a música já veio com a letra (páginas da missa), evita buscar de novo. */
  lyrics?: LyricsSection[] | null
}

interface LyricsButtonProps {
  song: LyricsButtonSong
  className: string
  iconClassName?: string
}

/** Botão "Letra" que abre a letra em texto da música; guarda o próprio estado do modal. */
export function LyricsButton({ song, className, iconClassName = 'text-xs' }: LyricsButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(true)
        }}
        aria-label={`Ler a letra de ${song.title}`}
        className={className}
      >
        <span aria-hidden="true" className={`material-symbols-outlined ${iconClassName}`}>
          lyrics
        </span>
        Letra
      </button>
      {isOpen && (
        <LyricsViewerModal
          songId={song.id}
          title={song.title}
          subtitle={song.book_number ? `nº ${song.book_number}` : null}
          initialLyrics={song.lyrics}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
