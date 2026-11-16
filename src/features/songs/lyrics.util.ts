import type { LyricsSection, LyricsSectionType } from './types'

const SECTION_TYPES: readonly LyricsSectionType[] = ['refrain', 'stanza', 'other']

/** Seção exibida, marcando quando é um refrão repetido (não impresso nesse ponto). */
export interface DisplayedSection extends LyricsSection {
  isRepeatedRefrain: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseSection(value: unknown): LyricsSection | null {
  if (!isRecord(value)) return null
  const { type, label, lines, repeat } = value
  if (!SECTION_TYPES.includes(type as LyricsSectionType)) return null
  if (!Array.isArray(lines)) return null
  const textLines = lines.filter((line): line is string => typeof line === 'string')
  if (textLines.length === 0) return null
  return {
    type: type as LyricsSectionType,
    label: typeof label === 'string' ? label : null,
    lines: textLines,
    repeat: typeof repeat === 'string' ? repeat : null,
  }
}

/**
 * Valida a coluna `songs.lyrics` (jsonb) vinda do banco.
 * Seções malformadas são descartadas em vez de quebrar a tela.
 */
export function parseLyrics(value: unknown): LyricsSection[] | null {
  if (!Array.isArray(value)) return null
  const sections = value.map(parseSection).filter((s): s is LyricsSection => s !== null)
  return sections.length > 0 ? sections : null
}

/**
 * Monta a ordem cantada: o livro imprime o refrão uma vez só, mas ele é cantado
 * depois de cada estrofe. Só se aplica quando há exatamente um refrão; com dois
 * ou mais (R1/R2, "refrão final") a ordem impressa já é a cantada.
 */
export function buildSungOrder(sections: LyricsSection[]): DisplayedSection[] {
  const printed = sections.map((s) => ({ ...s, isRepeatedRefrain: false }))
  const refrains = sections.filter((s) => s.type === 'refrain')
  const [refrain] = refrains
  if (refrains.length !== 1 || !refrain) return printed

  const sung: DisplayedSection[] = []
  printed.forEach((section, index) => {
    sung.push(section)
    const next = printed[index + 1]
    if (section.type === 'stanza' && next?.type !== 'refrain') {
      sung.push({ ...refrain, isRepeatedRefrain: true })
    }
  })
  return sung
}
