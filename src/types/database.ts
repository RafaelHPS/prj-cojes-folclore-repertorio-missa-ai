export type UserRole = 'admin' | 'editor' | 'contributor' | 'viewer'
export type LiturgicalYear = 'A' | 'B' | 'C'
export type LiturgicalSeason =
  | 'tempo_comum'
  | 'advento'
  | 'natal'
  | 'quaresma'
  | 'pascoa'
  | 'pentecostes'
  | 'outros'

export type MassPart =
  | 'entrada'
  | 'ato_penitencial'
  | 'hino_de_louvor'
  | 'salmo'
  | 'sequencia'
  | 'aclamacao'
  | 'ofertorio'
  | 'santo'
  | 'cordeiro'
  | 'comunhao'
  | 'pos_comunhao'
  | 'final'

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string
          name: string
          slug: string | null
          logo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string | null
          logo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string | null
          logo_url?: string | null
          created_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          user_id: string
          team_id: string
          role: UserRole
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id: string
          role?: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string
          role?: UserRole
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          team_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          team_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          team_id?: string | null
          created_at?: string
        }
      }
      songs: {
        Row: {
          id: string
          team_id: string
          title: string
          artist: string | null
          key: string | null
          singer_file_url: string | null
          instrumental_file_url: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          title: string
          artist?: string | null
          key?: string | null
          singer_file_url?: string | null
          instrumental_file_url?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          title?: string
          artist?: string | null
          key?: string | null
          singer_file_url?: string | null
          instrumental_file_url?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      masses: {
        Row: {
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
        Insert: {
          id?: string
          team_id: string
          title: string
          date: string
          time?: string | null
          description?: string | null
          liturgical_year?: LiturgicalYear | null
          is_public?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          title?: string
          date?: string
          time?: string | null
          description?: string | null
          liturgical_year?: LiturgicalYear | null
          is_public?: boolean
          created_by?: string | null
          created_at?: string
        }
      }
      mass_songs: {
        Row: {
          id: string
          mass_id: string
          song_id: string
          part: MassPart
          position: number
          added_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          mass_id: string
          song_id: string
          part: MassPart
          position?: number
          added_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          mass_id?: string
          song_id?: string
          part?: MassPart
          position?: number
          added_by?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      liturgical_year: LiturgicalYear
      mass_part: MassPart
    }
  }
}
