import { Navigate, Outlet } from 'react-router-dom'

import { useAppStore } from './app.store'
import type { UserRole } from '@/types/database'

interface Props {
  requireTeam?: boolean
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ requireTeam = false, allowedRoles }: Props) {
  const session = useAppStore((s) => s.session)
  const activeTeam = useAppStore((s) => s.activeTeam)

  if (!session) return <Navigate to="/login" replace />

  if (requireTeam && !activeTeam) return <Navigate to="/selecionar-equipe" replace />

  if (allowedRoles && activeTeam && !allowedRoles.includes(activeTeam.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
