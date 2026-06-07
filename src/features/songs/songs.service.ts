import { supabase } from '@/lib/supabase'
import type { Song } from './types'
import type { SongFormData } from './songs.schemas'
import { BOOK_ORIGINS } from './songs.schemas'
import { logAudit } from '@/features/teams/audit.service'

const BUCKET = 'song-files'

export async function fetchSongCount(teamId: string): Promise<number> {
  const { count, error } = await supabase
    .from('songs')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId)

  if (error) throw error
  return count ?? 0
}

export async function fetchSongs(teamId: string): Promise<Song[]> {
  const PAGE_SIZE = 1000
  const all: Song[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('songs')
      .select('*')
      .eq('team_id', teamId)
      .order('title')
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error

    all.push(...((data ?? []) as unknown as Song[]))

    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return all
}

export async function fetchSongById(id: string): Promise<Song | null> {
  const { data, error } = await supabase.from('songs').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as unknown as Song | null
}

export async function createSong(teamId: string, form: SongFormData): Promise<Song> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('songs')
    .insert({
      team_id: teamId,
      title: form.title.trim(),
      artist: form.artist.trim() || null,
      key: form.key.trim() || null,
      origin: form.origin,
      book_number: BOOK_ORIGINS.includes(form.origin) ? form.book_number.trim() || null : null,
      suggested_parts: form.suggested_parts ?? [],
      suggested_seasons: form.suggested_seasons ?? [],
      audio_url: null,
      created_by: user?.id ?? null,
    } as never)
    .select()
    .single()

  if (error) throw error
  const song = data as unknown as Song
  logAudit({
    teamId,
    action: 'create',
    entity: 'song',
    entityId: song.id,
    entityName: song.title,
    description: `Música adicionada: "${song.title}"`,
  })
  return song
}

export async function updateSong(id: string, form: SongFormData): Promise<Song> {
  const { data, error } = await supabase
    .from('songs')
    .update({
      title: form.title.trim(),
      artist: form.artist.trim() || null,
      key: form.key.trim() || null,
      origin: form.origin,
      book_number: BOOK_ORIGINS.includes(form.origin) ? form.book_number.trim() || null : null,
      suggested_parts: form.suggested_parts ?? [],
      suggested_seasons: form.suggested_seasons ?? [],
    } as never)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  const song = data as unknown as Song
  logAudit({
    teamId: song.team_id,
    action: 'update',
    entity: 'song',
    entityId: song.id,
    entityName: song.title,
    description: `Música editada: "${song.title}"`,
  })
  return song
}

export async function deleteSong(id: string): Promise<void> {
  // Pre-fetch para obter contexto de auditoria antes de deletar
  const { data: songData } = await supabase
    .from('songs')
    .select('id, team_id, title')
    .eq('id', id)
    .maybeSingle()
  const { error } = await supabase.from('songs').delete().eq('id', id)
  if (error) throw error
  if (songData) {
    const s = songData as unknown as { id: string; team_id: string; title: string }
    logAudit({
      teamId: s.team_id,
      action: 'delete',
      entity: 'song',
      entityId: s.id,
      entityName: s.title,
      description: `Música removida: "${s.title}"`,
    })
  }
}

// ── Storage ───────────────────────────────────────────────────

export type SongFileType = 'partitura' | 'letra' | 'cifra'

export async function uploadSongFile(
  teamId: string,
  songId: string,
  type: SongFileType,
  file: File,
): Promise<string> {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : ''
  const path = `${teamId}/${songId}/${type}${ext ? `.${ext}` : ''}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function removeSongFile(
  teamId: string,
  songId: string,
  type: SongFileType,
): Promise<void> {
  const { data: files } = await supabase.storage
    .from(BUCKET)
    .list(`${teamId}/${songId}`, { search: type })

  const paths = (files ?? [])
    .filter((f) => f.name.startsWith(type))
    .map((f) => `${teamId}/${songId}/${f.name}`)

  if (paths.length > 0) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths)
    if (error) throw error
  }
}

export async function updateSongAudioUrl(songId: string, url: string | null): Promise<void> {
  const { error } = await supabase
    .from('songs')
    .update({ audio_url: url } as never)
    .eq('id', songId)
  if (error) throw error
}

export async function updateSongFileUrl(
  songId: string,
  field: `${SongFileType}_url`,
  url: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('songs')
    .update({ [field]: url } as never)
    .eq('id', songId)

  if (error) throw error
}
