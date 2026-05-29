import { useAppStore } from '@/app/app.store'

export function useActiveTeam() {
  return useAppStore((s) => s.activeTeam)
}
