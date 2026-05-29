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
    <div>
      <div className="flex items-center justify-between py-2.5">
        <span className="w-20 text-sm font-medium text-gray-600">{label}</span>

        <div className="flex flex-1 items-center justify-end gap-2">
          {url ? (
            <>
              <button
                onClick={() => onView(url)}
                aria-label={`Visualizar ${label}`}
                className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100"
              >
                📄 Ver arquivo
              </button>
              <button
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
                aria-label={`Substituir ${label}`}
                className="rounded-lg px-2 py-1 text-xs text-gray-500 transition hover:bg-gray-100"
              >
                {isUploading ? '…' : '↑'}
              </button>
              <button
                onClick={handleRemove}
                disabled={isRemoving}
                aria-label={`Remover ${label}`}
                className="rounded-lg px-2 py-1 text-xs text-red-400 transition hover:bg-red-50"
              >
                {isRemoving ? '…' : '✕'}
              </button>
            </>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              aria-label={`Enviar ${label}`}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-500 transition hover:border-violet-400 hover:text-violet-600"
            >
              {isUploading ? 'Enviando…' : '↑ Enviar arquivo'}
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="pb-1 text-xs text-red-500">{error}</p>}
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
