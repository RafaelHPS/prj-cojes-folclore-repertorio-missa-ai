export type SongOrigin = 'outros' | 'arquidiocese' | 'cojes' | 'salmos'

import type { MassPart, LiturgicalSeason } from '@/types/database'

export interface Song {
  id: string
  team_id: string
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
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SongForm {
  title: string
  artist: string
  key: string
}
