import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useAppStore } from '@/app/app.store'
import { useSession } from '@/hooks/useSession'
import { updateUserPassword } from '@/features/teams/settings.service'

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

type PasswordFormData = z.infer<typeof passwordSchema>

export default function NewPasswordPage() {
  const session = useSession()
  const isSessionLoading = useAppStore((s) => s.isSessionLoading)
  const navigate = useNavigate()

  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) })

  const noSession = !isSessionLoading && !session

  async function onSubmit(data: PasswordFormData) {
    setStatus('saving')
    setErrorMsg(null)
    try {
      await updateUserPassword(data.newPassword)
      setStatus('saved')
      setTimeout(() => navigate('/selecionar-equipe', { replace: true }), 1500)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar a senha.')
      setStatus('error')
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

        {isSessionLoading && (
          <div className="mt-8">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-sm text-outline">Verificando link…</p>
          </div>
        )}

        {noSession && (
          <div className="mt-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
              <span aria-hidden="true" className="material-symbols-outlined text-3xl text-error">
                error
              </span>
            </div>
            <p className="font-headline text-lg font-bold text-on-surface">Link inválido</p>
            <p className="mt-2 text-sm text-outline">
              O link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".
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

        {!isSessionLoading && session && status !== 'saved' && (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 text-left">
            <p className="mb-4 text-center text-sm text-outline">Crie sua nova senha de acesso.</p>
            <div className="mb-3">
              <label
                htmlFor="new-password"
                className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
              >
                Nova senha
              </label>
              <input
                id="new-password"
                type="password"
                autoFocus
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
                htmlFor="confirm-password"
                className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
              >
                Confirmar senha
              </label>
              <input
                id="confirm-password"
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

            {status === 'error' && errorMsg && (
              <p role="alert" className="mb-3 text-xs text-error">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || status === 'saving'}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-on-primary transition hover:bg-secondary disabled:opacity-60"
            >
              {status === 'saving' ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Salvar nova senha'
              )}
            </button>
          </form>
        )}

        {status === 'saved' && (
          <div className="mt-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <span aria-hidden="true" className="material-symbols-outlined text-3xl text-success">
                check_circle
              </span>
            </div>
            <p className="font-headline text-lg font-bold text-on-surface">Senha atualizada!</p>
            <p className="mt-2 text-sm text-outline">Redirecionando…</p>
          </div>
        )}
      </div>
    </div>
  )
}
