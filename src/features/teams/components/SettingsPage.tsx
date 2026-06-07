import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useActiveTeam } from '@/hooks/useActiveTeam'
import { useAppStore } from '@/app/app.store'
import { supabase } from '@/lib/supabase'
import { formatDateTime, formatRelativeTime } from '@/utils/date.util'
import type { UserRole } from '@/types/database'
import { fetchAuditLogs } from '../audit.service'
import type { AuditLog, AuditAction, AuditEntity } from '../audit.service'

import {
  fetchTeamDetails,
  updateTeamDetails,
  fetchTeamMembers,
  updateMemberRole,
  removeMember,
  sendInvite,
  fetchPendingInvites,
  cancelInvite,
  fetchUserProfile,
  updateUserProfile,
  updateUserPassword,
} from '../settings.service'
import type { TeamDetails, TeamMember, Invite, UserProfile } from '../settings.service'

// ── Schemas de perfil e senha ─────────────────────────────────

const profileSchema = z.object({
  fullName: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
})
type ProfileFormData = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })
type PasswordFormData = z.infer<typeof passwordSchema>

// ── Constantes ────────────────────────────────────────────────

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  contributor: 'Colaborador',
  viewer: 'Visualizador',
}

const ROLE_COLOR: Record<UserRole, string> = {
  admin: 'bg-primary/10 text-primary',
  editor: 'bg-secondary/10 text-secondary',
  contributor: 'bg-tertiary/10 text-tertiary-container',
  viewer: 'bg-surface-container text-on-surface-variant',
}

// ── Schema ────────────────────────────────────────────────────

const teamSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  slug: z.string().max(60, 'Slug muito longo').optional(),
})
type TeamFormData = z.infer<typeof teamSchema>

// ── Seção: Minha conta ────────────────────────────────────────

function ProfileSection() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [profileStatus, setProfileStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  const profileForm = useForm<ProfileFormData>({ resolver: zodResolver(profileSchema) })
  const passwordForm = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    fetchUserProfile()
      .then((p) => {
        setProfile(p)
        profileForm.reset({ fullName: p.full_name ?? '' })
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [profileForm])

  async function handleSaveProfile(data: ProfileFormData) {
    if (!profile) return
    setProfileStatus('saving')
    try {
      await updateUserProfile(profile.id, data.fullName)
      setProfile((prev) => (prev ? { ...prev, full_name: data.fullName } : prev))
      setProfileStatus('saved')
      setTimeout(() => setProfileStatus('idle'), 2000)
    } catch {
      setProfileStatus('error')
    }
  }

  async function handleSavePassword(data: PasswordFormData) {
    setPasswordStatus('saving')
    try {
      await updateUserPassword(data.newPassword)
      passwordForm.reset()
      setShowPasswordForm(false)
      setPasswordStatus('saved')
      setTimeout(() => setPasswordStatus('idle'), 3000)
    } catch {
      setPasswordStatus('error')
    }
  }

  const initial = (profile?.full_name ?? profile?.email ?? 'U').charAt(0).toUpperCase()

  return (
    <section className="overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-lowest tonal-shadow">
      <div className="flex items-center gap-2 border-b border-outline-variant/10 px-6 py-4">
        <span aria-hidden="true" className="material-symbols-outlined text-primary">
          account_circle
        </span>
        <h2 className="font-headline font-bold text-on-surface">Minha conta</h2>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6 p-6">
          {/* Avatar + info */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary-container text-2xl font-extrabold text-white">
              {initial}
            </div>
            <div>
              <p className="font-semibold text-on-surface">{profile?.full_name ?? 'Sem nome'}</p>
              <p className="text-sm text-outline">{profile?.email}</p>
            </div>
          </div>

          {/* Formulário de perfil */}
          <form
            onSubmit={profileForm.handleSubmit(handleSaveProfile)}
            noValidate
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="profile-name"
                className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
              >
                Nome completo *
              </label>
              <input
                id="profile-name"
                type="text"
                placeholder="Seu nome"
                aria-invalid={!!profileForm.formState.errors.fullName}
                aria-describedby={
                  profileForm.formState.errors.fullName ? 'profile-name-error' : undefined
                }
                className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-outline transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                {...profileForm.register('fullName')}
              />
              {profileForm.formState.errors.fullName && (
                <p id="profile-name-error" role="alert" className="mt-1 text-xs text-error">
                  {profileForm.formState.errors.fullName.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-on-surface-variant">
                E-mail
              </label>
              <input
                type="email"
                value={profile?.email ?? ''}
                readOnly
                aria-label="E-mail (somente leitura)"
                className="w-full cursor-not-allowed rounded-2xl border border-outline-variant bg-surface-container-low/50 px-4 py-3 text-sm text-on-surface-variant outline-none opacity-70"
              />
              <p className="mt-1 text-xs text-outline">O e-mail não pode ser alterado aqui.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={profileForm.formState.isSubmitting || profileStatus === 'saving'}
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-on-primary shadow-md shadow-primary/20 transition hover:bg-secondary disabled:opacity-60"
              >
                {profileStatus === 'saving' ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <span aria-hidden="true" className="material-symbols-outlined text-base">
                    save
                  </span>
                )}
                {profileStatus === 'saving' ? 'Salvando…' : 'Salvar perfil'}
              </button>
              {profileStatus === 'saved' && (
                <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                  <span aria-hidden="true" className="material-symbols-outlined text-base">
                    check_circle
                  </span>
                  Salvo!
                </span>
              )}
              {profileStatus === 'error' && (
                <span className="text-sm text-error">Erro ao salvar.</span>
              )}
            </div>
          </form>

          {/* Senha */}
          <div className="border-t border-outline-variant/10 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface">Senha</p>
                <p className="text-xs text-outline">Altere sua senha de acesso ao portal.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm((v) => !v)
                  if (showPasswordForm) {
                    passwordForm.reset()
                    setPasswordStatus('idle')
                  }
                }}
                className="rounded-full border border-outline-variant px-4 py-2 text-xs font-semibold text-on-surface-variant transition hover:bg-surface-container-low"
              >
                {showPasswordForm ? 'Cancelar' : 'Alterar senha'}
              </button>
            </div>

            {passwordStatus === 'saved' && !showPasswordForm && (
              <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-primary">
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  check_circle
                </span>
                Senha alterada com sucesso!
              </p>
            )}

            {showPasswordForm && (
              <form
                onSubmit={passwordForm.handleSubmit(handleSavePassword)}
                noValidate
                className="mt-4 space-y-3"
              >
                <div>
                  <label
                    htmlFor="new-password"
                    className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
                  >
                    Nova senha *
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    aria-invalid={!!passwordForm.formState.errors.newPassword}
                    aria-describedby={
                      passwordForm.formState.errors.newPassword ? 'new-password-error' : undefined
                    }
                    className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-outline transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    {...passwordForm.register('newPassword')}
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p id="new-password-error" role="alert" className="mt-1 text-xs text-error">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
                  >
                    Confirmar nova senha *
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    placeholder="Repita a nova senha"
                    aria-invalid={!!passwordForm.formState.errors.confirmPassword}
                    aria-describedby={
                      passwordForm.formState.errors.confirmPassword
                        ? 'confirm-password-error'
                        : undefined
                    }
                    className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-outline transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    {...passwordForm.register('confirmPassword')}
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p id="confirm-password-error" role="alert" className="mt-1 text-xs text-error">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={passwordForm.formState.isSubmitting || passwordStatus === 'saving'}
                    className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-on-primary shadow-md shadow-primary/20 transition hover:bg-secondary disabled:opacity-60"
                  >
                    {passwordStatus === 'saving' ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <span aria-hidden="true" className="material-symbols-outlined text-base">
                        lock
                      </span>
                    )}
                    {passwordStatus === 'saving' ? 'Salvando…' : 'Confirmar nova senha'}
                  </button>
                  {passwordStatus === 'error' && (
                    <span className="text-sm text-error">Erro ao alterar senha.</span>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

// ── Sub-componentes ───────────────────────────────────────────

function MemberRow({
  member,
  currentUserId,
  isAdmin,
  onRoleChange,
  onRemove,
}: {
  member: TeamMember
  currentUserId: string
  isAdmin: boolean
  onRoleChange: (id: string, role: UserRole) => Promise<void>
  onRemove: (member: TeamMember) => void
}) {
  const [isUpdating, setIsUpdating] = useState(false)
  const isSelf = member.user_id === currentUserId
  const initial = (member.full_name ?? member.user_id).charAt(0).toUpperCase()

  async function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setIsUpdating(true)
    try {
      await onRoleChange(member.id, e.target.value as UserRole)
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex items-center gap-4 py-4">
      {/* Avatar */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary-container font-bold text-white">
        {initial}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-on-surface truncate">
            {member.full_name ?? `Usuário ${member.user_id.slice(0, 8)}`}
          </p>
          {isSelf && (
            <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs font-semibold text-outline">
              Você
            </span>
          )}
        </div>
        <p className="text-xs text-outline">Membro desde {formatDateTime(member.created_at)}</p>
      </div>

      {/* Role */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {isAdmin && !isSelf ? (
          <select
            value={member.role}
            onChange={handleRoleChange}
            disabled={isUpdating}
            aria-label={`Role de ${member.full_name ?? 'membro'}`}
            className="rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
          >
            {(Object.entries(ROLE_LABEL) as [UserRole, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_COLOR[member.role]}`}>
            {ROLE_LABEL[member.role]}
          </span>
        )}

        {/* Remover (admin remove outros / qualquer um sai) */}
        {(isAdmin && !isSelf) || isSelf ? (
          <button
            onClick={() => onRemove(member)}
            aria-label={isSelf ? 'Sair da equipe' : `Remover ${member.full_name ?? 'membro'}`}
            className="rounded-xl p-2 text-outline transition hover:bg-error/5 hover:text-error"
            title={isSelf ? 'Sair da equipe' : 'Remover membro'}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-lg">
              {isSelf ? 'logout' : 'person_remove'}
            </span>
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ── Modal de confirmação de remoção ───────────────────────────

function RemoveConfirmModal({
  member,
  isSelf,
  onClose,
  onConfirm,
}: {
  member: TeamMember
  isSelf: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [isLoading, setIsLoading] = useState(false)

  async function handle() {
    setIsLoading(true)
    await onConfirm()
    setIsLoading(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-surface-container-lowest shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-error/10">
            <span aria-hidden="true" className="material-symbols-outlined text-error">
              {isSelf ? 'logout' : 'person_remove'}
            </span>
          </div>
          <h2 className="font-headline text-lg font-bold text-on-surface">
            {isSelf ? 'Sair da equipe?' : 'Remover membro?'}
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            {isSelf ? (
              'Você perderá o acesso a esta equipe e precisará ser readicionado por um administrador.'
            ) : (
              <>
                <span className="font-bold text-on-surface">
                  {member.full_name ?? `Usuário ${member.user_id.slice(0, 8)}`}
                </span>{' '}
                perderá o acesso à equipe.
              </>
            )}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-full border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-low"
            >
              Cancelar
            </button>
            <button
              onClick={handle}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-error px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {isLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  {isSelf ? 'logout' : 'person_remove'}
                </span>
              )}
              {isSelf ? 'Sair' : 'Remover'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Seção: Auditoria ──────────────────────────────────────────

const ACTION_LABEL: Record<AuditAction, string> = {
  create: 'Adição',
  update: 'Edição',
  delete: 'Remoção',
}

const ACTION_BADGE: Record<AuditAction, string> = {
  create: 'bg-primary/10 text-primary',
  update: 'bg-secondary/10 text-secondary',
  delete: 'bg-error/10 text-error',
}

const ENTITY_LABEL: Record<AuditEntity, string> = {
  song: 'Música',
  mass: 'Missa',
  mass_song: 'Repertório',
}

const ENTITY_FILTER_OPTIONS: { value: AuditEntity | 'all'; label: string }[] = [
  { value: 'all', label: 'Tudo' },
  { value: 'song', label: 'Músicas' },
  { value: 'mass', label: 'Missas' },
  { value: 'mass_song', label: 'Repertório' },
]

// ── Tipos e helpers de ordenação multi-coluna ─────────────────

type SortKey = 'created_at' | 'action' | 'entity' | 'description' | 'user_name'
type SortDir = 'asc' | 'desc'

interface SortEntry {
  key: SortKey
  dir: SortDir
}

function getLogValue(log: AuditLog, key: SortKey): string {
  switch (key) {
    case 'created_at':
      return log.created_at // ISO 8601 — inclui ms, comparação lexicográfica é correta
    case 'action':
      return ACTION_LABEL[log.action as AuditAction] ?? ''
    case 'entity':
      return ENTITY_LABEL[log.entity as AuditEntity] ?? ''
    case 'description':
      return log.description ?? log.entity_name ?? ''
    case 'user_name':
      return log.user_name ?? ''
  }
}

function applySort(rows: AuditLog[], sorts: SortEntry[]): AuditLog[] {
  if (sorts.length === 0) return rows
  return [...rows].sort((a, b) => {
    for (const { key, dir } of sorts) {
      const va = getLogValue(a, key)
      const vb = getLogValue(b, key)
      const cmp = va.localeCompare(vb, 'pt-BR', { sensitivity: 'base' })
      if (cmp !== 0) return dir === 'asc' ? cmp : -cmp
    }
    return 0
  })
}

// Ícone de seta baseado no estado atual da coluna
function SortIcon({ dir }: { dir: SortDir | null }) {
  if (dir === null)
    return (
      <span aria-hidden="true" className="material-symbols-outlined text-sm opacity-30">
        unfold_more
      </span>
    )
  return (
    <span aria-hidden="true" className="material-symbols-outlined text-sm text-primary">
      {dir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
    </span>
  )
}

// Cabeçalho clicável com indicador de prioridade de ordenação
function SortTh({
  label,
  sortKey,
  sorts,
  onSort,
}: {
  label: string
  sortKey: SortKey
  sorts: SortEntry[]
  onSort: (key: SortKey) => void
}) {
  const idx = sorts.findIndex((s) => s.key === sortKey)
  const entry = idx >= 0 ? sorts[idx] : null

  return (
    <th scope="col" className="px-4 py-3 first:pl-6">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant transition hover:text-on-surface"
        aria-label={`Ordenar por ${label}`}
      >
        {label}
        <SortIcon dir={entry?.dir ?? null} />
        {sorts.length > 1 && entry && (
          <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-extrabold text-on-primary">
            {idx + 1}
          </span>
        )}
      </button>
    </th>
  )
}

// ── Componente principal ───────────────────────────────────────

function AuditSection({ teamId }: { teamId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [entityFilter, setEntityFilter] = useState<AuditEntity | 'all'>('all')
  const [search, setSearch] = useState('')
  // Ordenação padrão: data decrescente (mais recente primeiro)
  const [sorts, setSorts] = useState<SortEntry[]>([{ key: 'created_at', dir: 'desc' }])

  useEffect(() => {
    let cancelled = false
    fetchAuditLogs(teamId)
      .then((data) => {
        if (!cancelled) setLogs(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [teamId])

  // Clique na coluna: asc → desc → remove; se ainda não existe, adiciona ao final
  function handleSort(key: SortKey) {
    setSorts((prev) => {
      const idx = prev.findIndex((s) => s.key === key)
      if (idx === -1) return [...prev, { key, dir: 'asc' }]
      const cur = prev[idx]
      if (cur.dir === 'asc') {
        const next = [...prev]
        next[idx] = { key, dir: 'desc' }
        return next
      }
      // desc → remove a coluna da ordenação
      return prev.filter((_, i) => i !== idx)
    })
  }

  const filtered = logs.filter((l) => {
    if (entityFilter !== 'all' && l.entity !== entityFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      return (
        (l.description ?? '').toLowerCase().includes(q) ||
        (l.entity_name ?? '').toLowerCase().includes(q) ||
        (l.user_name ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const sorted = applySort(filtered, sorts)

  return (
    <section className="overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-lowest tonal-shadow">
      {/* Header */}
      <div className="space-y-3 border-b border-outline-variant/10 px-6 py-4">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-primary">
            manage_search
          </span>
          <h2 className="font-headline font-bold text-on-surface">Auditoria</h2>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Busca */}
          <div className="relative flex-1">
            <span
              aria-hidden="true"
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base text-outline"
            >
              search
            </span>
            <input
              type="search"
              placeholder="Buscar por descrição, nome ou usuário…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-low py-2 pl-9 pr-4 text-sm text-on-surface outline-none placeholder:text-outline transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Filtro de entidade */}
          <div className="flex gap-1 rounded-xl bg-surface-container-low p-1">
            {ENTITY_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setEntityFilter(opt.value)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  entityFilter === opt.value
                    ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Indicador de ordenações ativas */}
        {sorts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-outline">Ordenando por:</span>
            {sorts.map((s, i) => (
              <span
                key={s.key}
                className="flex items-center gap-1 rounded-full bg-primary/8 px-2.5 py-0.5 text-xs font-semibold text-primary"
              >
                {i + 1}.{' '}
                {s.key === 'created_at'
                  ? 'Data'
                  : s.key === 'action'
                    ? 'Ação'
                    : s.key === 'entity'
                      ? 'Categoria'
                      : s.key === 'description'
                        ? 'Descrição'
                        : 'Usuário'}{' '}
                {s.dir === 'asc' ? '↑' : '↓'}
              </span>
            ))}
            <button
              type="button"
              onClick={() => setSorts([{ key: 'created_at', dir: 'desc' }])}
              className="text-xs text-outline underline-offset-2 hover:text-on-surface hover:underline"
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-sm text-outline">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Histórico de ações">
            <thead>
              <tr className="border-b border-outline-variant/10 bg-surface-container-low/40">
                <SortTh label="Data" sortKey="created_at" sorts={sorts} onSort={handleSort} />
                <SortTh label="Ação" sortKey="action" sorts={sorts} onSort={handleSort} />
                <SortTh label="Categoria" sortKey="entity" sorts={sorts} onSort={handleSort} />
                <SortTh label="Descrição" sortKey="description" sorts={sorts} onSort={handleSort} />
                <SortTh label="Usuário" sortKey="user_name" sorts={sorts} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {sorted.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-surface-container-low/30">
                  <td className="whitespace-nowrap px-6 py-3 text-xs text-outline">
                    <time dateTime={log.created_at} title={log.created_at}>
                      {formatRelativeTime(log.created_at)}
                    </time>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${ACTION_BADGE[log.action as AuditAction]}`}
                    >
                      {ACTION_LABEL[log.action as AuditAction]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-semibold text-on-surface-variant">
                      {ENTITY_LABEL[log.entity as AuditEntity]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface">
                    {log.description ?? log.entity_name ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-outline">
                    {log.user_name ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sorted.length > 0 && (
        <p className="border-t border-outline-variant/10 px-6 py-3 text-xs text-outline">
          {sorted.length} registro{sorted.length !== 1 ? 's' : ''} exibido
          {sorted.length !== 1 ? 's' : ''}.
        </p>
      )}
    </section>
  )
}

// ── Página principal ──────────────────────────────────────────

type SettingsTab = 'account' | 'team' | 'audit'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')
  const activeTeam = useActiveTeam()
  const setActiveTeam = useAppStore((s) => s.setActiveTeam)
  const clearAll = useAppStore((s) => s.clearAll)

  const [, setTeamDetails] = useState<TeamDetails | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [toRemove, setToRemove] = useState<TeamMember | null>(null)
  const [teamSaveStatus, setTeamSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  )
  const [invites, setInvites] = useState<Invite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer')
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [inviteError, setInviteError] = useState<string | null>(null)

  const isAdmin = activeTeam?.role === 'admin'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TeamFormData>({ resolver: zodResolver(teamSchema) })

  useEffect(() => {
    if (!activeTeam) return

    async function load() {
      setIsLoading(true)
      try {
        const [
          details,
          memberList,
          {
            data: { user },
          },
        ] = await Promise.all([
          fetchTeamDetails(activeTeam!.id),
          fetchTeamMembers(activeTeam!.id),
          supabase.auth.getUser(),
        ])
        const pendingInvites = await fetchPendingInvites(activeTeam!.id).catch(() => [])
        setTeamDetails(details)
        setMembers(memberList)
        setInvites(pendingInvites)
        setCurrentUserId(user?.id ?? null)
        if (details) reset({ name: details.name, slug: details.slug ?? '' })
      } finally {
        setIsLoading(false)
      }
    }

    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeam?.id, reset])

  async function handleSaveTeam(data: TeamFormData) {
    if (!activeTeam) return
    setTeamSaveStatus('saving')
    try {
      await updateTeamDetails(activeTeam.id, data)
      setTeamDetails((prev) =>
        prev ? { ...prev, name: data.name, slug: data.slug ?? null } : prev,
      )
      setActiveTeam({ ...activeTeam, name: data.name })
      setTeamSaveStatus('saved')
      setTimeout(() => setTeamSaveStatus('idle'), 2000)
    } catch {
      setTeamSaveStatus('error')
    }
  }

  async function handleRoleChange(memberId: string, role: UserRole) {
    await updateMemberRole(memberId, role)
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)))
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!activeTeam || !inviteEmail.trim()) return
    setInviteStatus('sending')
    setInviteError(null)
    try {
      await sendInvite(inviteEmail.trim(), activeTeam.id, inviteRole)
      setInviteEmail('')
      setInviteStatus('sent')
      // Atualiza lista de convites pendentes (não crítico)
      fetchPendingInvites(activeTeam.id)
        .then(setInvites)
        .catch(() => {})
      setTimeout(() => setInviteStatus('idle'), 6000)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Erro ao criar usuário.')
      setInviteStatus('error')
    }
  }

  async function handleCancelInvite(inviteId: string) {
    await cancelInvite(inviteId)
    setInvites((prev) => prev.filter((i) => i.id !== inviteId))
  }

  async function handleRemove() {
    if (!toRemove) return
    await removeMember(toRemove.id)
    const isSelf = toRemove.user_id === currentUserId
    if (isSelf) {
      clearAll()
      return
    }
    setMembers((prev) => prev.filter((m) => m.id !== toRemove.id))
  }

  if (isLoading) {
    return (
      <div
        className="flex h-64 items-center justify-center"
        role="status"
        aria-label="Carregando configurações"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <header className="mb-10">
        <nav className="mb-3 flex items-center gap-1.5 text-sm font-medium text-outline">
          <span>Home</span>
          <span aria-hidden="true" className="material-symbols-outlined text-xs">
            chevron_right
          </span>
          <span className="font-semibold text-primary">Configurações</span>
        </nav>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface lg:text-5xl">
          Configurações
        </h1>
        <p className="mt-2 text-outline">
          {activeTab === 'account' && 'Gerencie seu perfil e senha.'}
          {activeTab === 'team' && 'Gerencie os dados e membros da equipe.'}
          {activeTab === 'audit' && 'Histórico de adições, edições e remoções.'}
        </p>
      </header>

      {/* Abas */}
      <div className="mb-6 flex gap-1 rounded-2xl bg-surface-container-low p-1" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'account'}
          onClick={() => setActiveTab('account')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'account'
              ? 'bg-surface-container-lowest text-on-surface shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            account_circle
          </span>
          Minha conta
        </button>
        {isAdmin && (
          <button
            role="tab"
            aria-selected={activeTab === 'team'}
            onClick={() => setActiveTab('team')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'team'
                ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              group
            </span>
            Equipe
          </button>
        )}
        {isAdmin && (
          <button
            role="tab"
            aria-selected={activeTab === 'audit'}
            onClick={() => setActiveTab('audit')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'audit'
                ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              manage_search
            </span>
            Auditoria
          </button>
        )}
      </div>

      {activeTab === 'account' && <ProfileSection />}

      {activeTab === 'audit' && isAdmin && activeTeam && <AuditSection teamId={activeTeam.id} />}

      {activeTab === 'team' && isAdmin && (
        <div className="space-y-6">
          {/* Dados da equipe */}
          <section className="overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-lowest tonal-shadow">
            <div className="flex items-center gap-2 border-b border-outline-variant/10 px-6 py-4">
              <span aria-hidden="true" className="material-symbols-outlined text-primary">
                group
              </span>
              <h2 className="font-headline font-bold text-on-surface">Dados da equipe</h2>
            </div>

            <form onSubmit={handleSubmit(handleSaveTeam)} noValidate className="p-6 space-y-4">
              <div>
                <label
                  htmlFor="team-name"
                  className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
                >
                  Nome da equipe *
                </label>
                <input
                  id="team-name"
                  type="text"
                  disabled={!isAdmin}
                  placeholder="Ex: Ministério de Música São José"
                  aria-describedby={errors.name ? 'team-name-error' : undefined}
                  aria-invalid={!!errors.name}
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-outline transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  {...register('name')}
                />
                {errors.name && (
                  <p id="team-name-error" role="alert" className="mt-1 text-xs text-error">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="team-slug"
                  className="mb-1.5 block text-sm font-semibold text-on-surface-variant"
                >
                  Identificador (slug)
                </label>
                <input
                  id="team-slug"
                  type="text"
                  disabled={!isAdmin}
                  placeholder="Ex: ministerio-sao-jose"
                  className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none placeholder:text-outline transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                  {...register('slug')}
                />
              </div>

              {isAdmin && (
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || teamSaveStatus === 'saving'}
                    className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-on-primary shadow-md shadow-primary/20 transition hover:bg-secondary disabled:opacity-60"
                  >
                    {teamSaveStatus === 'saving' ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <span aria-hidden="true" className="material-symbols-outlined text-base">
                        save
                      </span>
                    )}
                    {teamSaveStatus === 'saving' ? 'Salvando…' : 'Salvar alterações'}
                  </button>
                  {teamSaveStatus === 'saved' && (
                    <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                      <span aria-hidden="true" className="material-symbols-outlined text-base">
                        check_circle
                      </span>
                      Salvo!
                    </span>
                  )}
                  {teamSaveStatus === 'error' && (
                    <span className="text-sm text-error">Erro ao salvar.</span>
                  )}
                </div>
              )}
            </form>
          </section>

          {/* Membros */}
          <section className="overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-lowest tonal-shadow">
            <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-4">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="material-symbols-outlined text-primary">
                  people
                </span>
                <h2 className="font-headline font-bold text-on-surface">
                  Membros
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary">
                    {members.length}
                  </span>
                </h2>
              </div>
            </div>

            <div className="divide-y divide-outline-variant/10 px-6">
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  currentUserId={currentUserId ?? ''}
                  isAdmin={isAdmin}
                  onRoleChange={handleRoleChange}
                  onRemove={setToRemove}
                />
              ))}
            </div>

            {/* Formulário de convite — só para admins */}
            {isAdmin && (
              <div className="border-t border-outline-variant/10 px-6 py-5">
                <p className="mb-3 text-sm font-bold text-on-surface">Convidar novo membro</p>
                <form
                  onSubmit={handleSendInvite}
                  noValidate
                  className="flex flex-col gap-3 sm:flex-row sm:items-end"
                >
                  <div className="flex-1">
                    <label
                      htmlFor="invite-email"
                      className="mb-1 block text-xs font-semibold text-on-surface-variant"
                    >
                      E-mail
                    </label>
                    <input
                      id="invite-email"
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="w-full rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm text-on-surface outline-none placeholder:text-outline transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="invite-role"
                      className="mb-1 block text-xs font-semibold text-on-surface-variant"
                    >
                      Role
                    </label>
                    <select
                      id="invite-role"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as UserRole)}
                      className="rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      {(Object.entries(ROLE_LABEL) as [UserRole, string][]).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={inviteStatus === 'sending' || !inviteEmail.trim()}
                    className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary shadow-md shadow-primary/20 transition hover:bg-secondary disabled:opacity-60 whitespace-nowrap"
                  >
                    {inviteStatus === 'sending' ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <span aria-hidden="true" className="material-symbols-outlined text-base">
                        send
                      </span>
                    )}
                    {inviteStatus === 'sending' ? 'Enviando…' : 'Enviar convite'}
                  </button>
                </form>

                {inviteStatus === 'sent' && (
                  <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-primary">
                      <span aria-hidden="true" className="material-symbols-outlined text-base">
                        mark_email_read
                      </span>
                      Convite enviado!
                    </p>
                    <p className="mt-1.5 text-xs text-on-surface-variant">
                      O membro receberá um e-mail com o link de acesso. Ao clicar, será adicionado à
                      equipe automaticamente.
                    </p>
                  </div>
                )}
                {inviteStatus === 'error' && inviteError && (
                  <p className="mt-2 text-sm text-error">{inviteError}</p>
                )}
              </div>
            )}

            {/* Convites pendentes */}
            {isAdmin && invites.length > 0 && (
              <div className="border-t border-outline-variant/10 px-6 pb-5">
                <p className="mb-3 mt-4 text-sm font-bold text-on-surface">
                  Convites pendentes
                  <span className="ml-2 rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-bold text-secondary">
                    {invites.length}
                  </span>
                </p>
                <ul className="space-y-2">
                  {invites.map((invite) => (
                    <li
                      key={invite.id}
                      className="flex items-center justify-between rounded-2xl bg-surface-container-low px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-on-surface">{invite.email}</p>
                        <p className="text-xs text-outline">
                          {ROLE_LABEL[invite.role]} · enviado{' '}
                          {new Date(invite.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <button
                        onClick={() => void handleCancelInvite(invite.id)}
                        aria-label={`Cancelar convite para ${invite.email}`}
                        className="rounded-xl p-2 text-outline transition hover:bg-error/5 hover:text-error"
                        title="Cancelar convite"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-lg">
                          cancel
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}

      {toRemove && currentUserId && (
        <RemoveConfirmModal
          member={toRemove}
          isSelf={toRemove.user_id === currentUserId}
          onClose={() => setToRemove(null)}
          onConfirm={handleRemove}
        />
      )}
    </div>
  )
}
