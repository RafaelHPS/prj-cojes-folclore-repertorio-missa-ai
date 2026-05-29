import type { SongFileType } from './songs.service'

export const MUSICAL_KEYS: readonly string[] = [
  'Dó', 'Dó#', 'Ré♭', 'Ré', 'Ré#', 'Mi♭', 'Mi', 'Fá',
  'Fá#', 'Sol♭', 'Sol', 'Sol#', 'Lá♭', 'Lá', 'Lá#', 'Si♭', 'Si',
]

export const FILE_CONFIG: readonly { type: SongFileType; label: string; accept: string }[] = [
  { type: 'partitura', label: 'Partitura', accept: '.pdf,.png,.jpg,.jpeg' },
  { type: 'letra',     label: 'Letra',     accept: '.pdf,.txt,.doc,.docx,.png,.jpg,.jpeg' },
  { type: 'cifra',     label: 'Cifra',     accept: '.pdf,.txt,.doc,.docx,.png,.jpg,.jpeg' },
]
