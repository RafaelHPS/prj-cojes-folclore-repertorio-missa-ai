import { useState } from 'react'

import type { Invite } from '../settings.service'

interface CancelInviteConfirmModalProps {
  invite: Invite
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function CancelInviteConfirmModal({
  invite,
  onClose,
  onConfirm,
}: CancelInviteConfirmModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setIsLoading(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch {
      setError('Não foi possível cancelar o convite. Tente novamente.')
      setIsLoading(false)
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
        aria-labelledby="cancel-invite-title"
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-surface-container-lowest shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-error/10">
            <span aria-hidden="true" className="material-symbols-outlined text-error">
              cancel
            </span>
          </div>
          <h2 id="cancel-invite-title" className="font-headline text-lg font-bold text-on-surface">
            Cancelar convite?
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            O convite para{' '}
            <span className="break-all font-bold text-on-surface">{invite.email}</span> deixará de
            valer: a pessoa não entrará na equipe pelo link que já recebeu.
          </p>

          {error && (
            <p role="alert" className="mt-3 text-xs text-error">
              {error}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            {/* Rótulo "Manter" em vez de "Cancelar": dois botões "Cancelar" lado a lado,
                com efeitos opostos, confundem justamente quem está cancelando algo. */}
            <button
              onClick={onClose}
              autoFocus
              className="flex-1 rounded-full border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-low"
            >
              Manter convite
            </button>
            <button
              onClick={() => void handleConfirm()}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-error px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {isLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <span aria-hidden="true" className="material-symbols-outlined text-base">
                  cancel
                </span>
              )}
              Cancelar convite
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
