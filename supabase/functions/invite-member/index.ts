import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { email, teamId, role } = await req.json() as {
      email: string
      teamId: string
      role: string
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

    // Registra convite pendente
    const { error: upsertErr } = await admin.from('invites').upsert(
      { team_id: teamId, email, role, invited_by: callerUser.id, accepted_at: null },
      { onConflict: 'team_id,email' },
    )
    if (upsertErr) {
      return json({ error: `Erro ao registrar convite: ${upsertErr.message}` })
    }

    // Cria o usuário (e-mail confirmado automaticamente, sem envio de e-mail)
    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { team_id: teamId, role, invited_by: callerUser.id },
    })

    if (createErr) {
      console.error('[invite-member] createUser:', createErr.message)
      return json({ error: `Erro ao criar usuário: ${createErr.message}` })
    }

    console.log(`[invite-member] user created: ${email}`)
    return json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno'
    console.error('[invite-member] error:', message)
    return json({ error: message })
  }
})

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
