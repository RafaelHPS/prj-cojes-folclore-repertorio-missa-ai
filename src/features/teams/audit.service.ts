import { supabase } from '@/lib/supabase'

export type AuditAction = 'create' | 'update' | 'delete'
export type AuditEntity = 'song' | 'mass' | 'mass_song'

export interface AuditLog {
  id: string
  team_id: string
  user_id: string | null
  action: AuditAction
  entity: AuditEntity
  entity_id: string | null
  entity_name: string | null
  description: string | null
  created_at: string
  profiles: { full_name: string | null } | null
}

interface LogParams {
  teamId: string
  action: AuditAction
  entity: AuditEntity
  entityId?: string
  entityName?: string
  description?: string
}

/**
 * Registra uma ação auditável. Fire-and-forget — nunca lança erro.
 */
export function logAudit(params: LogParams): void {
  supabase.auth
    .getUser()
    .then(({ data: { user } }) => {
      void supabase.from('audit_logs').insert({
        team_id: params.teamId,
        user_id: user?.id ?? null,
        action: params.action,
        entity: params.entity,
        entity_id: params.entityId ?? null,
        entity_name: params.entityName ?? null,
        description: params.description ?? null,
      } as never)
    })
    .catch(() => {})
}

export async function fetchAuditLogs(teamId: string, limit = 150): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, profiles(full_name)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as unknown as AuditLog[]
}
