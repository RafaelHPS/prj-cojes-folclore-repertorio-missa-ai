import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { useActiveTeam } from '@/hooks/useActiveTeam'
import { useAppStore } from '@/app/app.store'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/utils/date.util'
import type { UserRole } from '@/types/database'

import {
  fetchTeamDetails,
  updateTeamDetails,
  fetchTeamMembers,
  updateMemberRole,
  removeMember,
  sendInvite,
  fetchPendingInvites,
  cancelInvite,
} from '../settings.service'
import type { TeamDetails, TeamMember, Invite } from '../settings.service'

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

// ── Página principal ──────────────────────────────────────────

export default function SettingsPage() {
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
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

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
    setInviteLink(null)
    try {
      const { link } = await sendInvite(inviteEmail.trim(), activeTeam.id, inviteRole)
      const updated = await fetchPendingInvites(activeTeam.id)
      setInvites(updated)
      setInviteEmail('')
      setInviteLink(link)
      setInviteStatus('sent')
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Erro ao enviar convite.')
      setInviteStatus('error')
    }
  }

  async function handleCopyLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
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
        <p className="mt-2 text-outline">Gerencie os dados e membros da equipe.</p>
      </header>

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

              {inviteStatus === 'sent' && inviteLink && (
                <div className="mt-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-primary">
                    <span aria-hidden="true" className="material-symbols-outlined text-base">
                      check_circle
                    </span>
                    Usuário criado! Compartilhe o link de acesso:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={inviteLink}
                      className="flex-1 rounded-xl bg-surface-container-lowest px-3 py-2 text-xs text-on-surface-variant outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-on-primary transition hover:bg-secondary"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-sm">
                        {linkCopied ? 'check' : 'content_copy'}
                      </span>
                      {linkCopied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-outline">
                    O membro usa este link para definir a senha e acessar a equipe.
                  </p>
                </div>
              )}

              {inviteStatus === 'sent' && !inviteLink && (
                <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-primary">
                  <span aria-hidden="true" className="material-symbols-outlined text-base">
                    check_circle
                  </span>
                  Usuário criado com sucesso!
                </p>
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
