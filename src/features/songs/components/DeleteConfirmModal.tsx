import { useState } from 'react'
import type { Song } from '../types'

interface Props {
  song: Song
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteConfirmModal({ song, onClose, onConfirm }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)

  async function handleConfirm() {
    setIsLoading(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      // Supabase retorna objeto com .code, não um Error padrão
      const code = (err as Record<string, unknown>)?.code as string | undefined
      const details = (err as Record<string, unknown>)?.details as string | undefined
      const msg = err instanceof Error ? err.message : String(err)

      if (code === '23503' || details?.includes('mass_songs') || msg.includes('mass_songs')) {
        setBlocked(true)
        setError(
          'Esta música está atrelada a uma ou mais missas e não pode ser removida. Desvincule-a das missas antes de excluí-la.',
        )
      } else {
        setError('Erro ao remover a música. Tente novamente.')
      }
    } finally {
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
        aria-labelledby="delete-dialog-title"
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-surface-container-lowest shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div
            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${blocked ? 'bg-warning/10' : 'bg-error/10'}`}
          >
            <span
              aria-hidden="true"
              className={`material-symbols-outlined ${blocked ? 'text-warning' : 'text-error'}`}
            >
              {blocked ? 'link' : 'delete'}
            </span>
          </div>
          <h2 id="delete-dialog-title" className="font-headline text-lg font-bold text-on-surface">
            {blocked ? 'Não é possível remover' : 'Remover música?'}
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            {!blocked && (
              <>
                <span className="font-bold text-on-surface">"{song.title}"</span> será removida do
                repertório permanentemente.
              </>
            )}
          </p>

          {error && (
            <p role="alert" className="mt-3 rounded-2xl bg-error/5 px-4 py-3 text-sm text-error">
              {error}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-full border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-low"
            >
              {blocked ? 'Fechar' : 'Cancelar'}
            </button>
            {!blocked && (
              <button
                onClick={() => void handleConfirm()}
                disabled={isLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-error px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <span aria-hidden="true" className="material-symbols-outlined text-base">
                    delete
                  </span>
                )}
                {isLoading ? 'Removendo…' : 'Remover'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
