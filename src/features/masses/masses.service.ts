import { supabase } from '@/lib/supabase'
import type { Mass } from './types'

export async function fetchUpcomingMasses(teamId: string, limit = 5): Promise<Mass[]> {
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('masses')
    .select('*')
    .eq('team_id', teamId)
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as unknown as Mass[]
}

export async function fetchMassCount(teamId: string): Promise<number> {
  const { count, error } = await supabase
    .from('masses')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)

  if (error) throw error
  return count ?? 0
}

interface TopSong {
  id: string
  title: string
  artist: string | null
  count: number
}

export async function fetchTopSongs(teamId: string, limit = 5): Promise<TopSong[]> {
  const { data: masses, error: massErr } = await supabase
    .from('masses')
    .select('id')
    .eq('team_id', teamId)

  if (massErr) throw massErr
  if (!masses || masses.length === 0) return []

  const massIds = (masses as unknown as { id: string }[]).map((m) => m.id)

  const { data, error } = await supabase
    .from('mass_songs')
    .select('song_id, songs(id, title, artist)')
    .in('mass_id', massIds)

  if (error) throw error

  type SongRow = { song_id: string; songs: { id: string; title: string; artist: string | null } | null }

  const counts = new Map<string, { title: string; artist: string | null; count: number }>()

  for (const row of (data ?? []) as unknown as SongRow[]) {
    if (!row.songs) continue
    const entry = counts.get(row.songs.id) ?? { title: row.songs.title, artist: row.songs.artist, count: 0 }
    entry.count++
    counts.set(row.songs.id, entry)
  }

  return Array.from(counts.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
