import { supabase } from '@/lib/supabase'

// ── Tipos ─────────────────────────────────────────────────────

export interface StatsSummary {
  totalSongs: number
  totalMasses: number
  publicMasses: number
  avgSongsPerMass: number
}

export interface TopSong {
  id: string
  title: string
  artist: string | null
  origin: string
  book_number: string | null
  count: number
}

export interface OriginCount {
  origin: string
  count: number
}

export interface MonthCount {
  month: string // "YYYY-MM"
  label: string // "Jan/25"
  count: number
}

export interface LiturgicalYearCount {
  year: string
  count: number
}

export interface PartCount {
  part: string
  count: number
}

// ── Funções ───────────────────────────────────────────────────

export async function fetchStatsSummary(teamId: string): Promise<StatsSummary> {
  const [songsRes, massesRes, massSongsRes] = await Promise.all([
    supabase.from('songs').select('id', { count: 'exact', head: true }).eq('team_id', teamId),
    supabase.from('masses').select('id, is_public').eq('team_id', teamId),
    supabase
      .from('masses')
      .select('id')
      .eq('team_id', teamId)
      .then(async ({ data: mData }) => {
        if (!mData || mData.length === 0) return { count: 0, massCount: 0 }
        const ids = (mData as { id: string }[]).map((m) => m.id)
        const { count } = await supabase
          .from('mass_songs')
          .select('id', { count: 'exact', head: true })
          .in('mass_id', ids)
        return { count: count ?? 0, massCount: mData.length }
      }),
  ])

  const masses = (massesRes.data ?? []) as { id: string; is_public: boolean }[]
  const publicMasses = masses.filter((m) => m.is_public).length

  const avgSongsPerMass =
    massSongsRes.massCount > 0
      ? Math.round((massSongsRes.count / massSongsRes.massCount) * 10) / 10
      : 0

  return {
    totalSongs: songsRes.count ?? 0,
    totalMasses: masses.length,
    publicMasses,
    avgSongsPerMass,
  }
}

export async function fetchTopSongs(teamId: string, limit = 10): Promise<TopSong[]> {
  const { data: massData } = await supabase.from('masses').select('id').eq('team_id', teamId)

  if (!massData || massData.length === 0) return []

  const massIds = (massData as { id: string }[]).map((m) => m.id)

  const { data } = await supabase
    .from('mass_songs')
    .select('song_id, songs(id, title, artist, origin, book_number)')
    .in('mass_id', massIds)

  type Row = {
    song_id: string
    songs: {
      id: string
      title: string
      artist: string | null
      origin: string
      book_number: string | null
    } | null
  }

  const counts = new Map<string, TopSong>()
  for (const row of (data ?? []) as unknown as Row[]) {
    if (!row.songs) continue
    const entry = counts.get(row.songs.id) ?? {
      id: row.songs.id,
      title: row.songs.title,
      artist: row.songs.artist,
      origin: row.songs.origin,
      book_number: row.songs.book_number,
      count: 0,
    }
    entry.count++
    counts.set(row.songs.id, entry)
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export async function fetchSongsByOrigin(teamId: string): Promise<OriginCount[]> {
  const { data } = await supabase.from('songs').select('origin').eq('team_id', teamId)

  const counts = new Map<string, number>()
  for (const row of (data ?? []) as { origin: string }[]) {
    counts.set(row.origin, (counts.get(row.origin) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([origin, count]) => ({ origin, count }))
    .sort((a, b) => b.count - a.count)
}

export async function fetchMassesByMonth(teamId: string): Promise<MonthCount[]> {
  const year = new Date().getFullYear()
  const from = `${year}-01-01`
  const to = `${year}-12-31`

  const { data } = await supabase
    .from('masses')
    .select('date')
    .eq('team_id', teamId)
    .gte('date', from)
    .lte('date', to)

  const MONTHS = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ]
  const counts = new Array(12).fill(0) as number[]

  for (const row of (data ?? []) as { date: string }[]) {
    const month = parseInt(row.date.split('-')[1] ?? '1', 10) - 1
    counts[month] = (counts[month] ?? 0) + 1
  }

  return counts.map((count, i) => ({
    month: `${year}-${String(i + 1).padStart(2, '0')}`,
    label: `${MONTHS[i]}/${String(year).slice(2)}`,
    count,
  }))
}

export async function fetchMassesByLiturgicalYear(teamId: string): Promise<LiturgicalYearCount[]> {
  const { data } = await supabase.from('masses').select('liturgical_year').eq('team_id', teamId)

  const counts = new Map<string, number>()
  for (const row of (data ?? []) as { liturgical_year: string | null }[]) {
    const key = row.liturgical_year ?? 'Não definido'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.count - a.count)
}

export async function fetchTopParts(teamId: string): Promise<PartCount[]> {
  const { data: massData } = await supabase.from('masses').select('id').eq('team_id', teamId)

  if (!massData || massData.length === 0) return []

  const massIds = (massData as { id: string }[]).map((m) => m.id)

  const { data } = await supabase.from('mass_songs').select('part').in('mass_id', massIds)

  const counts = new Map<string, number>()
  for (const row of (data ?? []) as { part: string }[]) {
    counts.set(row.part, (counts.get(row.part) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([part, count]) => ({ part, count }))
    .sort((a, b) => b.count - a.count)
}
