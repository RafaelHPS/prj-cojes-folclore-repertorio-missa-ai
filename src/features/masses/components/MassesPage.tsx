import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { useActiveTeam } from '@/hooks/useActiveTeam'
import { formatDateShort, formatTime } from '@/utils/date.util'

import { fetchMasses, createMass, updateMass, deleteMass } from '../masses.service'
import type { MassFilter, MassWithCount } from '../masses.service'
import type { Mass } from '../types'
import type { MassFormData } from '../masses.schemas'

import { MassModal } from './MassModal'
import { DeleteMassModal } from './DeleteMassModal'

const LITURGICAL_YEAR_LABEL = { A: 'Ano A', B: 'Ano B', C: 'Ano C' } as const

const FILTERS: { value: MassFilter; label: string }[] = [
  { value: 'upcoming', label: 'Próximas' },
  { value: 'past', label: 'Passadas' },
  { value: 'all', label: 'Todas' },
]

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `há ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `há ${days} dia${days !== 1 ? 's' : ''}`
}

interface ModalState {
  mode: 'create' | 'edit'
  mass?: Mass
}

export default function MassesPage() {
  const team = useActiveTeam()
  const [masses, setMasses] = useState<MassWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<MassFilter>('upcoming')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [toDelete, setToDelete] = useState<Mass | null>(null)

  useEffect(() => {
    if (!team) return
    const teamId = team.id

    async function load() {
      setIsLoading(true)
      try {
        setMasses(await fetchMasses(teamId, filter))
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [team?.id, filter])

  const filteredMasses = useMemo(() => {
    const q = search.toLowerCase()
    return masses.filter((m) => m.title.toLowerCase().includes(q))
  }, [masses, search])

  async function handleSave(form: MassFormData) {
    if (!team) return
    if (modal?.mode === 'edit' && modal.mass) {
      const updated = await updateMass(modal.mass.id, form)
      setMasses((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)))
    } else {
      const created = await createMass(team.id, form)
      setMasses((prev) => [{ ...created, song_count: 0 }, ...prev])
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    await deleteMass(toDelete.id)
    setMasses((prev) => prev.filter((m) => m.id !== toDelete.id))
  }

  const editDefault = modal?.mode === 'edit' && modal.mass ? massToForm(modal.mass) : defaultForm()

  return (
    <div>
      {/* Page header */}
      <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="mb-3 flex items-center gap-1.5 text-sm font-medium text-outline">
            <span>Home</span>
            <span aria-hidden="true" className="material-symbols-outlined text-xs">
              chevron_right
            </span>
            <span className="font-semibold text-primary">Missas</span>
          </nav>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface lg:text-5xl">
            Missas
          </h1>
          <p className="mt-2 text-outline">
            Gerencie e visualize todos os repertórios da sua paróquia.
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex w-fit items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition hover:bg-secondary"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            add
          </span>
          Nova Missa
        </button>
      </header>

      {/* Filter bar */}
      <section className="mb-8 rounded-3xl bg-surface-container-low p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Tabs */}
          <div className="flex rounded-2xl bg-surface-container p-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={`flex-1 rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors lg:flex-none ${
                  filter === f.value
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 lg:max-w-xs">
            <span
              aria-hidden="true"
              className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline"
            >
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar missa…"
              aria-label="Buscar missas"
              className="w-full rounded-2xl border-none bg-surface-container-lowest py-3 pl-12 pr-4 text-sm text-on-surface outline-none placeholder:text-outline focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </section>

      {/* Table */}
      {isLoading ? (
        <div
          className="flex justify-center py-20"
          role="status"
          aria-live="polite"
          aria-label="Carregando"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredMasses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span aria-hidden="true" className="material-symbols-outlined mb-4 text-5xl text-outline">
            event_busy
          </span>
          <p className="font-headline text-lg font-bold text-on-surface">
            {search ? 'Nenhuma missa encontrada' : 'Nenhuma missa registrada'}
          </p>
          <p className="mt-1 text-sm text-outline">
            {search ? 'Tente outro termo de busca.' : 'Clique em "Nova Missa" para começar.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-outline-variant/10 bg-surface-container-lowest tonal-shadow">
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-left">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-outline">
                    Nome da Missa
                  </th>
                  <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-outline">
                    Data & Horário
                  </th>
                  <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-outline">
                    Ano Litúrgico
                  </th>
                  <th className="px-6 py-5 text-center text-xs font-bold uppercase tracking-wider text-outline">
                    Músicas
                  </th>
                  <th className="px-6 py-5 text-xs font-bold uppercase tracking-wider text-outline">
                    Criado
                  </th>
                  <th className="px-8 py-5 text-right text-xs font-bold uppercase tracking-wider text-outline">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filteredMasses.map((mass) => (
                  <tr
                    key={mass.id}
                    className="group transition-colors hover:bg-surface-container-low/30"
                  >
                    {/* Nome */}
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                          <span aria-hidden="true" className="material-symbols-outlined">
                            church
                          </span>
                        </div>
                        <div>
                          <p className="font-headline font-bold text-on-surface">{mass.title}</p>
                          {mass.description && (
                            <p className="mt-0.5 max-w-xs truncate text-xs text-outline">
                              {mass.description}
                            </p>
                          )}
                        </div>
                        {mass.is_public && (
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                            Público
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Data */}
                    <td className="px-6 py-5">
                      <span className="font-bold text-on-surface">
                        {formatDateShort(mass.date)}
                      </span>
                      {mass.time && (
                        <span className="mt-0.5 block text-sm text-outline">
                          {formatTime(mass.time)}
                        </span>
                      )}
                    </td>

                    {/* Ano litúrgico */}
                    <td className="px-6 py-5">
                      {mass.liturgical_year ? (
                        <span className="inline-flex rounded-full bg-secondary/10 px-3 py-1 text-xs font-bold text-secondary">
                          {LITURGICAL_YEAR_LABEL[mass.liturgical_year]}
                        </span>
                      ) : (
                        <span className="text-sm text-outline">—</span>
                      )}
                    </td>

                    {/* Músicas */}
                    <td className="px-6 py-5 text-center">
                      <span className="font-headline text-base font-bold text-on-surface">
                        {String(mass.song_count).padStart(2, '0')}
                      </span>
                    </td>

                    {/* Criado */}
                    <td className="px-6 py-5">
                      <span className="text-sm italic text-outline">
                        {timeAgo(mass.created_at)}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => setModal({ mode: 'edit', mass })}
                          aria-label={`Editar ${mass.title}`}
                          className="rounded-xl p-2 text-outline transition hover:bg-primary/5 hover:text-primary"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-lg">
                            edit
                          </span>
                        </button>
                        <Link
                          to={`/missas/${mass.id}`}
                          aria-label={`Ver repertório de ${mass.title}`}
                          className="rounded-xl bg-primary-container px-4 py-2 text-sm font-bold text-on-primary-container transition hover:brightness-110"
                        >
                          Ver Repertório
                        </Link>
                        <button
                          onClick={() => setToDelete(mass)}
                          aria-label={`Remover ${mass.title}`}
                          className="rounded-xl p-2 text-outline transition hover:bg-error/5 hover:text-error"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-lg">
                            delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer info */}
          <div className="border-t border-outline-variant/10 bg-surface-container-low/50 px-8 py-4">
            <p className="text-sm font-medium text-outline">
              Exibindo <span className="font-bold text-on-surface">{filteredMasses.length}</span>{' '}
              {filter === 'upcoming' ? 'próxima' : filter === 'past' ? 'passada' : ''}
              {filteredMasses.length !== 1 ? 's missas' : ' missa'}
            </p>
          </div>
        </div>
      )}

      {modal && (
        <MassModal
          defaultValues={editDefault}
          mass={modal.mode === 'edit' ? modal.mass : undefined}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {toDelete && (
        <DeleteMassModal
          mass={toDelete}
          onClose={() => setToDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
