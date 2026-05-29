import { z } from 'zod'

export const massSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
  date: z.string().min(1, 'Data é obrigatória'),
  time: z.string().optional(),
  liturgical_year: z.enum(['A', 'B', 'C']).optional(),
  description: z.string().max(500, 'Descrição muito longa').optional(),
  is_public: z.boolean(),
})

export type MassFormData = z.infer<typeof massSchema>
