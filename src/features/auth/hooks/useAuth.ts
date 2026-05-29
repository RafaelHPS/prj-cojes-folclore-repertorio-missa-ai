import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { signInWithEmail, signOut, sendPasswordReset } from '../auth.service'
import { useAppStore } from '@/app/app.store'

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  async function login(email: string, password: string) {
    setIsLoading(true)
    setError(null)
    try {
      await signInWithEmail(email, password)
      navigate('/selecionar-equipe')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar.')
    } finally {
      setIsLoading(false)
    }
  }

  return { login, isLoading, error }
}

export function useLogout() {
  const clearAll = useAppStore((s) => s.clearAll)
  const navigate = useNavigate()

  return async function logout() {
    await signOut()
    clearAll()
    navigate('/login')
  }
}

export function usePasswordReset() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reset(email: string) {
    setIsLoading(true)
    setError(null)
    try {
      await sendPasswordReset(email)
      setIsSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar e-mail.')
    } finally {
      setIsLoading(false)
    }
  }

  return { reset, isLoading, isSent, error }
}
