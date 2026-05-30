import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

import { useActiveTeam } from '@/hooks/useActiveTeam'
import { formatDateShort, formatTime, formatDateTime } from '@/utils/date.util'
import { fetchSongs } from '@/features/songs/songs.service'
import type { Song } from '@/features/songs/types'
import type { MassPart } from '@/types/database'

import {
  fetchPublicMass,
  fetchMassSongs,
  addSongToMass,
  removeMassSong,
  swapMassSongPositions,
} from '../masses.service'
import type { MassSongWithSong } from '../masses.service'
import type { Mass } from '../types'
import { SongPickerModal } from './SongPickerModal'

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

// ── Linha de música ───────────────────────────────────────────

interface SongRowProps {
  item: MassSongWithSong
  index: number
  total: number
  isFirst: boolean
  isLast: boolean
  canEdit: boolean
  canDelete: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}

function SongRow({
  item,
  index,
  isFirst,
  isLast,
  canEdit,
  canDelete,
  onMoveUp,
  onMoveDown,
  onRemove,
}: SongRowProps) {
  const { song } = item

  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 tonal-shadow">
      {/* Número */}
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
        {index + 1}
      </span>

      {/* Info da música */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-on-surface truncate">{song.title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          {song.artist && <span className="text-xs text-outline truncate">{song.artist}</span>}
          {song.key && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              {song.key}
            </span>
          )}
        </div>
      </div>

      {/* Ações */}
      {(canEdit || canDelete) && (
        <div className="flex flex-shrink-0 items-center gap-1">
          {canEdit && (
            <>
              <button
                onClick={onMoveUp}
                disabled={isFirst}
                aria-label="Mover para cima"
                className="rounded-lg p-1.5 text-outline transition hover:bg-surface-container-low hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  expand_less
                </span>
              </button>
              <button
                onClick={onMoveDown}
                disabled={isLast}
                aria-label="Mover para baixo"
                className="rounded-lg p-1.5 text-outline transition hover:bg-surface-container-low hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  expand_more
                </span>
              </button>
            </>
          )}
          {canDelete && (
            <button
              onClick={onRemove}
              aria-label={`Remover ${song.title}`}
              className="rounded-lg p-1.5 text-outline transition hover:bg-error/5 hover:text-error"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                delete
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Seção de parte litúrgica ──────────────────────────────────

interface PartSectionProps {
  part: MassPart
  songs: MassSongWithSong[]
  canEdit: boolean
  canDelete: boolean
  onAdd: () => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onRemove: (id: string) => void
}

function PartSection({
  part,
  songs,
  canEdit,
  canDelete,
  onAdd,
  onMoveUp,
  onMoveDown,
  onRemove,
}: PartSectionProps) {
  return (
    <section
      aria-labelledby={`part-${part}`}
      className="rounded-3xl border border-outline-variant/20 bg-surface-container-low overflow-hidden"
    >
      {/* Header da parte */}
      <div className="flex items-center justify-between px-5 py-3 bg-surface-container">
        <h2
          id={`part-${part}`}
          className="text-xs font-extrabold uppercase tracking-widest text-outline"
        >
          {PART_LABEL[part]}
          {songs.length > 0 && (
            <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-primary normal-case tracking-normal">
              {songs.length}
            </span>
          )}
        </h2>
        {canEdit && (
          <button
            onClick={onAdd}
            aria-label={`Adicionar música em ${PART_LABEL[part]}`}
            className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary transition hover:bg-primary hover:text-on-primary"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-sm">
              add
            </span>
            Adicionar
          </button>
        )}
      </div>

      {/* Músicas */}
      <div className="p-3 space-y-2">
        {songs.length === 0
          ? canEdit && (
              <button
                onClick={onAdd}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-outline-variant/40 py-4 text-sm text-outline transition hover:border-primary/30 hover:text-primary"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  add_circle
                </span>
                Adicionar música
              </button>
            )
          : songs.map((item, i) => (
              <SongRow
                key={item.id}
                item={item}
                index={i}
                total={songs.length}
                isFirst={i === 0}
                isLast={i === songs.length - 1}
                canEdit={canEdit}
                canDelete={canDelete}
                onMoveUp={() => onMoveUp(i)}
                onMoveDown={() => onMoveDown(i)}
                onRemove={() => onRemove(item.id)}
              />
            ))}
      </div>
    </section>
  )
}

// ── Página principal ──────────────────────────────────────────

export default function MassRepertoirePage() {
  const { id } = useParams<{ id: string }>()
  const team = useActiveTeam()
  const canEdit = team?.role !== 'viewer'
  const canDelete = team?.role === 'admin' || team?.role === 'editor'

  const [mass, setMass] = useState<Mass | null>(null)
  const [songsByPart, setSongsByPart] = useState<Partial<Record<MassPart, MassSongWithSong[]>>>({})
  const [teamSongs, setTeamSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [picker, setPicker] = useState<MassPart | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  // Carrega dados
  useEffect(() => {
    if (!id || !team) return
    const teamId = team.id

    async function load() {
      setIsLoading(true)
      try {
        const [massData, massSongs, songs] = await Promise.all([
          fetchPublicMass(id!),
          fetchMassSongs(id!),
          fetchSongs(teamId),
        ])
        setMass(massData)
        setTeamSongs(songs)
        setSongsByPart(groupByPart(massSongs))
      } finally {
        setIsLoading(false)
      }
    }

    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, team?.id])

  function touchMassTimestamp() {
    setMass((prev) => (prev ? { ...prev, updated_at: new Date().toISOString() } : prev))
  }

  function groupByPart(items: MassSongWithSong[]): Partial<Record<MassPart, MassSongWithSong[]>> {
    return PART_ORDER.reduce<Partial<Record<MassPart, MassSongWithSong[]>>>((acc, part) => {
      const partSongs = items.filter((s) => s.part === part).sort((a, b) => a.position - b.position)
      acc[part] = partSongs
      return acc
    }, {})
  }

  async function handleAddSong(song: Song) {
    if (!id || !picker) return
    const currentSongs = songsByPart[picker] ?? []
    const position = currentSongs.length

    setIsAdding(true)
    try {
      const added = await addSongToMass(id, song.id, picker, position)
      setSongsByPart((prev) => ({
        ...prev,
        [picker]: [...(prev[picker] ?? []), added],
      }))
      touchMassTimestamp()
      setPicker(null)
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemove(part: MassPart, massSongId: string) {
    await removeMassSong(massSongId)
    setSongsByPart((prev) => ({
      ...prev,
      [part]: (prev[part] ?? []).filter((s) => s.id !== massSongId),
    }))
    touchMassTimestamp()
  }

  async function handleMoveUp(part: MassPart, index: number) {
    if (index === 0) return
    const list = [...(songsByPart[part] ?? [])]
    const a = list[index]!
    const b = list[index - 1]!
    await swapMassSongPositions(a.id, a.position, b.id, b.position)
    ;[list[index - 1], list[index]] = [
      { ...a, position: b.position },
      { ...b, position: a.position },
    ]
    setSongsByPart((prev) => ({ ...prev, [part]: list }))
    touchMassTimestamp()
  }

  async function handleMoveDown(part: MassPart, index: number) {
    const list = [...(songsByPart[part] ?? [])]
    if (index >= list.length - 1) return
    const a = list[index]!
    const b = list[index + 1]!
    await swapMassSongPositions(a.id, a.position, b.id, b.position)
    ;[list[index], list[index + 1]] = [
      { ...b, position: a.position },
      { ...a, position: b.position },
    ]
    setSongsByPart((prev) => ({ ...prev, [part]: list }))
    touchMassTimestamp()
  }

  const totalSongs = PART_ORDER.reduce((sum, p) => sum + (songsByPart[p]?.length ?? 0), 0)

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!mass) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center">
        <span aria-hidden="true" className="material-symbols-outlined mb-3 text-4xl text-outline">
          error
        </span>
        <p className="font-semibold text-on-surface">Missa não encontrada.</p>
        <Link to="/missas" className="mt-3 text-sm text-primary hover:underline">
          ← Voltar para Missas
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <header className="mb-8">
        <nav className="mb-3 flex items-center gap-1.5 text-sm font-medium text-outline">
          <Link to="/missas" className="transition hover:text-primary">
            Missas
          </Link>
          <span aria-hidden="true" className="material-symbols-outlined text-xs">
            chevron_right
          </span>
          <span className="font-semibold text-primary truncate max-w-xs">{mass.title}</span>
        </nav>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface lg:text-4xl">
              {mass.title}
            </h1>
            <p className="mt-1 text-sm text-outline">
              {formatDateShort(mass.date)}
              {mass.time && ` · ${formatTime(mass.time)}`}
              {' · '}
              {totalSongs} música{totalSongs !== 1 ? 's' : ''} no repertório
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-outline">
              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                update
              </span>
              Repertório atualizado em {formatDateTime(mass.updated_at)}
            </p>
          </div>

          <div className="flex gap-2">
            {/* Visualização da celebração — sempre disponível para membros */}
            <Link
              to={`/missas/${mass.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:border-primary/30 hover:text-primary"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                slideshow
              </span>
              Visualizar celebração
            </Link>

            {/* Indicador de visibilidade */}
            {mass.is_public ? (
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  public
                </span>
                Pública
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-surface-container px-4 py-2 text-sm font-semibold text-outline">
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  lock
                </span>
                Privada
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Partes litúrgicas */}
      <div className="space-y-4">
        {PART_ORDER.map((part) => (
          <PartSection
            key={part}
            part={part}
            songs={songsByPart[part] ?? []}
            canEdit={canEdit}
            canDelete={canDelete}
            onAdd={() => setPicker(part)}
            onMoveUp={(i) => void handleMoveUp(part, i)}
            onMoveDown={(i) => void handleMoveDown(part, i)}
            onRemove={(songId) => void handleRemove(part, songId)}
          />
        ))}
      </div>

      {/* Modal de seleção de música */}
      {picker && (
        <SongPickerModal
          part={picker}
          songs={teamSongs}
          isAdding={isAdding}
          onSelect={(song) => void handleAddSong(song)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}
