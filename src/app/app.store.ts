import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Session } from '@supabase/supabase-js'

import type { UserRole } from '@/types/database'

interface ActiveTeam {
  id: string
  name: string
  role: UserRole
}

interface AppState {
  session: Session | null
  isSessionLoading: boolean
  activeTeam: ActiveTeam | null
  setSession: (session: Session | null) => void
  setIsSessionLoading: (loading: boolean) => void
  setActiveTeam: (team: ActiveTeam | null) => void
  clearAll: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      session: null,
      isSessionLoading: true, // true até getSession() resolver
      activeTeam: null,
      setSession: (session) => set({ session }),
      setIsSessionLoading: (isSessionLoading) => set({ isSessionLoading }),
      setActiveTeam: (activeTeam) => set({ activeTeam }),
      clearAll: () => set({ session: null, activeTeam: null }),
    }),
    {
      name: 'repertorio-app',
      partialize: (state) => ({ activeTeam: state.activeTeam }),
    },
  ),
)
