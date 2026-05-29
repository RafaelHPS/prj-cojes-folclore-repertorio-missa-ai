import { z } from 'zod'

export const songSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
  artist: z.string().max(200, 'Nome muito longo'),
  key: z.string(),
})

export type SongFormData = z.infer<typeof songSchema>
