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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div
            aria-hidden="true"
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-2xl text-white shadow-lg"
          >
            ✦
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Repertório de Missas</h1>
          <p className="mt-1 text-sm text-gray-500">Gestão litúrgica para sua equipe</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {mode === 'login' ? (
            <>
              <h2 className="mb-6 text-lg font-semibold text-gray-800">Entrar na conta</h2>

              <form onSubmit={loginForm.handleSubmit(handleLogin)} noValidate className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-gray-700">
                    E-mail
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    aria-describedby={loginForm.formState.errors.email ? 'login-email-error' : undefined}
                    aria-invalid={!!loginForm.formState.errors.email}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p id="login-email-error" role="alert" className="mt-1 text-xs text-red-600">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-gray-700">
                    Senha
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    aria-describedby={loginForm.formState.errors.password ? 'login-password-error' : undefined}
                    aria-invalid={!!loginForm.formState.errors.password}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                    {...loginForm.register('password')}
                  />
                  {loginForm.formState.errors.password && (
                    <p id="login-password-error" role="alert" className="mt-1 text-xs text-red-600">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {loginError && (
                  <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                    {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoginLoading}
                  className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
                >
                  {isLoginLoading ? 'Entrando…' : 'Entrar'}
                </button>
              </form>

              <button
                onClick={() => setMode('reset')}
                className="mt-4 w-full text-center text-sm text-violet-600 hover:underline"
              >
                Esqueci minha senha
              </button>
            </>
          ) : (
            <>
              <h2 className="mb-2 text-lg font-semibold text-gray-800">Recuperar senha</h2>
              <p className="mb-6 text-sm text-gray-500">
                Enviaremos um link de redefinição para seu e-mail.
              </p>

              {isSent ? (
                <div role="alert" className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                  E-mail enviado! Verifique sua caixa de entrada.
                </div>
              ) : (
                <form onSubmit={resetForm.handleSubmit(handleReset)} noValidate className="space-y-4">
                  <div>
                    <label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-gray-700">
                      E-mail
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      aria-describedby={resetForm.formState.errors.email ? 'reset-email-error' : undefined}
                      aria-invalid={!!resetForm.formState.errors.email}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                      {...resetForm.register('email')}
                    />
                    {resetForm.formState.errors.email && (
                      <p id="reset-email-error" role="alert" className="mt-1 text-xs text-red-600">
                        {resetForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  {resetError && (
                    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                      {resetError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isResetLoading}
                    className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
                  >
                    {isResetLoading ? 'Enviando…' : 'Enviar link'}
                  </button>
                </form>
              )}

              <button
                onClick={() => setMode('login')}
                className="mt-4 w-full text-center text-sm text-gray-500 hover:underline"
              >
                ← Voltar para o login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
