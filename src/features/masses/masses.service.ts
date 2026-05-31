import { supabase } from '@/lib/supabase'

import type { Mass, MassParticipant } from './types'
import type { MassFormData } from './masses.schemas'
import type { MassPart } from '@/types/database'

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

export async function fetchMassById(id: string): Promise<Mass | null> {
  const { data, error } = await supabase.from('masses').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as unknown as Mass | null
}

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

// ── Gestão do repertório ──────────────────────────────────────

const SONG_FIELDS =
  'id, title, artist, key, origin, book_number, singer_file_url, instrumental_file_url, partitura_url, letra_url, cifra_url'

export async function addSongToMass(
  massId: string,
  songId: string,
  part: MassPart,
  position: number,
): Promise<MassSongWithSong> {
  const { data, error } = await supabase
    .from('mass_songs')
    .insert({ mass_id: massId, song_id: songId, part, position } as never)
    .select(`id, mass_id, song_id, part, position, created_at, songs(${SONG_FIELDS})`)
    .single()

  if (error) throw error

  type RawRow = Omit<MassSongWithSong, 'song'> & {
    songs: MassSongWithSong['song'] | null
  }

  const row = data as unknown as RawRow
  return { ...row, song: row.songs! }
}

export async function removeMassSong(massSongId: string): Promise<void> {
  const { error } = await supabase.from('mass_songs').delete().eq('id', massSongId)
  if (error) throw error
}

export async function swapMassSongPositions(
  idA: string,
  posA: number,
  idB: string,
  posB: number,
): Promise<void> {
  // Usa uma posição temporária para evitar conflito de unicidade
  const tmp = -1

  const { error: e1 } = await supabase
    .from('mass_songs')
    .update({ position: tmp } as never)
    .eq('id', idA)
  if (e1) throw e1

  const { error: e2 } = await supabase
    .from('mass_songs')
    .update({ position: posA } as never)
    .eq('id', idB)
  if (e2) throw e2

  const { error: e3 } = await supabase
    .from('mass_songs')
    .update({ position: posB } as never)
    .eq('id', idA)
  if (e3) throw e3
}

// ── Página pública ────────────────────────────────────────────

export interface MassSongWithSong {
  id: string
  mass_id: string
  song_id: string
  part: string
  position: number
  created_at: string
  song: {
    id: string
    title: string
    artist: string | null
    key: string | null
    origin: string | null
    book_number: string | null
    singer_file_url: string | null
    instrumental_file_url: string | null
    partitura_url: string | null
    letra_url: string | null
    cifra_url: string | null
  }
}

export async function fetchPublicMass(id: string): Promise<Mass | null> {
  const { data, error } = await supabase.from('masses').select('*').eq('id', id).single()

  if (error) return null
  return data as unknown as Mass
}

export async function fetchMassSongs(massId: string): Promise<MassSongWithSong[]> {
  const { data, error } = await supabase
    .from('mass_songs')
    .select(`id, mass_id, song_id, part, position, created_at, songs(${SONG_FIELDS})`)
    .eq('mass_id', massId)
    .order('position', { ascending: true })

  if (error) throw error

  type RawRow = Omit<MassSongWithSong, 'song'> & {
    songs: MassSongWithSong['song'] | null
  }

  return ((data ?? []) as unknown as RawRow[])
    .filter((r) => r.songs !== null)
    .map((r) => ({ ...r, song: r.songs! }))
}

// ── Participantes ─────────────────────────────────────────────

export async function fetchMassParticipants(massId: string): Promise<MassParticipant[]> {
  const { data, error } = await supabase
    .from('mass_participants')
    .select('id, mass_id, user_id, name, type, created_at')
    .eq('mass_id', massId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as MassParticipant[]
}

export async function addMassParticipant(
  massId: string,
  participant: { user_id: string | null; name: string; type: 'member' | 'guest' },
): Promise<MassParticipant> {
  const { data, error } = await supabase
    .from('mass_participants')
    .insert({
      mass_id: massId,
      user_id: participant.user_id,
      name: participant.name,
      type: participant.type,
    } as never)
    .select()
    .single()

  if (error) throw error
  return data as unknown as MassParticipant
}

export async function removeMassParticipant(participantId: string): Promise<void> {
  const { error } = await supabase.from('mass_participants').delete().eq('id', participantId)
  if (error) throw error
}
