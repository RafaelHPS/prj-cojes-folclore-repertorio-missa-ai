import { supabase } from '@/lib/supabase'
import type { Song } from './types'
import type { SongFormData } from './songs.schemas'

const BUCKET = 'song-files'

export async function fetchSongs(teamId: string): Promise<Song[]> {
  const { data, error } = await supabase
    .from('songs')
    .select('*')
    .eq('team_id', teamId)
    .order('title')

  if (error) throw error
  return (data ?? []) as unknown as Song[]
}

export async function createSong(teamId: string, form: SongFormData): Promise<Song> {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('songs')
    .insert({
      team_id: teamId,
      title: form.title.trim(),
      artist: form.artist.trim() || null,
      key: form.key.trim() || null,
      created_by: user?.id ?? null,
    } as never)
    .select()
    .single()

  if (error) throw error
  return data as unknown as Song
}

export async function updateSong(id: string, form: SongFormData): Promise<Song> {
  const { data, error } = await supabase
    .from('songs')
    .update({
      title: form.title.trim(),
      artist: form.artist.trim() || null,
      key: form.key.trim() || null,
    } as never)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as unknown as Song
}

export async function deleteSong(id: string): Promise<void> {
  const { error } = await supabase.from('songs').delete().eq('id', id)
  if (error) throw error
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
