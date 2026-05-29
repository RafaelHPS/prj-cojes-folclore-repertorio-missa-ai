import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { PublicLayout } from '@/layouts/PublicLayout'

// Lazy imports para code splitting
import { lazy, Suspense } from 'react'

const LoginPage = lazy(() => import('@/features/auth/components/LoginPage'))
const SelectTeamPage = lazy(() => import('@/features/teams/components/SelectTeamPage'))
const DashboardPage = lazy(() => import('@/features/teams/components/DashboardPage'))
const SongsPage = lazy(() => import('@/features/songs/components/SongsPage'))
const MassesPage = lazy(() => import('@/features/masses/components/MassesPage'))
const MassDetailPage = lazy(() => import('@/features/masses/components/MassDetailPage'))
const StatisticsPage = lazy(() => import('@/features/teams/components/StatisticsPage'))
const SettingsPage = lazy(() => import('@/features/teams/components/SettingsPage'))

function Loader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
    </div>
  )
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<Loader />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  // Rotas públicas
  {
    element: <PublicLayout />,
    children: [
      { path: '/login', element: withSuspense(<LoginPage />) },
      { path: '/missas/:id', element: withSuspense(<MassDetailPage />) },
    ],
  },

  // Seleção de equipe: autenticado, mas pode não ter equipe
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/selecionar-equipe', element: withSuspense(<SelectTeamPage />) },
    ],
  },

  // Rotas privadas: autenticado + equipe ativa
  {
    element: <ProtectedRoute requireTeam />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/dashboard', element: withSuspense(<DashboardPage />) },
          { path: '/musicas', element: withSuspense(<SongsPage />) },
          { path: '/missas', element: withSuspense(<MassesPage />) },
          { path: '/estatisticas', element: withSuspense(<StatisticsPage />) },
          { path: '/configuracoes', element: withSuspense(<SettingsPage />) },
        ],
      },
    ],
  },

  // Raiz
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
