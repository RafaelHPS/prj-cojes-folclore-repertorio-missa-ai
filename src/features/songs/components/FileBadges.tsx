import type { Song } from '../types'

interface Props {
  song: Song
  onView: (label: string, url: string) => void
}

const FILE_FIELDS = [
  { key: 'partitura_url', label: 'Partitura' },
  { key: 'letra_url',     label: 'Letra' },
  { key: 'cifra_url',     label: 'Cifra' },
] as const

export function FileBadges({ song, onView }: Props) {
  const existing = FILE_FIELDS.filter((f) => !!song[f.key])

  if (existing.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {existing.map((f) => (
        <button
          key={f.key}
          onClick={(e) => { e.stopPropagation(); onView(f.label, song[f.key]!) }}
          aria-label={`Visualizar ${f.label}`}
          className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
        >
          📄 {f.label}
        </button>
      ))}
    </div>
  )
}
