import { supabase } from '@/lib/supabase'

export type AuditAction = 'create' | 'update' | 'delete'
export type AuditEntity = 'song' | 'mass' | 'mass_song'

export interface AuditLog {
  id: string
  team_id: string
  user_id: string | null
  user_name: string | null
  action: AuditAction
  entity: AuditEntity
  entity_id: string | null
  entity_name: string | null
  description: string | null
  created_at: string
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
  void (async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Resolve o nome do usuário direto na inserção para evitar join com RLS
      let userName: string | null = null
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle()
        userName = (profile as unknown as { full_name: string | null } | null)?.full_name ?? null
      }

      await supabase.from('audit_logs').insert({
        team_id: params.teamId,
        user_id: user?.id ?? null,
        user_name: userName,
        action: params.action,
        entity: params.entity,
        entity_id: params.entityId ?? null,
        entity_name: params.entityName ?? null,
        description: params.description ?? null,
      } as never)
    } catch {
      // fire-and-forget — nunca propaga erro
    }
  })()
}

export async function fetchAuditLogs(teamId: string, limit = 150): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(
      'id, team_id, user_id, user_name, action, entity, entity_id, entity_name, description, created_at',
    )
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as unknown as AuditLog[]
}
