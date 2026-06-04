import { z } from 'zod'
import type { SongOrigin } from './types'

export const LITURGICAL_SEASONS = [
  'tempo_comum',
  'advento',
  'natal',
  'quaresma',
  'pascoa',
  'pentecostes',
  'outros',
] as const

export const LITURGICAL_SEASON_LABEL: Record<(typeof LITURGICAL_SEASONS)[number], string> = {
  tempo_comum: 'Tempo Comum',
  advento: 'Advento',
  natal: 'Natal',
  quaresma: 'Quaresma',
  pascoa: 'Páscoa',
  pentecostes: 'Pentecostes',
  outros: 'Outros',
}

export const MASS_PARTS = [
  'entrada',
  'ato_penitencial',
  'hino_de_louvor',
  'salmo',
  'sequencia',
  'aclamacao',
  'ofertorio',
  'santo',
  'cordeiro',
  'comunhao',
  'pos_comunhao',
  'final',
] as const

export const MASS_PART_LABEL: Record<(typeof MASS_PARTS)[number], string> = {
  entrada: 'Entrada',
  ato_penitencial: 'Ato Penitencial',
  hino_de_louvor: 'Glória',
  salmo: 'Salmo',
  sequencia: 'Sequência',
  aclamacao: 'Aclamação',
  ofertorio: 'Ofertório',
  santo: 'Santo',
  cordeiro: 'Cordeiro',
  comunhao: 'Comunhão',
  pos_comunhao: 'Pós-Comunhão',
  final: 'Final',
}

export const BOOK_ORIGINS: SongOrigin[] = ['arquidiocese', 'cojes', 'salmos']

export const ORIGIN_LABEL: Record<SongOrigin, string> = {
  outros: 'Outros',
  arquidiocese: 'Livro Arquidiocese',
  cojes: 'Livrinho COJES',
  salmos: 'Livro dos Salmos',
}

export const songSchema = z
  .object({
    title: z.string().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
    artist: z.string().max(200, 'Nome muito longo'),
    key: z.string(),
    origin: z.enum(['outros', 'arquidiocese', 'cojes', 'salmos'] as const),
    book_number: z.string().max(20, 'Número muito longo'),
    suggested_parts: z.array(z.enum(MASS_PARTS)),
    suggested_seasons: z.array(z.enum(LITURGICAL_SEASONS)),
  })
  .refine(
    (data) =>
      !BOOK_ORIGINS.includes(data.origin as SongOrigin) || data.book_number.trim().length > 0,
    { message: 'Número no livro é obrigatório para esta origem', path: ['book_number'] },
  )

export type SongFormData = z.infer<typeof songSchema>
