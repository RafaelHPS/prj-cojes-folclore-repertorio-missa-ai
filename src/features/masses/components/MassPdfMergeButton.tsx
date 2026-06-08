import { useState } from 'react'
import { mergeMassPdfs } from '@/utils/pdf-merge.util'
import type { MergeMode, MergeSong } from '@/utils/pdf-merge.util'

interface Props {
  songs: MergeSong[]
}

const MODE_OPTIONS: { value: MergeMode; label: string; icon: string }[] = [
  { value: 'partitura', label: 'Partituras', icon: 'description' },
  { value: 'letra', label: 'Letras', icon: 'article' },
  { value: 'cifra', label: 'Cifras', icon: 'piano' },
  { value: 'both', label: 'Partituras + Letras + Cifras', icon: 'library_books' },
]

type Status = 'idle' | 'picking' | 'loading' | 'error'

export function MassPdfMergeButton({ songs }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState({ loaded: 0, total: 0 })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  // Verifica quais modos têm arquivos disponíveis
  const hasPartitura = songs.some((s) => s.partitura_url)
  const hasLetra = songs.some((s) => s.letra_url)
  const hasCifra = songs.some((s) => s.cifra_url)
  const availableModes = MODE_OPTIONS.filter((m) => {
    if (m.value === 'partitura') return hasPartitura
    if (m.value === 'letra') return hasLetra
    if (m.value === 'cifra') return hasCifra
    return hasPartitura || hasLetra || hasCifra
  })

  if (availableModes.length === 0) return null

  async function handleMerge(mode: MergeMode) {
    setStatus('loading')
    setErrorMsg(null)
    setProgress({ loaded: 0, total: 0 })

    // Libera blob anterior se existir
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    setBlobUrl(null)

    try {
      const blob = await mergeMassPdfs(songs, mode, (p) => setProgress(p))
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)
      // Abre em nova aba — mais confortável para leitura contínua
      window.open(url, '_blank', 'noopener,noreferrer')
      setStatus('idle')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao gerar PDF.')
      setStatus('error')
    }
  }

  return (
    <div className="relative">
      {/* Botão principal */}
      {status === 'idle' || status === 'error' ? (
        <button
          type="button"
          onClick={() => setStatus('picking')}
          className="flex items-center gap-1.5 rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:border-primary/30 hover:text-primary"
          aria-haspopup="menu"
          aria-expanded={false}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            merge
          </span>
          Ver partituras
        </button>
      ) : status === 'loading' ? (
        <div className="flex items-center gap-2 rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          {progress.total > 0 ? `Baixando ${progress.loaded}/${progress.total}…` : 'Preparando…'}
        </div>
      ) : null}

      {/* Erro inline */}
      {status === 'error' && errorMsg && <p className="mt-1 text-xs text-error">{errorMsg}</p>}

      {/* Dropdown de seleção de modo */}
      {status === 'picking' && (
        <>
          {/* Overlay para fechar */}
          <div
            className="fixed inset-0 z-30"
            aria-hidden="true"
            onClick={() => setStatus('idle')}
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-1 min-w-[210px] overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-xl"
          >
            <p className="border-b border-outline-variant/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-outline">
              O que visualizar?
            </p>
            {availableModes.map((opt) => (
              <button
                key={opt.value}
                role="menuitem"
                type="button"
                onClick={() => void handleMerge(opt.value)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
              >
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined text-base text-primary"
                >
                  {opt.icon}
                </span>
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
