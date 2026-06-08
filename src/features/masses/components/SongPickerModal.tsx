import { useMemo, useState } from 'react'

import type { Song } from '@/features/songs/types'
import { ORIGIN_LABEL, BOOK_ORIGINS } from '@/features/songs/songs.schemas'
import type { MassPart } from '@/types/database'

const PART_LABEL: Record<MassPart, string> = {
  entrada: 'Entrada',
  ato_penitencial: 'Ato Penitencial',
  hino_de_louvor: 'Glória',
  salmo: 'Salmo Responsorial',
  sequencia: 'Sequência',
  aclamacao: 'Aclamação ao Evangelho',
  ofertorio: 'Ofertório',
  oracao_eucaristica: 'Oração Eucarística',
  santo: 'Santo',
  cordeiro: 'Cordeiro de Deus',
  doxologia: 'Doxologia Final',
  comunhao: 'Comunhão',
  pos_comunhao: 'Pós-Comunhão',
  final: 'Final',
}

interface Props {
  part: MassPart
  songs: Song[]
  isAdding: boolean
  onSelect: (song: Song) => void
  onClose: () => void
}

export function SongPickerModal({ part, songs, isAdding, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.artist ?? '').toLowerCase().includes(q) ||
        (s.key ?? '').toLowerCase().includes(q) ||
        (s.book_number ?? '').toLowerCase().includes(q),
    )
  }, [songs, search])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/40 px-4 pb-4 sm:items-center sm:pb-0"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
        className="w-full max-w-md overflow-hidden rounded-3xl bg-surface-container-lowest shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/10 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-outline">
              {PART_LABEL[part]}
            </p>
            <h2 id="picker-title" className="font-headline text-base font-bold text-on-surface">
              Adicionar música
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-xl p-2 text-outline transition hover:bg-surface-container-low"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              close
            </span>
          </button>
        </div>

        {/* Busca */}
        <div className="border-b border-outline-variant/10 px-5 py-3">
          <div className="relative">
            <span
              aria-hidden="true"
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-outline"
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
              className="w-full rounded-2xl bg-surface-container-low py-2.5 pl-9 pr-4 text-sm text-on-surface outline-none placeholder:text-outline focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <span
                aria-hidden="true"
                className="material-symbols-outlined mb-2 text-3xl text-outline"
              >
                music_off
              </span>
              <p className="text-sm text-outline">
                {search ? 'Nenhuma música encontrada.' : 'Nenhuma música no repertório.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant/10">
              {filtered.map((song) => (
                <li key={song.id}>
                  <button
                    onClick={() => onSelect(song)}
                    disabled={isAdding}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-surface-container-low disabled:opacity-60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-on-surface">{song.title}</p>
                      {song.artist && (
                        <p className="mt-0.5 truncate text-xs text-outline">{song.artist}</p>
                      )}
                      {song.origin !== 'outros' && BOOK_ORIGINS.includes(song.origin) && (
                        <p className="mt-0.5 text-xs text-secondary">
                          {ORIGIN_LABEL[song.origin]}
                          {song.book_number && ` · nº ${song.book_number}`}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      {song.key && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                          {song.key}
                        </span>
                      )}
                      {song.book_number && (
                        <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">
                          nº {song.book_number}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {isAdding && (
          <div className="flex items-center justify-center gap-2 border-t border-outline-variant/10 px-5 py-3 text-sm text-outline">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Adicionando…
          </div>
        )}
      </div>
    </div>
  )
}
