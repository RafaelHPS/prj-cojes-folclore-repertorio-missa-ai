import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

import { formatDateShort, formatTime } from '@/utils/date.util'
import { FileViewerModal } from '@/features/songs/components/FileViewerModal'

import { fetchPublicMass, fetchMassSongs } from '../masses.service'
import type { Mass } from '../types'
import type { MassSongWithSong } from '../masses.service'
import type { MassPart } from '@/types/database'

// ── Constantes litúrgicas ─────────────────────────────────────

const PART_ORDER: MassPart[] = [
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
]

const PART_LABEL: Record<MassPart, string> = {
  entrada: 'Entrada',
  ato_penitencial: 'Ato Penitencial',
  hino_de_louvor: 'Glória',
  salmo: 'Salmo Responsorial',
  sequencia: 'Sequência',
  aclamacao: 'Aclamação ao Evangelho',
  ofertorio: 'Ofertório',
  santo: 'Santo',
  cordeiro: 'Cordeiro de Deus',
  comunhao: 'Comunhão',
  pos_comunhao: 'Pós-Comunhão',
  final: 'Final',
}

const LITURGICAL_YEAR_LABEL: Record<string, string> = {
  A: 'Ano A',
  B: 'Ano B',
  C: 'Ano C',
}

// ── Viewer ────────────────────────────────────────────────────

interface ViewerState {
  title: string
  url: string
}

// ── Componente de música ──────────────────────────────────────

interface SongCardProps {
  item: MassSongWithSong
  index: number
  onView: (title: string, url: string) => void
}

function SongCard({ item, index, onView }: SongCardProps) {
  const { song } = item

  const files = [
    { label: 'Partitura', icon: 'description', url: song.partitura_url },
    { label: 'Letra', icon: 'article', url: song.letra_url },
    { label: 'Cifra', icon: 'piano', url: song.cifra_url },
    { label: 'Cantor', icon: 'mic', url: song.singer_file_url },
    { label: 'Instrumentos', icon: 'queue_music', url: song.instrumental_file_url },
  ].filter((f) => f.url)

  return (
    <div className="flex items-start gap-4 rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 tonal-shadow">
      {/* Número */}
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">
        {index + 1}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-headline text-lg font-bold leading-tight text-on-surface">
          {song.title}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {song.artist && <span className="text-sm text-outline">{song.artist}</span>}
          {song.key && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              {song.key}
            </span>
          )}
        </div>

        {files.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {files.map((f) => (
              <button
                key={f.label}
                onClick={() => onView(f.label, f.url!)}
                aria-label={`Abrir ${f.label} de ${song.title}`}
                className="flex items-center gap-1.5 rounded-full border border-outline-variant/40 bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  {f.icon}
                </span>
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente de parte litúrgica ─────────────────────────────

interface PartSectionProps {
  part: MassPart
  songs: MassSongWithSong[]
  onView: (title: string, url: string) => void
}

function PartSection({ part, songs, onView }: PartSectionProps) {
  return (
    <section aria-labelledby={`part-${part}`}>
      <div className="mb-4 flex items-center gap-3">
        <h2
          id={`part-${part}`}
          className="text-xs font-extrabold uppercase tracking-widest text-outline"
        >
          {PART_LABEL[part]}
        </h2>
        <div className="h-px flex-1 bg-outline-variant/30" />
      </div>
      <div className="space-y-3">
        {songs.map((item, i) => (
          <SongCard key={item.id} item={item} index={i} onView={onView} />
        ))}
      </div>
    </section>
  )
}

// ── Página principal ──────────────────────────────────────────

export default function MassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [mass, setMass] = useState<Mass | null>(null)
  const [songs, setSongs] = useState<MassSongWithSong[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [viewer, setViewer] = useState<ViewerState | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!id) return

    async function load() {
      setIsLoading(true)
      try {
        const [massData, songsData] = await Promise.all([fetchPublicMass(id!), fetchMassSongs(id!)])

        if (!massData) {
          setNotFound(true)
          return
        }
        setMass(massData)
        setSongs(songsData)
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [id])

  async function handleShare() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Agrupa músicas por parte, mantendo a ordem litúrgica
  const songsByPart = PART_ORDER.reduce<Partial<Record<MassPart, MassSongWithSong[]>>>(
    (acc, part) => {
      const items = songs.filter((s) => s.part === part)
      if (items.length > 0) acc[part] = items
      return acc
    },
    {},
  )

  const partsWithSongs = PART_ORDER.filter((p) => songsByPart[p]?.length)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (notFound || !mass) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/5">
          <span aria-hidden="true" className="material-symbols-outlined text-3xl text-outline">
            lock
          </span>
        </div>
        <h1 className="font-headline text-2xl font-bold text-on-surface">
          Celebração não encontrada
        </h1>
        <p className="mt-2 text-outline">
          Esta missa não existe ou não está disponível publicamente.
        </p>
        <Link
          to="/"
          className="mt-6 flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-on-primary transition hover:bg-secondary"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            home
          </span>
          Ir para o início
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Top bar */}
      <nav className="sticky top-0 z-40 border-b border-outline-variant/20 bg-surface-container-lowest/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <span className="font-headline text-sm font-bold text-primary">Repertório de Missas</span>
          <button
            onClick={handleShare}
            aria-label="Copiar link desta celebração"
            className="flex items-center gap-1.5 rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition hover:border-primary/30 hover:text-primary"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-sm">
              {copied ? 'check' : 'share'}
            </span>
            {copied ? 'Link copiado!' : 'Compartilhar'}
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Header da missa */}
        <header className="mb-10">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5 text-primary">
              <span aria-hidden="true" className="material-symbols-outlined">
                church
              </span>
            </div>
            {mass.is_public && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                Celebração pública
              </span>
            )}
          </div>

          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface sm:text-4xl">
            {mass.title}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-outline">
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                calendar_today
              </span>
              {formatDateShort(mass.date)}
              {mass.time && ` · ${formatTime(mass.time)}`}
            </span>
            {mass.liturgical_year && (
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  auto_stories
                </span>
                {LITURGICAL_YEAR_LABEL[mass.liturgical_year]}
              </span>
            )}
          </div>

          {mass.description && (
            <p className="mt-3 rounded-2xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
              {mass.description}
            </p>
          )}
        </header>

        {/* Conteúdo litúrgico */}
        {partsWithSongs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span
              aria-hidden="true"
              className="material-symbols-outlined mb-3 text-5xl text-outline"
            >
              music_off
            </span>
            <p className="font-semibold text-on-surface">Nenhuma música registrada</p>
            <p className="mt-1 text-sm text-outline">
              As músicas desta celebração ainda não foram adicionadas.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {partsWithSongs.map((part) => (
              <PartSection
                key={part}
                part={part}
                songs={songsByPart[part]!}
                onView={(title, url) => setViewer({ title, url })}
              />
            ))}
          </div>
        )}

        {/* Rodapé */}
        <footer className="mt-16 border-t border-outline-variant/20 pt-6 text-center">
          <p className="text-xs text-outline">
            Gerado por <span className="font-semibold text-primary">Repertório de Missas</span>
          </p>
        </footer>
      </div>

      {viewer && (
        <FileViewerModal title={viewer.title} url={viewer.url} onClose={() => setViewer(null)} />
      )}
    </div>
  )
}
