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
  const { data: membersData, error: membersError } = await supabase
    .from('team_members')
    .select('id, user_id, role, created_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true })

  if (membersError) throw membersError

  type MemberRow = { id: string; user_id: string; role: string; created_at: string }
  const members = (membersData ?? []) as unknown as MemberRow[]
  if (members.length === 0) return []

  const userIds = members.map((m) => m.user_id)
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)

  type ProfileRow = { id: string; full_name: string | null }
  const profileMap = new Map(
    ((profilesData ?? []) as unknown as ProfileRow[]).map((p) => [p.id, p.full_name]),
  )

  return members.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    role: row.role as UserRole,
    created_at: row.created_at,
    full_name: profileMap.get(row.user_id) ?? null,
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

// ── Convites ──────────────────────────────────────────────────

export interface Invite {
  id: string
  team_id: string
  email: string
  role: UserRole
  invited_by: string | null
  created_at: string
  accepted_at: string | null
}

export async function sendInvite(email: string, teamId: string, role: UserRole): Promise<void> {
  const { data, error } = await supabase.functions.invoke('invite-member', {
    body: { email, teamId, role, siteUrl: window.location.origin },
  })

  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error as string)
}

export async function fetchPendingInvites(teamId: string): Promise<Invite[]> {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('team_id', teamId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as Invite[]
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.from('invites').delete().eq('id', inviteId)
  if (error) throw error
}

// ── Perfil do usuário ─────────────────────────────────────────

export interface UserProfile {
  id: string
  full_name: string | null
  email: string
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Não autenticado')

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', user.id)
    .single()

  if (error) throw error
  const row = data as { id: string; full_name: string | null }
  return { id: user.id, full_name: row?.full_name ?? null, email: user.email ?? '' }
}

export async function updateUserProfile(userId: string, fullName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName.trim() } as never)
    .eq('id', userId)
  if (error) throw error
}

export async function updateUserPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
