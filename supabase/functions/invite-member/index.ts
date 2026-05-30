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

    // Verifica se chamador é admin da equipe
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
    await admin.from('invites').upsert(
      { team_id: teamId, email, role, invited_by: callerUser.id, accepted_at: null },
      { onConflict: 'team_id,email' },
    )

    // Cria o usuário diretamente (sem envio de e-mail automático)
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,  // confirma e-mail automaticamente
      user_metadata: { team_id: teamId, role, invited_by: callerUser.id },
    })

    if (createErr) {
      console.error('[invite-member] createUser error:', createErr.message)
      return json({ error: `Erro ao criar usuário: ${createErr.message}` })
    }

    // Gera link de definição de senha para o admin compartilhar
    const redirectTo = `${siteUrl}/aceitar-convite`
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })

    if (linkErr) {
      console.error('[invite-member] generateLink error:', linkErr.message)
      // Usuário foi criado, mas sem link — ainda é um sucesso parcial
      return json({ success: true, link: null })
    }

    const link =
      (linkData as unknown as { properties?: { action_link?: string } })
        ?.properties?.action_link ?? null

    console.log(`[invite-member] success for ${email}, link generated: ${!!link}`)
    return json({ success: true, link })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno desconhecido'
    console.error('[invite-member] unexpected error:', message)
    return json({ error: message })
  }
})

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
