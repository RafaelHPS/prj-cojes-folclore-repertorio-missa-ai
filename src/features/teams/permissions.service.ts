import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/database'

// ── Tipos ─────────────────────────────────────────────────────

export type Permission =
  | 'songs.create'
  | 'songs.edit'
  | 'songs.delete'
  | 'masses.create'
  | 'masses.edit'
  | 'masses.delete'
  | 'repertoire.add'
  | 'repertoire.remove'
  | 'repertoire.reorder'
  | 'participants.manage'
  | 'participants.remove'
  | 'audit.view'

export const ROLES_EDITABLE: UserRole[] = ['editor', 'contributor', 'viewer']

export const ALL_PERMISSIONS: Permission[] = [
  'songs.create',
  'songs.edit',
  'songs.delete',
  'masses.create',
  'masses.edit',
  'masses.delete',
  'repertoire.add',
  'repertoire.remove',
  'repertoire.reorder',
  'participants.manage',
  'participants.remove',
  'audit.view',
]

export interface PermissionGroup {
  label: string
  icon: string
  permissions: { key: Permission; label: string }[]
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Músicas',
    icon: 'music_note',
    permissions: [
      { key: 'songs.create', label: 'Criar músicas' },
      { key: 'songs.edit', label: 'Editar músicas' },
      { key: 'songs.delete', label: 'Excluir músicas' },
    ],
  },
  {
    label: 'Missas',
    icon: 'church',
    permissions: [
      { key: 'masses.create', label: 'Criar missas' },
      { key: 'masses.edit', label: 'Editar missas' },
      { key: 'masses.delete', label: 'Excluir missas' },
    ],
  },
  {
    label: 'Repertório',
    icon: 'queue_music',
    permissions: [
      { key: 'repertoire.add', label: 'Adicionar música à missa' },
      { key: 'repertoire.remove', label: 'Remover música da missa' },
      { key: 'repertoire.reorder', label: 'Reordenar músicas' },
    ],
  },
  {
    label: 'Participantes',
    icon: 'group',
    permissions: [
      { key: 'participants.manage', label: 'Adicionar / editar participantes' },
      { key: 'participants.remove', label: 'Remover participantes' },
    ],
  },
  {
    label: 'Relatórios',
    icon: 'manage_search',
    permissions: [{ key: 'audit.view', label: 'Ver logs de auditoria' }],
  },
]

// Permissões padrão quando não há configuração salva no banco
export const DEFAULT_PERMISSIONS: Record<UserRole, Record<Permission, boolean>> = {
  admin: {
    'songs.create': true,
    'songs.edit': true,
    'songs.delete': true,
    'masses.create': true,
    'masses.edit': true,
    'masses.delete': true,
    'repertoire.add': true,
    'repertoire.remove': true,
    'repertoire.reorder': true,
    'participants.manage': true,
    'participants.remove': true,
    'audit.view': true,
  },
  editor: {
    'songs.create': true,
    'songs.edit': true,
    'songs.delete': true,
    'masses.create': true,
    'masses.edit': true,
    'masses.delete': true,
    'repertoire.add': true,
    'repertoire.remove': true,
    'repertoire.reorder': true,
    'participants.manage': true,
    'participants.remove': true,
    'audit.view': false,
  },
  contributor: {
    'songs.create': true,
    'songs.edit': true,
    'songs.delete': false,
    'masses.create': false,
    'masses.edit': true,
    'masses.delete': false,
    'repertoire.add': true,
    'repertoire.remove': false,
    'repertoire.reorder': true,
    'participants.manage': true,
    'participants.remove': false,
    'audit.view': false,
  },
  viewer: {
    'songs.create': false,
    'songs.edit': false,
    'songs.delete': false,
    'masses.create': false,
    'masses.edit': false,
    'masses.delete': false,
    'repertoire.add': false,
    'repertoire.remove': false,
    'repertoire.reorder': false,
    'participants.manage': false,
    'participants.remove': false,
    'audit.view': false,
  },
}

export type PermissionMap = Record<UserRole, Record<Permission, boolean>>

// ── Service ───────────────────────────────────────────────────

/**
 * Busca as permissões configuradas da equipe, mesclando com os defaults.
 */
export async function fetchRolePermissions(teamId: string): Promise<PermissionMap> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('role, permission, allowed')
    .eq('team_id', teamId)

  if (error) throw error

  // Parte dos defaults
  const map: PermissionMap = {
    admin: { ...DEFAULT_PERMISSIONS.admin },
    editor: { ...DEFAULT_PERMISSIONS.editor },
    contributor: { ...DEFAULT_PERMISSIONS.contributor },
    viewer: { ...DEFAULT_PERMISSIONS.viewer },
  }

  // Sobrescreve com valores salvos no banco
  for (const row of data ?? []) {
    const role = row.role as UserRole
    const perm = row.permission as Permission
    if (role in map && ALL_PERMISSIONS.includes(perm)) {
      map[role][perm] = row.allowed
    }
  }

  return map
}

/**
 * Salva todas as permissões editáveis (editor, contributor, viewer) da equipe.
 * Admin é sempre bloqueado — não salvo.
 */
export async function saveRolePermissions(teamId: string, map: PermissionMap): Promise<void> {
  const rows = ROLES_EDITABLE.flatMap((role) =>
    ALL_PERMISSIONS.map((permission) => ({
      team_id: teamId,
      role,
      permission,
      allowed: map[role][permission],
      updated_at: new Date().toISOString(),
    })),
  )

  const { error } = await supabase.from('role_permissions').upsert(rows, {
    onConflict: 'team_id,role,permission',
  })

  if (error) throw error
}
