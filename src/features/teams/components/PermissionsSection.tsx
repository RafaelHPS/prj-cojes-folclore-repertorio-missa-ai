import { useEffect, useState } from 'react'

import {
  fetchRolePermissions,
  saveRolePermissions,
  PERMISSION_GROUPS,
  ROLES_EDITABLE,
  DEFAULT_PERMISSIONS,
} from '../permissions.service'
import type { Permission, PermissionMap } from '../permissions.service'
import type { UserRole } from '@/types/database'

// ── Labels e cores por role ───────────────────────────────────

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  editor: 'Editor',
  contributor: 'Contribuidor',
  viewer: 'Visualizador',
}

const ROLE_COLOR: Record<string, string> = {
  editor: 'text-blue-600',
  contributor: 'text-violet-600',
  viewer: 'text-outline',
}

// ── Toggle switch ─────────────────────────────────────────────

interface ToggleProps {
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
  label: string
}

function Toggle({ checked, disabled = false, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
      } ${checked ? 'bg-primary' : 'bg-surface-container-highest'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ── Componente principal ──────────────────────────────────────

interface Props {
  teamId: string
}

export function PermissionsSection({ teamId }: Props) {
  const [map, setMap] = useState<PermissionMap>(DEFAULT_PERMISSIONS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchRolePermissions(teamId)
      .then((data) => {
        if (cancelled) return
        setMap(data)
        setIsDirty(false)
        setIsLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('Erro ao carregar permissões.')
        setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [teamId])

  function handleToggle(role: UserRole, permission: Permission, value: boolean) {
    setMap((prev) => ({
      ...prev,
      [role]: { ...prev[role], [permission]: value },
    }))
    setIsDirty(true)
    setError(null)
  }

  async function handleSave() {
    setIsSaving(true)
    setError(null)
    try {
      await saveRolePermissions(teamId, map)
      setIsDirty(false)
      setSavedAt(new Date())
    } catch {
      setError('Erro ao salvar permissões. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  function handleReset() {
    setMap(DEFAULT_PERMISSIONS)
    setIsDirty(true)
    setError(null)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Carregando permissões">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface-container-lowest tonal-shadow">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/10 px-6 py-4">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-primary">
            admin_panel_settings
          </span>
          <div>
            <h2 className="font-headline font-bold text-on-surface">Permissões por função</h2>
            <p className="text-xs text-outline">
              Configure o que cada função pode fazer na equipe.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && !isDirty && (
            <span className="flex items-center gap-1 text-xs text-outline">
              <span aria-hidden="true" className="material-symbols-outlined text-sm text-primary">
                check_circle
              </span>
              Salvo
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-outline transition hover:bg-surface-container-low hover:text-on-surface"
          >
            Restaurar padrão
          </button>
        </div>
      </div>

      {/* Legenda dos roles */}
      <div className="border-b border-outline-variant/10 bg-surface-container-low/50 px-6 py-3">
        <div className="flex items-center">
          {/* Coluna de permissão */}
          <div className="flex-1" />
          {/* Coluna Admin (sempre bloqueado) */}
          <div className="flex w-20 flex-col items-center gap-0.5">
            <span className="text-xs font-bold text-on-surface">{ROLE_LABEL.admin}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              sempre
            </span>
          </div>
          {/* Colunas editáveis */}
          {ROLES_EDITABLE.map((role) => (
            <div key={role} className="flex w-24 flex-col items-center gap-0.5">
              <span className={`text-xs font-bold ${ROLE_COLOR[role]}`}>{ROLE_LABEL[role]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Matriz de permissões */}
      <div className="divide-y divide-outline-variant/10">
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.label}>
            {/* Cabeçalho do grupo */}
            <div className="flex items-center gap-2 bg-surface-container-low/30 px-6 py-2.5">
              <span aria-hidden="true" className="material-symbols-outlined text-sm text-outline">
                {group.icon}
              </span>
              <span className="text-xs font-extrabold uppercase tracking-widest text-outline">
                {group.label}
              </span>
            </div>

            {/* Linhas de permissão */}
            {group.permissions.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center px-6 py-3 transition hover:bg-surface-container-low/20"
              >
                {/* Label da permissão */}
                <div className="flex-1">
                  <span className="text-sm font-medium text-on-surface">{label}</span>
                </div>

                {/* Admin — sempre ativo, bloqueado */}
                <div className="flex w-20 justify-center">
                  <Toggle
                    checked={true}
                    disabled={true}
                    onChange={() => {}}
                    label={`Admin: ${label}`}
                  />
                </div>

                {/* Roles editáveis */}
                {ROLES_EDITABLE.map((role) => (
                  <div key={role} className="flex w-24 justify-center">
                    <Toggle
                      checked={map[role][key]}
                      onChange={(value) => handleToggle(role, key, value)}
                      label={`${ROLE_LABEL[role]}: ${label}`}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Rodapé com erro e botão salvar */}
      <div className="flex items-center justify-between border-t border-outline-variant/10 px-6 py-4">
        <div>
          {error && (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-error">
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                error
              </span>
              {error}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!isDirty || isSaving}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-on-primary transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
              Salvando…
            </>
          ) : (
            <>
              <span aria-hidden="true" className="material-symbols-outlined text-base">
                save
              </span>
              Salvar alterações
            </>
          )}
        </button>
      </div>
    </section>
  )
}
