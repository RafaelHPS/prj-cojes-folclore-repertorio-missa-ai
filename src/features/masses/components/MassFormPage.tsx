import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { useActiveTeam } from '@/hooks/useActiveTeam'
import {
  fetchMassById,
  createMass,
  updateMass,
  fetchMassParticipants,
  addMassParticipant,
  removeMassParticipant,
} from '../masses.service'
import { massSchema, LITURGICAL_SEASONS, LITURGICAL_SEASON_LABEL } from '../masses.schemas'
import type { MassFormData } from '../masses.schemas'
import type { Mass, MassParticipant } from '../types'
import { fetchTeamMembers } from '@/features/teams/settings.service'
import type { TeamMember } from '@/features/teams/settings.service'

const LITURGICAL_YEARS = [
  { value: 'A', label: 'Ano A' },
  { value: 'B', label: 'Ano B' },
  { value: 'C', label: 'Ano C' },
] as const

function defaultForm(): MassFormData {
  return {
    title: '',
    date: '',
    time: '',
    liturgical_year: undefined,
    liturgical_season: undefined,
    description: '',
    is_public: false,
  }
}

function massToForm(mass: Mass): MassFormData {
  return {
    title: mass.title,
    date: mass.date,
    time: mass.time ?? '',
    liturgical_year: mass.liturgical_year ?? undefined,
    liturgical_season: mass.liturgical_season ?? undefined,
    description: mass.description ?? '',
    is_public: mass.is_public,
  }
}

export default function MassFormPage() {
  const { id } = useParams<{ id: string }>()
  const { state } = useLocation() as { state: { mass?: Mass } | null }
  const navigate = useNavigate()
  const team = useActiveTeam()

  const isEdit = !!id
  const [isLoadingMass, setIsLoadingMass] = useState(isEdit && !state?.mass)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [massTitle, setMassTitle] = useState(state?.mass?.title ?? '')

  // ── Participantes ──────────────────────────────────────────
  const [participants, setParticipants] = useState<MassParticipant[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [addingType, setAddingType] = useState<'member' | 'guest' | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [guestName, setGuestName] = useState('')
  const [isSavingParticipant, setIsSavingParticipant] = useState(false)
  const [participantError, setParticipantError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MassFormData>({
    resolver: zodResolver(massSchema),
    defaultValues: state?.mass ? massToForm(state.mass) : defaultForm(),
  })

  const isPublic = watch('is_public')

  useEffect(() => {
    if (!isEdit || state?.mass) return

    async function load() {
      setIsLoadingMass(true)
      try {
        const fetched = await fetchMassById(id!)
        if (!fetched) {
          setLoadError('Celebração não encontrada.')
          return
        }
        setMassTitle(fetched.title)
        reset(massToForm(fetched))
      } catch {
        setLoadError('Erro ao carregar a celebração.')
      } finally {
        setIsLoadingMass(false)
      }
    }

    void load()
  }, [id, isEdit, state?.mass, reset])

  useEffect(() => {
    if (!isEdit || !id || !team) return
    void fetchMassParticipants(id)
      .then(setParticipants)
      .catch(() => {})
    void fetchTeamMembers(team.id)
      .then(setTeamMembers)
      .catch(() => {})
  }, [id, isEdit, team?.id])

  const addedMemberIds = new Set(participants.filter((p) => p.user_id).map((p) => p.user_id!))
  const availableMembers = teamMembers.filter((m) => !addedMemberIds.has(m.user_id))

  async function handleAddMember() {
    if (!id || !selectedMemberId) return
    const member = teamMembers.find((m) => m.user_id === selectedMemberId)
    if (!member) return
    setParticipantError(null)
    setIsSavingParticipant(true)
    try {
      const added = await addMassParticipant(id, {
        user_id: member.user_id,
        name: member.full_name ?? member.user_id,
        type: 'member',
      })
      setParticipants((prev) => [...prev, added])
      setSelectedMemberId('')
      setAddingType(null)
    } catch {
      setParticipantError('Erro ao adicionar membro.')
    } finally {
      setIsSavingParticipant(false)
    }
  }

  async function handleAddGuest() {
    if (!id || !guestName.trim()) return
    setParticipantError(null)
    setIsSavingParticipant(true)
    try {
      const added = await addMassParticipant(id, {
        user_id: null,
        name: guestName.trim(),
        type: 'guest',
      })
      setParticipants((prev) => [...prev, added])
      setGuestName('')
      setAddingType(null)
    } catch {
      setParticipantError('Erro ao adicionar visitante.')
    } finally {
      setIsSavingParticipant(false)
    }
  }

  async function handleRemoveParticipant(participantId: string) {
    await removeMassParticipant(participantId)
    setParticipants((prev) => prev.filter((p) => p.id !== participantId))
  }

  async function onSubmit(form: MassFormData) {
    if (!team) return
    setSaveError(null)
    try {
      if (isEdit && id) {
        await updateMass(id, form)
      } else {
        await createMass(team.id, form)
      }
      navigate('/missas')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar.')
    }
  }

  if (isLoadingMass) {
    return (
      <div className="flex justify-center py-20" role="status" aria-label="Carregando">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span aria-hidden="true" className="material-symbols-outlined mb-4 text-5xl text-error">
          error
        </span>
        <p className="font-headline text-lg font-bold text-on-surface">{loadError}</p>
        <Link to="/missas" className="mt-4 text-sm font-semibold text-primary hover:underline">
          Voltar às missas
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm font-medium text-outline">
        <Link to="/missas" className="transition-colors hover:text-primary">
          Missas
        </Link>
        <span aria-hidden="true" className="material-symbols-outlined text-xs">
          chevron_right
        </span>
        <span className="font-semibold text-primary">
          {isEdit ? 'Editar celebração' : 'Nova celebração'}
        </span>
      </nav>

      <h1 className="font-headline mb-8 text-3xl font-extrabold tracking-tight text-on-surface">
        {isEdit ? massTitle || 'Editar celebração' : 'Nova celebração'}
      </h1>

      <div className="rounded-3xl bg-surface-container-lowest p-6 tonal-shadow">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Título */}
          <div>
            <label
              htmlFor="mass-title"
              className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
            >
              Título *
            </label>
            <input
              id="mass-title"
              type="text"
              autoFocus
              placeholder="Ex: 32º Domingo do Tempo Comum"
              aria-describedby={errors.title ? 'mass-title-error' : undefined}
              aria-invalid={!!errors.title}
              className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-outline transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              {...register('title')}
            />
            {errors.title && (
              <p id="mass-title-error" role="alert" className="mt-1 text-xs text-error">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Data + Horário */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="mass-date"
                className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
              >
                Data *
              </label>
              <input
                id="mass-date"
                type="date"
                aria-describedby={errors.date ? 'mass-date-error' : undefined}
                aria-invalid={!!errors.date}
                className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register('date')}
              />
              {errors.date && (
                <p id="mass-date-error" role="alert" className="mt-1 text-xs text-error">
                  {errors.date.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="mass-time"
                className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
              >
                Horário
              </label>
              <input
                id="mass-time"
                type="time"
                className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register('time')}
              />
            </div>
          </div>

          {/* Ano + Tempo litúrgico */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="mass-year"
                className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
              >
                Ano litúrgico
              </label>
              <select
                id="mass-year"
                className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register('liturgical_year')}
              >
                <option value="">Selecionar ano</option>
                {LITURGICAL_YEARS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="mass-season"
                className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
              >
                Tempo litúrgico
              </label>
              <select
                id="mass-season"
                className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...register('liturgical_season')}
              >
                <option value="">Selecionar tempo</option>
                {LITURGICAL_SEASONS.map((season) => (
                  <option key={season} value={season}>
                    {LITURGICAL_SEASON_LABEL[season]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label
              htmlFor="mass-description"
              className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
            >
              Descrição
            </label>
            <textarea
              id="mass-description"
              rows={3}
              placeholder="Observações, tema, celebrante…"
              className="w-full resize-none rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-outline transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              {...register('description')}
            />
            {errors.description && (
              <p role="alert" className="mt-1 text-xs text-error">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Visibilidade pública */}
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            onClick={() => setValue('is_public', !isPublic)}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition ${
              isPublic
                ? 'border-primary/30 bg-primary/5'
                : 'border-outline-variant bg-surface-container-low'
            }`}
          >
            <div className="text-left">
              <p className="text-sm font-semibold text-on-surface">Acesso público</p>
              <p className="text-xs text-outline">
                {isPublic
                  ? 'Qualquer pessoa pode visualizar pelo link'
                  : 'Visível somente para membros da equipe'}
              </p>
            </div>
            <div
              className={`flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                isPublic ? 'bg-primary' : 'bg-outline-variant'
              }`}
            >
              <span
                className={`ml-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isPublic ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </button>

          {saveError && (
            <p role="alert" className="rounded-2xl bg-error/5 px-4 py-3 text-sm text-error">
              {saveError}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => navigate('/missas')}
              className="flex-1 rounded-full border border-outline-variant px-4 py-3 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-low"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-on-primary shadow-md shadow-primary/20 transition hover:bg-secondary disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  save
                </span>
              )}
              {isSubmitting ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>

      {/* Participantes — só no modo edição */}
      {isEdit && (
        <div className="mt-6 rounded-3xl bg-surface-container-lowest p-6 tonal-shadow">
          <p className="mb-1 text-sm font-bold text-on-surface">Participantes</p>
          <p className="mb-4 text-xs text-outline">
            Membros da equipe e visitantes presentes nesta celebração.
          </p>

          {/* Lista */}
          {participants.length > 0 && (
            <ul className="mb-4 divide-y divide-outline-variant/10">
              {participants.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-on-surface">
                    {p.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      p.type === 'member'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-secondary/10 text-secondary'
                    }`}
                  >
                    {p.type === 'member' ? 'Membro' : 'Visitante'}
                  </span>
                  <button
                    onClick={() => void handleRemoveParticipant(p.id)}
                    aria-label={`Remover ${p.name}`}
                    className="shrink-0 rounded-lg p-1 text-outline transition hover:bg-error/5 hover:text-error"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-base">
                      close
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Formulário inline de adição */}
          {addingType === 'member' && (
            <div className="mb-3 flex gap-2">
              <select
                autoFocus
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="flex-1 rounded-2xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Selecionar membro…</option>
                {availableMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.full_name ?? m.user_id}
                  </option>
                ))}
              </select>
              <button
                onClick={() => void handleAddMember()}
                disabled={!selectedMemberId || isSavingParticipant}
                className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary disabled:opacity-50"
              >
                {isSavingParticipant ? '…' : 'Adicionar'}
              </button>
              <button
                onClick={() => {
                  setAddingType(null)
                  setSelectedMemberId('')
                }}
                className="rounded-full border border-outline-variant px-3 py-2 text-xs text-on-surface-variant"
              >
                Cancelar
              </button>
            </div>
          )}

          {addingType === 'guest' && (
            <div className="mb-3 flex gap-2">
              <input
                autoFocus
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleAddGuest()}
                placeholder="Nome do visitante…"
                className="flex-1 rounded-2xl border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-none placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={() => void handleAddGuest()}
                disabled={!guestName.trim() || isSavingParticipant}
                className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary disabled:opacity-50"
              >
                {isSavingParticipant ? '…' : 'Adicionar'}
              </button>
              <button
                onClick={() => {
                  setAddingType(null)
                  setGuestName('')
                }}
                className="rounded-full border border-outline-variant px-3 py-2 text-xs text-on-surface-variant"
              >
                Cancelar
              </button>
            </div>
          )}

          {participantError && (
            <p role="alert" className="mb-3 text-xs text-error">
              {participantError}
            </p>
          )}

          {/* Botões de adição */}
          {addingType === null && (
            <div className="flex flex-wrap gap-2">
              {availableMembers.length > 0 && (
                <button
                  onClick={() => setAddingType('member')}
                  className="flex items-center gap-1.5 rounded-full border border-outline-variant px-4 py-2 text-xs font-semibold text-on-surface-variant transition hover:border-primary/30 hover:text-primary"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-sm">
                    person_add
                  </span>
                  Membro da equipe
                </button>
              )}
              <button
                onClick={() => setAddingType('guest')}
                className="flex items-center gap-1.5 rounded-full border border-outline-variant px-4 py-2 text-xs font-semibold text-on-surface-variant transition hover:border-primary/30 hover:text-primary"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  person_add
                </span>
                Visitante
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
