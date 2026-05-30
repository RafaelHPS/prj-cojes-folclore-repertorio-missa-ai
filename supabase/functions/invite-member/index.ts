import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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

    // Cliente admin (service role) para operações privilegiadas
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Valida o JWT do chamador
    const authHeader = req.headers.get('Authorization') ?? ''
    const caller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authErr } = await caller.auth.getUser()
    if (authErr || !user) {
      return json({ error: 'Não autenticado' }, 401)
    }

    // Verifica se o chamador é admin da equipe
    const { data: membership } = await admin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if ((membership as { role: string } | null)?.role !== 'admin') {
      return json({ error: 'Sem permissão' }, 403)
    }

    // Registra convite pendente (upsert em caso de reenvio)
    await admin.from('invites').upsert(
      { team_id: teamId, email, role, invited_by: user.id, accepted_at: null },
      { onConflict: 'team_id,email' },
    )

    // Envia e-mail de convite via Supabase Auth
    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/aceitar-convite`,
      data: { team_id: teamId, role, invited_by: user.id },
    })

    if (inviteErr) throw new Error(inviteErr.message)

    return json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    return json({ error: message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
