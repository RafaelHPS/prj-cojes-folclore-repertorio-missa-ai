import { useEffect, useState, useCallback } from 'react'

import { useAppStore } from '@/app/app.store'
import { fetchRolePermissions, DEFAULT_PERMISSIONS } from '@/features/teams/permissions.service'
import type { Permission, PermissionMap } from '@/features/teams/permissions.service'
import type { UserRole } from '@/types/database'

/**
 * Retorna uma função `can(permission)` que verifica se o usuário atual
 * tem permissão para realizar uma ação, de acordo com a configuração da equipe.
 */
export function useTeamPermissions() {
  const activeTeam = useAppStore((s) => s.activeTeam)
  const currentUserRole = activeTeam?.role as UserRole | undefined
  const [permissionMap, setPermissionMap] = useState<PermissionMap>(DEFAULT_PERMISSIONS)

  useEffect(() => {
    if (!activeTeam) return

    fetchRolePermissions(activeTeam.id)
      .then(setPermissionMap)
      .catch(() => {
        setPermissionMap(DEFAULT_PERMISSIONS)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeam?.id])

  const can = useCallback(
    (permission: Permission): boolean => {
      if (!currentUserRole) return false
      if (currentUserRole === 'admin') return true
      return permissionMap[currentUserRole]?.[permission] ?? false
    },
    [permissionMap, currentUserRole],
  )

  return { can, permissionMap }
}
