import { useState } from 'react'
import type { Song } from '../types'

interface Props {
  song: Song
  onClose: () => void
  onConfirm: (force?: boolean) => Promise<void>
}

export function DeleteConfirmModal({ song, onClose, onConfirm }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUsedInMasses, setIsUsedInMasses] = useState(false)

  async function handleConfirm(force = false) {
    setIsLoading(true)
    setError(null)
    try {
      await onConfirm(force)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // FK violation — música usada em missas
      if (msg.includes('mass_songs') || msg.includes('23503')) {
        setIsUsedInMasses(true)
        setError(
          'Esta música está sendo usada em uma ou mais missas. Deseja removê-la de todas as missas e excluí-la?',
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
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-error/10">
            <span aria-hidden="true" className="material-symbols-outlined text-error">
              delete
            </span>
          </div>
          <h2 id="delete-dialog-title" className="font-headline text-lg font-bold text-on-surface">
            Remover música?
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            <span className="font-bold text-on-surface">"{song.title}"</span> será removida do
            repertório permanentemente.
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
              Cancelar
            </button>
            {isUsedInMasses ? (
              <button
                onClick={() => void handleConfirm(true)}
                disabled={isLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-error px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <span aria-hidden="true" className="material-symbols-outlined text-base">
                    delete_forever
                  </span>
                )}
                {isLoading ? 'Removendo…' : 'Remover mesmo assim'}
              </button>
            ) : (
              <button
                onClick={() => void handleConfirm(false)}
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
