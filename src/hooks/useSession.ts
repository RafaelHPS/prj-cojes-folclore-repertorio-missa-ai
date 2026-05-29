import { useEffect } from 'react'

import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/app/app.store'

export function useSession() {
  const { session, setSession, setIsSessionLoading } = useAppStore()

  useEffect(() => {
    // Recupera sessão persistida pelo Supabase no localStorage
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsSessionLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setIsSessionLoading(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [setSession, setIsSessionLoading])

  return session
}
