import { supabase } from '@/lib/supabase'

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function sendPasswordReset(email: string): Promise<void> {
  // Inclui o base path (ex.: /prj-cojes-folclore-repertorio-missa-ai/) — o app é
  // servido numa subpasta no GitHub Pages, então window.location.origin sozinho
  // aponta pra fora do site (mesmo bug já corrigido no fluxo de convite).
  const redirectTo = `${(window.location.origin + import.meta.env.BASE_URL).replace(/\/$/, '')}/nova-senha`

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
