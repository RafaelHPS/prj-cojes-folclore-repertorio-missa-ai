import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/app/app.store'
import { useSession } from '@/hooks/useSession'
import { updateUserPassword, updateUserProfile } from '@/features/teams/settings.service'

type InviteStatus = 'set_password' | 'processing' | 'success' | 'no_invite' | 'error'

const setupSchema = z
  .object({
    fullName: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
    newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type SetupFormData = z.infer<typeof setupSchema>

export default function AcceptInvitePage() {
  const session = useSession()
  const isSessionLoading = useAppStore((s) => s.isSessionLoading)
  const navigate = useNavigate()
  const readyForPasswordForm = useRef(false)

  const [inviteStatus, setInviteStatus] = useState<InviteStatus | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetupFormData>({ resolver: zodResolver(setupSchema) })

  // Derived — sem setState direto no corpo do efeito
  const noSession = !isSessionLoading && !session
  const displayStatus = noSession ? 'error' : (inviteStatus ?? 'loading')

  useEffect(() => {
    if (isSessionLoading || readyForPasswordForm.current || !session) return
    readyForPasswordForm.current = true
    // Todo acesso via convite precisa criar uma senha antes de entrar —
    // o Supabase cria o usuário sem senha até esse passo.
    setInviteStatus('set_password')
  }, [session, isSessionLoading])

  async function onSubmitPassword(data: SetupFormData) {
    if (!session) return
    setInviteStatus('processing')
    setErrorMsg(null)
    try {
      await updateUserPassword(data.newPassword)
      await updateUserProfile(session.user.id, data.fullName)

      const { data: rpcData, error } = await supabase.rpc('accept_pending_invite')
      if (error) throw error

      const result = rpcData as { found: boolean } | null
      const nextStatus: InviteStatus = result?.found ? 'success' : 'no_invite'
      setInviteStatus(nextStatus)
      setTimeout(() => navigate('/selecionar-equipe', { replace: true }), 2000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao processar convite.')
      setInviteStatus('error')
    }
  }

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

        {displayStatus === 'set_password' && (
          <form onSubmit={handleSubmit(onSubmitPassword)} noValidate className="mt-8 text-left">
            <p className="mb-4 text-center text-sm text-outline">
              Antes de continuar, complete seu cadastro.
            </p>
            <div className="mb-3">
              <label
                htmlFor="invite-full-name"
                className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
              >
                Nome completo
              </label>
              <input
                id="invite-full-name"
                type="text"
                autoFocus
                placeholder="Seu nome"
                aria-invalid={!!errors.fullName}
                className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-outline transition focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-error/20"
                {...register('fullName')}
              />
              {errors.fullName && (
                <p role="alert" className="mt-1 text-xs text-error">
                  {errors.fullName.message}
                </p>
              )}
            </div>
            <div className="mb-3">
              <label
                htmlFor="invite-new-password"
                className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
              >
                Nova senha
              </label>
              <input
                id="invite-new-password"
                type="password"
                aria-invalid={!!errors.newPassword}
                className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-error/20"
                {...register('newPassword')}
              />
              {errors.newPassword && (
                <p role="alert" className="mt-1 text-xs text-error">
                  {errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="mb-5">
              <label
                htmlFor="invite-confirm-password"
                className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
              >
                Confirmar senha
              </label>
              <input
                id="invite-confirm-password"
                type="password"
                aria-invalid={!!errors.confirmPassword}
                className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-error aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-error/20"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p role="alert" className="mt-1 text-xs text-error">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-on-primary transition hover:bg-secondary disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Criar senha e continuar'
              )}
            </button>
          </form>
        )}

        {displayStatus === 'success' && (
          <div className="mt-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <span aria-hidden="true" className="material-symbols-outlined text-3xl text-success">
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
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <span aria-hidden="true" className="material-symbols-outlined text-3xl text-success">
                verified
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
