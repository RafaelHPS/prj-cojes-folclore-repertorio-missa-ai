import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/database'

// ── Dados da equipe ───────────────────────────────────────────

export interface TeamDetails {
  id: string
  name: string
  slug: string | null
  logo_url: string | null
}

export async function fetchTeamDetails(teamId: string): Promise<TeamDetails | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, slug, logo_url')
    .eq('id', teamId)
    .single()

  if (error) return null
  return data as unknown as TeamDetails
}

export async function updateTeamDetails(
  teamId: string,
  fields: { name: string; slug?: string },
): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .update({
      name: fields.name.trim(),
      slug: fields.slug?.trim() || null,
    } as never)
    .eq('id', teamId)

  if (error) throw error
}

// ── Membros ───────────────────────────────────────────────────

export interface TeamMember {
  id: string
  user_id: string
  role: UserRole
  created_at: string
  full_name: string | null
}

export async function fetchTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('id, user_id, role, created_at, profiles(full_name)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true })

  if (error) throw error

  type Row = {
    id: string
    user_id: string
    role: string
    created_at: string
    profiles: { full_name: string | null } | null
  }

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    role: row.role as UserRole,
    created_at: row.created_at,
    full_name: row.profiles?.full_name ?? null,
  }))
}

export async function updateMemberRole(memberId: string, role: UserRole): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .update({ role } as never)
    .eq('id', memberId)

  if (error) throw error
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('team_members').delete().eq('id', memberId)

  if (error) throw error
}
