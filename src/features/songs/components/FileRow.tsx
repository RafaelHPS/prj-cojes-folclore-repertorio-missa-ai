import { useRef, useState } from 'react'

interface Props {
  label: string
  accept: string
  url: string | null
  onUpload: (file: File) => Promise<void>
  onRemove: () => Promise<void>
  onView: (url: string) => void
}

export function FileRow({ label, accept, url, onUpload, onRemove, onView }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    setError(null)
    try {
      await onUpload(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no upload.')
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove() {
    setIsRemoving(true)
    setError(null)
    try {
      await onRemove()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover.')
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="py-2.5">
      <div className="flex items-center justify-between">
        <span className="w-20 text-sm font-semibold text-on-surface-variant">{label}</span>

        <div className="flex flex-1 items-center justify-end gap-2">
          {url ? (
            <>
              <button
                onClick={() => onView(url)}
                aria-label={`Visualizar ${label}`}
                className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary transition hover:bg-primary/20"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-xs">
                  visibility
                </span>
                Ver arquivo
              </button>
              <button
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
                aria-label={`Substituir ${label}`}
                className="rounded-xl p-1.5 text-outline transition hover:bg-surface-container-low hover:text-on-surface"
                title="Substituir"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  upload
                </span>
              </button>
              <button
                onClick={handleRemove}
                disabled={isRemoving}
                aria-label={`Remover ${label}`}
                className="rounded-xl p-1.5 text-outline transition hover:bg-error/5 hover:text-error"
                title="Remover"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-sm">
                  {isRemoving ? 'hourglass_empty' : 'delete'}
                </span>
              </button>
            </>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              aria-label={`Enviar ${label}`}
              className="flex items-center gap-1.5 rounded-full border border-dashed border-outline-variant px-3 py-1.5 text-xs font-semibold text-outline transition hover:border-primary hover:text-primary"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-sm">
                {isUploading ? 'hourglass_empty' : 'upload'}
              </span>
              {isUploading ? 'Enviando…' : 'Enviar arquivo'}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-error">
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        aria-label={`Arquivo de ${label}`}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
