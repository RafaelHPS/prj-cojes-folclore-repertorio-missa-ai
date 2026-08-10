import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Lista explícita de origens permitidas — nunca usar '*' numa function que
// tem efeitos colaterais reais (envia convite, grava linha em `invites`).
const ALLOWED_ORIGINS = [
  'https://rafaelhps.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  }
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

Deno.serve(async (req) => {
  const CORS = corsHeaders(req)
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { email, teamId, role, siteUrl } = await req.json() as {
      email: string
      teamId: string
      role: string
      siteUrl: string
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Valida JWT do chamador
    const authHeader = req.headers.get('Authorization') ?? ''
    const caller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: callerUser }, error: authErr } = await caller.auth.getUser()
    if (authErr || !callerUser) {
      return json({ error: 'Não autenticado' })
    }

    // Verifica se chamador é admin
    const { data: membership } = await admin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', callerUser.id)
      .single()

    if ((membership as { role: string } | null)?.role !== 'admin') {
      return json({ error: 'Sem permissão: você precisa ser administrador da equipe.' })
    }

    // Registra convite pendente (usado pelo AcceptInvitePage para adicionar à equipe)
    const { error: upsertErr } = await admin.from('invites').upsert(
      { team_id: teamId, email, role, invited_by: callerUser.id, accepted_at: null },
      { onConflict: 'team_id,email' },
    )
    if (upsertErr) {
      return json({ error: `Erro ao registrar convite: ${upsertErr.message}` })
    }

    // Envia e-mail de convite oficial do Supabase com link
    // Nota: o trigger on_auth_user_invited foi removido — não há mais conflito
    const redirectTo = `${siteUrl.replace(/\/$/, '')}/aceitar-convite`
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { team_id: teamId, role, invited_by: callerUser.id },
    })

    if (inviteErr) {
      console.error('[invite-member] inviteUserByEmail:', inviteErr.message)
      return json({ error: `Erro ao enviar convite: ${inviteErr.message}` })
    }

    console.log(`[invite-member] invite sent to ${email}`)
    return json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[invite-member] error:', message)
    return json({ error: message })
  }
})
