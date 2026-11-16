export type SongOrigin = 'outros' | 'arquidiocese' | 'cojes' | 'salmos'

import type { MassPart, LiturgicalSeason } from '@/types/database'

export interface Song {
  id: string
  team_id: string
  /** Código sequencial por equipe, exibido para a equipe identificar a música. */
  code: number
  title: string
  artist: string | null
  key: string | null
  origin: SongOrigin
  book_number: string | null
  suggested_parts: MassPart[]
  suggested_seasons: LiturgicalSeason[]
  audio_url: string | null
  singer_file_url: string | null
  instrumental_file_url: string | null
  partitura_url: string | null
  letra_url: string | null
  cifra_url: string | null
  /** Coluna gerada: a letra em si (`lyrics`) só é carregada ao abrir a música. */
  has_lyrics: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type LyricsSectionType = 'refrain' | 'stanza' | 'other'

/** Um bloco da letra, na ordem em que aparece impresso no livro. */
export interface LyricsSection {
  type: LyricsSectionType
  /** Marcador impresso ("R.", "1.", "S:"), ou null quando não há. */
  label: string | null
  lines: string[]
  /** Repetição do bloco inteiro ("bis", "3x"), ou null. */
  repeat: string | null
}

export interface SongForm {
  title: string
  artist: string
  key: string
}
