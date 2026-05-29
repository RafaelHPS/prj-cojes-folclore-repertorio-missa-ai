import { supabase } from '@/lib/supabase'

import type { Mass } from './types'
import type { MassFormData } from './masses.schemas'

export type MassFilter = 'upcoming' | 'past' | 'all'

export interface MassWithCount extends Mass {
  song_count: number
}

// ── Leitura ───────────────────────────────────────────────────

export async function fetchMasses(
  teamId: string,
  filter: MassFilter = 'all',
): Promise<MassWithCount[]> {
  const today = new Date().toISOString().slice(0, 10)
  const isUpcoming = filter === 'upcoming'

  let query = supabase
    .from('masses')
    .select('*, mass_songs(count)')
    .eq('team_id', teamId)
    .order('date', { ascending: isUpcoming || filter === 'all' })

  if (filter === 'upcoming') query = query.gte('date', today)
  if (filter === 'past') query = query.lt('date', today)

  const { data, error } = await query
  if (error) throw error

  type RawRow = Mass & { mass_songs: { count: number }[] }

  return ((data ?? []) as unknown as RawRow[]).map((row) => ({
    ...row,
    song_count: row.mass_songs.at(0)?.count ?? 0,
  }))
}

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

  type SongRow = {
    song_id: string
    songs: { id: string; title: string; artist: string | null } | null
  }

  const counts = new Map<string, { title: string; artist: string | null; count: number }>()

  for (const row of (data ?? []) as unknown as SongRow[]) {
    if (!row.songs) continue
    const entry = counts.get(row.songs.id) ?? {
      title: row.songs.title,
      artist: row.songs.artist,
      count: 0,
    }
    entry.count++
    counts.set(row.songs.id, entry)
  }

  return Array.from(counts.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

// ── Escrita ───────────────────────────────────────────────────

export async function createMass(teamId: string, form: MassFormData): Promise<Mass> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('masses')
    .insert({
      team_id: teamId,
      title: form.title.trim(),
      date: form.date,
      time: form.time?.trim() || null,
      liturgical_year: form.liturgical_year ?? null,
      description: form.description?.trim() || null,
      is_public: form.is_public,
      created_by: user?.id ?? null,
    } as never)
    .select()
    .single()

  if (error) throw error
  return data as unknown as Mass
}

export async function updateMass(id: string, form: MassFormData): Promise<Mass> {
  const { data, error } = await supabase
    .from('masses')
    .update({
      title: form.title.trim(),
      date: form.date,
      time: form.time?.trim() || null,
      liturgical_year: form.liturgical_year ?? null,
      description: form.description?.trim() || null,
      is_public: form.is_public,
    } as never)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as unknown as Mass
}

export async function deleteMass(id: string): Promise<void> {
  const { error } = await supabase.from('masses').delete().eq('id', id)
  if (error) throw error
}
