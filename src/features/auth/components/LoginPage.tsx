import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { useLogin, usePasswordReset } from '../hooks/useAuth'
import { loginSchema, resetPasswordSchema } from '../auth.schemas'
import type { LoginFormData, ResetPasswordFormData } from '../auth.schemas'

type PageMode = 'login' | 'reset'

export default function LoginPage() {
  const [mode, setMode] = useState<PageMode>('login')

  const { login, isLoading: isLoginLoading, error: loginError } = useLogin()
  const { reset, isLoading: isResetLoading, isSent, error: resetError } = usePasswordReset()

  const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })
  const resetForm = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema) })

  async function handleLogin(data: LoginFormData) {
    await login(data.email, data.password)
  }

  async function handleReset(data: ResetPasswordFormData) {
    await reset(data.email)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary shadow-lg shadow-primary/30">
            <span aria-hidden="true" className="material-symbols-outlined text-3xl text-on-primary">
              church
            </span>
          </div>
          <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
            Repertório de Missas
          </h1>
          <p className="mt-1 text-sm text-outline">Gestão litúrgica para sua equipe</p>
        </div>

        <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-8 tonal-shadow">
          {mode === 'login' ? (
            <>
              <h2 className="font-headline mb-6 text-lg font-bold text-on-surface">
                Entrar na conta
              </h2>

              <form onSubmit={loginForm.handleSubmit(handleLogin)} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
                  >
                    E-mail
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    aria-describedby={
                      loginForm.formState.errors.email ? 'login-email-error' : undefined
                    }
                    aria-invalid={!!loginForm.formState.errors.email}
                    className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-outline transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p id="login-email-error" role="alert" className="mt-1 text-xs text-error">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
                  >
                    Senha
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    aria-describedby={
                      loginForm.formState.errors.password ? 'login-password-error' : undefined
                    }
                    aria-invalid={!!loginForm.formState.errors.password}
                    className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-outline transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    {...loginForm.register('password')}
                  />
                  {loginForm.formState.errors.password && (
                    <p id="login-password-error" role="alert" className="mt-1 text-xs text-error">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {loginError && (
                  <p role="alert" className="rounded-2xl bg-error/5 px-4 py-3 text-sm text-error">
                    {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoginLoading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition hover:bg-secondary disabled:opacity-60"
                >
                  {isLoginLoading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <span aria-hidden="true" className="material-symbols-outlined text-base">
                      login
                    </span>
                  )}
                  {isLoginLoading ? 'Entrando…' : 'Entrar'}
                </button>
              </form>

              <button
                onClick={() => setMode('reset')}
                className="mt-5 w-full text-center text-sm font-medium text-outline transition hover:text-primary"
              >
                Esqueci minha senha
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setMode('login')}
                className="mb-4 flex items-center gap-1 text-sm font-medium text-outline transition hover:text-primary"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  arrow_back
                </span>
                Voltar
              </button>
              <h2 className="font-headline mb-2 text-lg font-bold text-on-surface">
                Recuperar senha
              </h2>
              <p className="mb-6 text-sm text-outline">
                Enviaremos um link de redefinição para seu e-mail.
              </p>

              {isSent ? (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-2xl bg-primary/5 px-4 py-4 text-sm text-primary"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-base mt-0.5">
                    check_circle
                  </span>
                  E-mail enviado! Verifique sua caixa de entrada.
                </div>
              ) : (
                <form
                  onSubmit={resetForm.handleSubmit(handleReset)}
                  noValidate
                  className="space-y-4"
                >
                  <div>
                    <label
                      htmlFor="reset-email"
                      className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
                    >
                      E-mail
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      aria-describedby={
                        resetForm.formState.errors.email ? 'reset-email-error' : undefined
                      }
                      aria-invalid={!!resetForm.formState.errors.email}
                      className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-outline transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...resetForm.register('email')}
                    />
                    {resetForm.formState.errors.email && (
                      <p id="reset-email-error" role="alert" className="mt-1 text-xs text-error">
                        {resetForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  {resetError && (
                    <p role="alert" className="rounded-2xl bg-error/5 px-4 py-3 text-sm text-error">
                      {resetError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isResetLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition hover:bg-secondary disabled:opacity-60"
                  >
                    {isResetLoading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <span aria-hidden="true" className="material-symbols-outlined text-base">
                        send
                      </span>
                    )}
                    {isResetLoading ? 'Enviando…' : 'Enviar link'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
