import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { useActiveTeam } from '@/hooks/useActiveTeam'
import { formatDateShort, formatTime, formatDateTime } from '@/utils/date.util'
import { supabase } from '@/lib/supabase'
import { fetchSongs } from '@/features/songs/songs.service'
import { ORIGIN_LABEL } from '@/features/songs/songs.schemas'
import { FileViewerModal } from '@/features/songs/components/FileViewerModal'
import type { Song } from '@/features/songs/types'
import type { MassPart } from '@/types/database'

// ── Metadados de arquivos ─────────────────────────────────────

const FILE_META = [
  { key: 'partitura_url', label: 'Partitura', icon: 'description' },
  { key: 'letra_url', label: 'Letra', icon: 'article' },
  { key: 'cifra_url', label: 'Cifra', icon: 'piano' },
  { key: 'singer_file_url', label: 'Cantor', icon: 'mic' },
  { key: 'instrumental_file_url', label: 'Instrumentos', icon: 'queue_music' },
] as const

type FileKey = (typeof FILE_META)[number]['key']

interface ViewerState {
  title: string
  url: string
}

import {
  fetchPublicMass,
  fetchMassSongs,
  fetchMassParticipants,
  removeMassSong,
  reorderPartSongs,
} from '../masses.service'
import type { MassSongWithSong } from '../masses.service'
import type { Mass, MassParticipant } from '../types'
import { MassPdfMergeButton } from './MassPdfMergeButton'

// ── Constantes litúrgicas ─────────────────────────────────────

const PART_ORDER: MassPart[] = [
  'entrada',
  'ato_penitencial',
  'hino_de_louvor',
  'refrao_orante',
  'salmo',
  'sequencia',
  'aclamacao',
  'ofertorio',
  'santo',
  'oracao_eucaristica',
  'doxologia',
  'cordeiro',
  'comunhao',
  'pos_comunhao',
  'final',
]

const PART_LABEL: Record<MassPart, string> = {
  entrada: 'Entrada',
  ato_penitencial: 'Ato Penitencial',
  hino_de_louvor: 'Glória',
  refrao_orante: 'Refrão Orante',
  salmo: 'Salmo Responsorial',
  sequencia: 'Sequência',
  aclamacao: 'Aclamação ao Evangelho',
  ofertorio: 'Ofertório',
  santo: 'Santo',
  oracao_eucaristica: 'Oração Eucarística',
  doxologia: 'Doxologia Amém',
  cordeiro: 'Cordeiro de Deus',
  comunhao: 'Comunhão',
  pos_comunhao: 'Pós-Comunhão',
  final: 'Final',
}

// ── Linha de música (sortable + swipe-to-delete) ─────────────

interface SongRowProps {
  item: MassSongWithSong
  index: number
  canEdit: boolean
  canDelete: boolean // já pré-computado por item
  showAddedBy: boolean
  onRemove: () => void
  onView: (title: string, url: string) => void
}

function SortableSongRow({
  item,
  index,
  canEdit,
  canDelete,
  showAddedBy,
  onRemove,
  onView,
}: SongRowProps) {
  const { song } = item
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !canEdit,
  })

  const [swipeX, setSwipeX] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const touchStartX = useRef(0)
  const SWIPE_THRESHOLD = 80

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? 0
  }

  function onTouchMove(e: React.TouchEvent) {
    if (isDragging) return
    const delta = (e.touches[0]?.clientX ?? touchStartX.current) - touchStartX.current
    if (delta < 0) setSwipeX(Math.max(delta, -120))
  }

  function onTouchEnd() {
    if (swipeX < -SWIPE_THRESHOLD) {
      setConfirming(true)
    }
    setSwipeX(0)
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative overflow-hidden rounded-2xl">
      {/* Fundo vermelho revelado no swipe */}
      {canDelete && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end rounded-2xl bg-error/10 px-4"
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-error">delete</span>
        </div>
      )}

      {/* Conteúdo do card */}
      <div
        className="relative flex items-start gap-2 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-3 tonal-shadow"
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 ? 'transform 0.2s' : 'none',
        }}
        onTouchStart={canDelete ? onTouchStart : undefined}
        onTouchMove={canDelete ? onTouchMove : undefined}
        onTouchEnd={canDelete ? onTouchEnd : undefined}
      >
        {/* Número */}
        <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
          {index + 1}
        </span>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-on-surface">{song.title}</p>
          {(song.artist || song.key) && (
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {song.artist && <span className="text-xs text-outline">{song.artist}</span>}
              {song.key && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {song.key}
                </span>
              )}
            </div>
          )}
          {song.origin && song.origin !== 'outros' && (
            <p className="mt-0.5 text-xs text-secondary">
              {ORIGIN_LABEL[song.origin as keyof typeof ORIGIN_LABEL]}
              {song.book_number && ` · nº ${song.book_number}`}
            </p>
          )}
          {showAddedBy && item.added_by_name && (
            <p className="mt-1 flex items-center gap-1 text-xs text-outline/70">
              <span aria-hidden="true" className="material-symbols-outlined text-xs leading-none">
                person
              </span>
              {item.added_by_name}
            </p>
          )}

          {/* Botões de arquivo */}
          {(() => {
            const files = FILE_META.filter((f) => !!song[f.key as FileKey])
            const hasAudio = !!song.audio_url
            if (files.length === 0 && !hasAudio) return null
            return (
              <div className="mt-2 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                {files.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => onView(`${f.label} · ${song.title}`, song[f.key as FileKey]!)}
                    aria-label={`Abrir ${f.label} de ${song.title}`}
                    className="flex items-center gap-1 rounded-full border border-outline-variant/40 bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-on-surface-variant transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  >
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-sm leading-none"
                    >
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
                    aria-label={`Ouvir áudio de ${song.title}`}
                    className="flex items-center gap-1 rounded-full border border-outline-variant/40 bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-on-surface-variant transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                  >
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-sm leading-none"
                    >
                      headphones
                    </span>
                    Áudio
                  </a>
                )}
              </div>
            )
          })()}
        </div>

        {/* Botão remover — visível no hover em desktop, oculto em mobile (usa swipe) */}
        {canDelete && (
          <button
            onClick={() => setConfirming(true)}
            aria-label={`Remover ${song.title}`}
            className="hidden flex-shrink-0 rounded-lg p-1.5 text-outline transition hover:bg-error/5 hover:text-error md:flex"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              delete
            </span>
          </button>
        )}

        {/* Alça de arrastar (desktop + touch) */}
        {canEdit && (
          <button
            {...attributes}
            {...listeners}
            aria-label="Arrastar para reordenar"
            className="flex-shrink-0 cursor-grab touch-none rounded-lg p-1.5 text-outline active:cursor-grabbing"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              drag_indicator
            </span>
          </button>
        )}
      </div>

      {/* Confirmação de exclusão */}
      {confirming && canDelete && (
        <div className="absolute inset-0 flex items-center justify-between rounded-2xl border border-error/30 bg-surface-container-lowest px-4">
          <p className="text-sm font-semibold text-error">Remover música?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-on-surface-variant"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                setConfirming(false)
                onRemove()
              }}
              className="rounded-full bg-error px-3 py-1.5 text-xs font-bold text-white"
            >
              Remover
            </button>
          </div>
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
  canDeleteItem: (item: MassSongWithSong) => boolean
  showAddedBy: boolean
  onAdd: () => void
  onReorder: (newSongs: MassSongWithSong[]) => void
  onRemove: (id: string) => void
  onView: (title: string, url: string) => void
}

function PartSection({
  part,
  songs,
  canEdit,
  canDeleteItem,
  showAddedBy,
  onAdd,
  onReorder,
  onRemove,
  onView,
}: PartSectionProps) {
  const anyDeletable = songs.some(canDeleteItem)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = songs.findIndex((s) => s.id === active.id)
    const newIndex = songs.findIndex((s) => s.id === over.id)
    onReorder(arrayMove(songs, oldIndex, newIndex))
  }

  return (
    <section
      aria-labelledby={`part-${part}`}
      className="overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-low"
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-surface-container px-5 py-3">
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

      {/* Dica de gestos */}
      {songs.length > 0 && (canEdit || anyDeletable) && (
        <p className="px-5 pt-2 text-xs text-outline">
          {canEdit && anyDeletable && 'Segure ⠿ para reordenar · deslize ← para remover'}
          {canEdit && !anyDeletable && 'Segure ⠿ para reordenar'}
          {!canEdit && anyDeletable && 'Deslize ← para remover'}
        </p>
      )}

      {/* Lista */}
      <div className="space-y-2 p-3">
        {songs.length === 0 ? (
          canEdit && (
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
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={songs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {songs.map((item, i) => (
                <SortableSongRow
                  key={item.id}
                  item={item}
                  index={i}
                  canEdit={canEdit}
                  canDelete={canDeleteItem(item)}
                  showAddedBy={showAddedBy}
                  onRemove={() => onRemove(item.id)}
                  onView={onView}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </section>
  )
}

// ── Página principal ──────────────────────────────────────────

export default function MassRepertoirePage() {
  const { id } = useParams<{ id: string }>()
  const team = useActiveTeam()
  const navigate = useNavigate()
  const canEdit = team?.role !== 'viewer'
  const isAdminOrEditor = team?.role === 'admin' || team?.role === 'editor'
  const isContributor = team?.role === 'contributor'
  const showAddedBy = isAdminOrEditor

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [mass, setMass] = useState<Mass | null>(null)
  const [songsByPart, setSongsByPart] = useState<Partial<Record<MassPart, MassSongWithSong[]>>>({})
  const [teamSongs, setTeamSongs] = useState<Song[]>([])
  const [participants, setParticipants] = useState<MassParticipant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewer, setViewer] = useState<ViewerState | null>(null)

  const handleView = useCallback((title: string, url: string) => {
    setViewer({ title, url })
  }, [])

  // Busca o userId uma única vez
  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        setCurrentUserId(user?.id ?? null)
      })
      .catch(() => {})
  }, [])

  // Carrega dados
  useEffect(() => {
    if (!id || !team) return
    const teamId = team.id

    async function load() {
      setIsLoading(true)
      try {
        const [massData, massSongs, songs, participantsData] = await Promise.all([
          fetchPublicMass(id!),
          fetchMassSongs(id!),
          fetchSongs(teamId),
          fetchMassParticipants(id!).catch(() => [] as MassParticipant[]),
        ])
        setMass(massData)
        setTeamSongs(songs)
        setSongsByPart(groupByPart(massSongs))
        setParticipants(participantsData)
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

  function handleOpenPicker(part: MassPart) {
    navigate(`/missas/${id}/gerenciar/adicionar/${part}`, {
      state: {
        songs: teamSongs,
        currentCount: songsByPart[part]?.length ?? 0,
        existingIds: (songsByPart[part] ?? []).map((s) => s.song_id),
      },
    })
  }

  async function handleRemove(part: MassPart, massSongId: string) {
    await removeMassSong(massSongId)
    setSongsByPart((prev) => ({
      ...prev,
      [part]: (prev[part] ?? []).filter((s) => s.id !== massSongId),
    }))
    touchMassTimestamp()
  }

  async function handleReorder(part: MassPart, newSongs: MassSongWithSong[]) {
    const updated = newSongs.map((s, i) => ({ ...s, position: i }))
    setSongsByPart((prev) => ({ ...prev, [part]: updated }))
    touchMassTimestamp()
    await reorderPartSongs(updated.map((s) => ({ id: s.id, position: s.position })))
  }

  const totalSongs = PART_ORDER.reduce((sum, p) => sum + (songsByPart[p]?.length ?? 0), 0)

  // Lista ordenada de músicas para merge de PDFs (ordem litúrgica)
  const mergeSongs = PART_ORDER.flatMap((part) =>
    (songsByPart[part] ?? []).map((item) => ({
      title: item.song.title,
      partLabel: PART_LABEL[part],
      book_number: item.song.book_number ?? null,
      origin: item.song.origin ?? null,
      partitura_url: item.song.partitura_url,
      letra_url: item.song.letra_url,
      cifra_url: item.song.cifra_url,
    })),
  )

  function canDeleteItem(item: MassSongWithSong): boolean {
    if (isAdminOrEditor) return true
    if (isContributor && currentUserId && item.added_by === currentUserId) return true
    return false
  }

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

          <div className="flex flex-wrap gap-2">
            {/* Merge de PDFs */}
            <MassPdfMergeButton songs={mergeSongs} />

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
            canDeleteItem={canDeleteItem}
            showAddedBy={showAddedBy}
            onAdd={() => handleOpenPicker(part)}
            onReorder={(newSongs) => void handleReorder(part, newSongs)}
            onRemove={(songId) => void handleRemove(part, songId)}
            onView={handleView}
          />
        ))}
      </div>

      {/* Visualizador de arquivos */}
      {viewer && (
        <FileViewerModal title={viewer.title} url={viewer.url} onClose={() => setViewer(null)} />
      )}

      {/* Participantes */}
      {participants.length > 0 && (
        <div className="mt-6 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-outline">
            Participantes
          </p>
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container-lowest px-3 py-1.5"
              >
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-on-surface">{p.name}</span>
                {p.type === 'guest' && <span className="text-xs text-outline">· Visitante</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
