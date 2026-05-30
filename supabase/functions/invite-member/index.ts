import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // Sempre retorna 200 — erros vêm no campo `error` do body
  // Isso permite que o cliente leia a mensagem exata sem tratamento especial de status
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

    console.log(`[invite-member] email=${email} teamId=${teamId} role=${role} siteUrl=${siteUrl}`)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Valida JWT do chamador
    const authHeader = req.headers.get('Authorization') ?? ''
    const caller = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authErr } = await caller.auth.getUser()
    if (authErr || !user) {
      console.error('[invite-member] auth error:', authErr?.message)
      return json({ error: 'Não autenticado' })
    }

    // Verifica se chamador é admin
    const { data: membership } = await admin
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if ((membership as { role: string } | null)?.role !== 'admin') {
      console.error('[invite-member] caller is not admin')
      return json({ error: 'Sem permissão: você precisa ser administrador da equipe.' })
    }

    // Registra convite pendente
    const { error: upsertErr } = await admin.from('invites').upsert(
      { team_id: teamId, email, role, invited_by: user.id, accepted_at: null },
      { onConflict: 'team_id,email' },
    )
    if (upsertErr) {
      console.error('[invite-member] upsert error:', upsertErr.message)
      return json({ error: `Erro ao registrar convite: ${upsertErr.message}` })
    }

    // Envia e-mail
    const redirectTo = `${siteUrl}/aceitar-convite`
    console.log(`[invite-member] redirectTo=${redirectTo}`)

    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { team_id: teamId, role, invited_by: user.id },
    })

    if (inviteErr) {
      console.error('[invite-member] inviteUserByEmail error:', inviteErr.message)
      return json({ error: `Erro ao enviar e-mail: ${inviteErr.message}` })
    }

    console.log(`[invite-member] success for ${email}`)
    return json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno desconhecido'
    console.error('[invite-member] unexpected error:', message)
    return json({ error: message })
  }
})

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200, // sempre 200 para que o cliente possa ler o body
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
