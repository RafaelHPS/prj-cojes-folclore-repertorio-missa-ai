import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/app/app.store'
import { useSession } from '@/hooks/useSession'

type InviteStatus = 'processing' | 'success' | 'no_invite' | 'error'

export default function AcceptInvitePage() {
  const session = useSession()
  const isSessionLoading = useAppStore((s) => s.isSessionLoading)
  const navigate = useNavigate()
  const processed = useRef(false)

  const [inviteStatus, setInviteStatus] = useState<InviteStatus | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Derived — sem setState direto no corpo do efeito
  const noSession = !isSessionLoading && !session
  const displayStatus = noSession ? 'error' : (inviteStatus ?? 'loading')

  useEffect(() => {
    if (isSessionLoading || processed.current || !session) return

    processed.current = true

    async function processInvite() {
      setInviteStatus('processing')
      try {
        const { data, error } = await supabase.rpc('accept_pending_invite')
        if (error) throw error

        const result = data as { found: boolean } | null
        const nextStatus: InviteStatus = result?.found ? 'success' : 'no_invite'
        setInviteStatus(nextStatus)
        setTimeout(() => navigate('/selecionar-equipe', { replace: true }), 2000)
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Erro ao processar convite.')
        setInviteStatus('error')
      }
    }

    void processInvite()
  }, [session, isSessionLoading, navigate])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 text-center">
      <div className="w-full max-w-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary shadow-lg shadow-primary/30">
          <span aria-hidden="true" className="material-symbols-outlined text-3xl text-on-primary">
            church
          </span>
        </div>
        <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
          Repertório de Missas
        </h1>

        {(displayStatus === 'loading' || displayStatus === 'processing') && (
          <div className="mt-8">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-sm text-outline">
              {displayStatus === 'loading' ? 'Verificando acesso…' : 'Configurando sua conta…'}
            </p>
          </div>
        )}

        {displayStatus === 'success' && (
          <div className="mt-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <span aria-hidden="true" className="material-symbols-outlined text-3xl text-primary">
                check_circle
              </span>
            </div>
            <p className="font-headline text-lg font-bold text-on-surface">Bem-vindo à equipe!</p>
            <p className="mt-2 text-sm text-outline">
              Você foi adicionado com sucesso. Redirecionando…
            </p>
          </div>
        )}

        {displayStatus === 'no_invite' && (
          <div className="mt-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <span aria-hidden="true" className="material-symbols-outlined text-3xl text-primary">
                login
              </span>
            </div>
            <p className="font-headline text-lg font-bold text-on-surface">Acesso confirmado!</p>
            <p className="mt-2 text-sm text-outline">Redirecionando para suas equipes…</p>
          </div>
        )}

        {displayStatus === 'error' && (
          <div className="mt-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
              <span aria-hidden="true" className="material-symbols-outlined text-3xl text-error">
                error
              </span>
            </div>
            <p className="font-headline text-lg font-bold text-on-surface">Algo deu errado</p>
            <p className="mt-2 text-sm text-outline">
              {errorMsg ?? 'O link expirou ou já foi usado.'}
            </p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-on-primary transition hover:bg-secondary"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                login
              </span>
              Ir para o login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
