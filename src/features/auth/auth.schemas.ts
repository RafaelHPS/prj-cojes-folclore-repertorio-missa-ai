import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export const resetPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>
