import { z } from 'zod'

export const LITURGICAL_SEASONS = [
  'tempo_comum',
  'advento',
  'natal',
  'quaresma',
  'pascoa',
  'pentecostes',
] as const

export const LITURGICAL_SEASON_LABEL: Record<(typeof LITURGICAL_SEASONS)[number], string> = {
  tempo_comum: 'Tempo Comum',
  advento: 'Advento',
  natal: 'Natal',
  quaresma: 'Quaresma',
  pascoa: 'Páscoa',
  pentecostes: 'Pentecostes',
}

export const massSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
  date: z.string().min(1, 'Data é obrigatória'),
  time: z.string().optional(),
  liturgical_year: z.enum(['A', 'B', 'C']).optional(),
  liturgical_season: z.enum(LITURGICAL_SEASONS).optional(),
  description: z.string().max(500, 'Descrição muito longa').optional(),
  is_public: z.boolean(),
})

export type MassFormData = z.infer<typeof massSchema>
