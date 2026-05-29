import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'

import { massSchema } from '../masses.schemas'
import type { MassFormData } from '../masses.schemas'
import type { Mass } from '../types'

const LITURGICAL_YEARS = [
  { value: 'A', label: 'Ano A' },
  { value: 'B', label: 'Ano B' },
  { value: 'C', label: 'Ano C' },
] as const

interface Props {
  defaultValues: MassFormData
  mass?: Mass
  onClose: () => void
  onSave: (form: MassFormData) => Promise<void>
}

export function MassModal({ defaultValues, mass, onClose, onSave }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MassFormData>({ resolver: zodResolver(massSchema), defaultValues })

  const [saveError, setSaveError] = useState<string | null>(null)
  const isPublic = watch('is_public')

  async function onSubmit(data: MassFormData) {
    setSaveError(null)
    try {
      await onSave(data)
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mass-dialog-title"
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-surface-container-lowest shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-4">
          <h2 id="mass-dialog-title" className="font-headline text-lg font-bold text-on-surface">
            {mass ? 'Editar celebração' : 'Nova celebração'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-xl p-2 text-outline transition hover:bg-surface-container-low hover:text-on-surface"
          >
            <span aria-hidden="true" className="material-symbols-outlined">
              close
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4 px-6 py-5">
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
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-outline-variant/10 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-low"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-on-primary shadow-md shadow-primary/20 transition hover:bg-secondary disabled:opacity-60"
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
