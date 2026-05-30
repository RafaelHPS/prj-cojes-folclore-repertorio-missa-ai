import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { useSession } from '@/hooks/useSession'
import { useAppStore } from '@/app/app.store'

export default function AcceptInvitePage() {
  const session = useSession()
  const isSessionLoading = useAppStore((s) => s.isSessionLoading)
  const navigate = useNavigate()

  // Status derivado — sem setState no efeito
  const status: 'loading' | 'success' | 'error' = isSessionLoading
    ? 'loading'
    : session
      ? 'success'
      : 'error'

  useEffect(() => {
    if (!session) return
    const timer = setTimeout(() => navigate('/selecionar-equipe', { replace: true }), 2000)
    return () => clearTimeout(timer)
  }, [session, navigate])

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

        {status === 'loading' && (
          <div className="mt-8">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-sm text-outline">Verificando seu convite…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <span aria-hidden="true" className="material-symbols-outlined text-3xl text-primary">
                check_circle
              </span>
            </div>
            <p className="font-headline text-lg font-bold text-on-surface">Convite aceito!</p>
            <p className="mt-2 text-sm text-outline">
              Você foi adicionado à equipe. Redirecionando…
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
              <span aria-hidden="true" className="material-symbols-outlined text-3xl text-error">
                error
              </span>
            </div>
            <p className="font-headline text-lg font-bold text-on-surface">Link inválido</p>
            <p className="mt-2 text-sm text-outline">O link de convite expirou ou já foi usado.</p>
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
