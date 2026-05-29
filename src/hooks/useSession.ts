import { useEffect } from 'react'

import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/app/app.store'

export function useSession() {
  const { session, setSession } = useAppStore()

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [setSession])

  return session
}
