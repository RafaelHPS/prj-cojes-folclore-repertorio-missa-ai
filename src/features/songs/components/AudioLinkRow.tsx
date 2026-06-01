import { useState } from 'react'

interface Props {
  url: string | null
  onSave: (url: string | null) => Promise<void>
}

export function AudioLinkRow({ url, onSave }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(url ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    setIsSaving(true)
    setError(null)
    try {
      await onSave(trimmed)
      setIsEditing(false)
    } catch {
      setError('Erro ao salvar link.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemove() {
    setIsSaving(true)
    setError(null)
    try {
      await onSave(null)
      setInputValue('')
      setIsEditing(false)
    } catch {
      setError('Erro ao remover link.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="w-20 flex-shrink-0 text-sm font-semibold text-on-surface-variant">
          Áudio
        </span>

        <div className="flex flex-1 items-center justify-end gap-2">
          {url && !isEditing ? (
            <>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary transition hover:bg-primary/20"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-xs">
                  headphones
                </span>
                Ouvir
              </a>
              <button
                onClick={() => {
                  setInputValue(url)
                  setIsEditing(true)
                }}
                aria-label="Editar link de áudio"
                className="rounded-xl p-1.5 text-outline transition hover:bg-surface-container-low hover:text-on-surface"
                title="Editar"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  edit
                </span>
              </button>
              <button
                onClick={() => void handleRemove()}
                disabled={isSaving}
                aria-label="Remover link de áudio"
                className="rounded-xl p-1.5 text-outline transition hover:bg-error/5 hover:text-error"
                title="Remover"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  {isSaving ? 'hourglass_empty' : 'delete'}
                </span>
              </button>
            </>
          ) : isEditing ? (
            <>
              <input
                autoFocus
                type="url"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleSave()}
                placeholder="https://youtube.com/…"
                aria-label="Link de áudio"
                className="min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs text-on-surface outline-none placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={() => void handleSave()}
                disabled={!inputValue.trim() || isSaving}
                className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-on-primary disabled:opacity-50"
              >
                {isSaving ? '…' : 'Salvar'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                aria-label="Cancelar"
                className="shrink-0 rounded-xl p-1.5 text-outline hover:text-on-surface"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  close
                </span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 rounded-full border border-dashed border-outline-variant px-3 py-1.5 text-xs font-semibold text-outline transition hover:border-primary hover:text-primary"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                add_link
              </span>
              Adicionar link
            </button>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-1 text-xs text-error">
          {error}
        </p>
      )}
    </div>
  )
}
