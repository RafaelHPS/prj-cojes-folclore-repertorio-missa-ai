import { useState } from 'react'
import type { Mass } from '../types'

interface Props {
  mass: Mass
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteMassModal({ mass, onClose, onConfirm }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleConfirm() {
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
        aria-labelledby="delete-mass-title"
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-surface-container-lowest shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-error/10">
            <span aria-hidden="true" className="material-symbols-outlined text-error">
              delete
            </span>
          </div>
          <h2 id="delete-mass-title" className="font-headline text-lg font-bold text-on-surface">
            Remover celebração?
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            <span className="font-bold text-on-surface">"{mass.title}"</span> e todas as suas
            músicas vinculadas serão removidos permanentemente.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-full border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:bg-surface-container-low"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
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
          </div>
        </div>
      </div>
    </div>
  )
}
