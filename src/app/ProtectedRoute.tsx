import { Navigate, Outlet } from 'react-router-dom'

import { useAppStore } from './app.store'
import type { UserRole } from '@/types/database'

interface Props {
  requireTeam?: boolean
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ requireTeam = false, allowedRoles }: Props) {
  const session = useAppStore((s) => s.session)
  const isSessionLoading = useAppStore((s) => s.isSessionLoading)
  const activeTeam = useAppStore((s) => s.activeTeam)

  // Aguarda o Supabase resolver a sessão antes de redirecionar
  if (isSessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (requireTeam && !activeTeam) return <Navigate to="/selecionar-equipe" replace />

  if (allowedRoles && activeTeam && !allowedRoles.includes(activeTeam.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
