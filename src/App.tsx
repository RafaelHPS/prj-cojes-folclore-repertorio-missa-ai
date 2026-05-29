import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { useSession } from '@/hooks/useSession'

function AppProviders() {
  useSession() // sincroniza sessão Supabase → Zustand
  return <RouterProvider router={router} />
}

export default AppProviders
