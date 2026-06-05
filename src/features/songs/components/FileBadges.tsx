import type { Song } from '../types'

interface Props {
  song: Song
  onView: (label: string, url: string) => void
}

/** Adiciona ?t=<timestamp> para invalidar cache do CDN quando o arquivo é atualizado. */
function bustCache(url: string, updatedAt: string): string {
  const t = new Date(updatedAt).getTime()
  return `${url}?t=${t}`
}

const FILE_FIELDS = [
  { key: 'partitura_url', label: 'Partitura', icon: 'description' },
  { key: 'letra_url', label: 'Letra', icon: 'article' },
  { key: 'cifra_url', label: 'Cifra', icon: 'piano' },
] as const

export function FileBadges({ song, onView }: Props) {
  const existing = FILE_FIELDS.filter((f) => !!song[f.key])
  const hasAudio = !!song.audio_url
  if (existing.length === 0 && !hasAudio) return null

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {existing.map((f) => (
        <button
          key={f.key}
          onClick={(e) => {
            e.stopPropagation()
            onView(f.label, bustCache(song[f.key]!, song.updated_at))
          }}
          aria-label={`Visualizar ${f.label}`}
          className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary transition hover:bg-primary/20"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-xs">
            {f.icon}
          </span>
          {f.label}
        </button>
      ))}
      {hasAudio && (
        <a
          href={song.audio_url!}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Ouvir áudio de ${song.title}`}
          className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary transition hover:bg-primary/20"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-xs">
            headphones
          </span>
          Áudio
        </a>
      )}
    </div>
  )
}
