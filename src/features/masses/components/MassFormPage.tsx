import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { useActiveTeam } from '@/hooks/useActiveTeam'
import { fetchMassById, createMass, updateMass } from '../masses.service'
import { massSchema } from '../masses.schemas'
import type { MassFormData } from '../masses.schemas'
import type { Mass } from '../types'

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

          {/* Ano litúrgico */}
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
    </div>
  )
}
