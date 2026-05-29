import { useState } from 'react'

import type { Song } from '../types'

interface Props {
  song: Song
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteConfirmModal({ song, onClose, onConfirm }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleConfirm() {
    setIsLoading(true)
    await onConfirm()
    setIsLoading(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="delete-dialog-title" className="text-lg font-semibold text-gray-900">
          Remover música?
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          <span className="font-medium text-gray-800">"{song.title}"</span> será removida do
          repertório. Esta ação não pode ser desfeita.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {isLoading ? 'Removendo…' : 'Remover'}
          </button>
        </div>
      </div>
    </div>
  )
}
