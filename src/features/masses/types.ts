import type { LiturgicalYear, MassPart } from '@/types/database'

export interface Mass {
  id: string
  team_id: string
  title: string
  date: string
  time: string | null
  description: string | null
  liturgical_year: LiturgicalYear | null
  is_public: boolean
  created_by: string | null
  created_at: string
}

export interface MassSong {
  id: string
  mass_id: string
  song_id: string
  part: MassPart
  position: number
  created_at: string
}
