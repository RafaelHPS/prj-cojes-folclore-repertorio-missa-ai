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
  { value: 'both', label: 'Partituras + Cifras', icon: 'library_books' },
]

const MODE_LABEL: Record<MergeMode, string> = {
  partitura: 'Partituras',
  letra: 'Letras',
  cifra: 'Cifras',
  both: 'Partituras + Cifras',
}

type Status = 'idle' | 'picking-mode' | 'picking-action' | 'loading' | 'error'

export function MassPdfMergeButton({ songs }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [selectedMode, setSelectedMode] = useState<MergeMode | null>(null)
  const [progress, setProgress] = useState({ loaded: 0, total: 0 })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const hasPartitura = songs.some((s) => s.partitura_url)
  const hasLetra = songs.some((s) => s.letra_url)
  const hasCifra = songs.some((s) => s.cifra_url)
  const availableModes = MODE_OPTIONS.filter((m) => {
    if (m.value === 'partitura') return hasPartitura
    if (m.value === 'letra') return hasLetra
    if (m.value === 'cifra') return hasCifra
    return hasPartitura && hasCifra
  })

  if (availableModes.length === 0) return null

  function handleSelectMode(mode: MergeMode) {
    setSelectedMode(mode)
    setStatus('picking-action')
  }

  async function handleAction(action: 'open' | 'whatsapp') {
    if (!selectedMode) return
    setStatus('loading')
    setErrorMsg(null)
    setProgress({ loaded: 0, total: 0 })

    try {
      const blob = await mergeMassPdfs(songs, selectedMode, (p) => setProgress(p))

      if (action === 'whatsapp') {
        const fileName = `partituras-missa-${selectedMode}.pdf`
        const file = new File([blob], fileName, { type: 'application/pdf' })

        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${MODE_LABEL[selectedMode]} da Missa`,
          })
          setStatus('idle')
          return
        }
        // Fallback: abre o PDF no browser (dispositivo não suporta share de arquivo)
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank', 'noopener,noreferrer')
        setStatus('idle')
        return
      }

      // action === 'open'
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setStatus('idle')
    } catch (err) {
      // AbortError = usuário cancelou o share — não é erro real
      if (err instanceof Error && err.name === 'AbortError') {
        setStatus('idle')
        return
      }
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao gerar PDF.')
      setStatus('error')
    }
  }

  const isDropdownOpen = status === 'picking-mode' || status === 'picking-action'

  return (
    <div className="relative">
      {/* Botão principal */}
      {(status === 'idle' || status === 'error') && (
        <button
          type="button"
          onClick={() => setStatus('picking-mode')}
          className="flex items-center gap-1.5 rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition hover:border-primary/30 hover:text-primary"
          aria-haspopup="menu"
          aria-expanded={false}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            merge
          </span>
          Ver partituras
        </button>
      )}

      {status === 'loading' && (
        <div className="flex items-center gap-2 rounded-full border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          {progress.total > 0 ? `Baixando ${progress.loaded}/${progress.total}…` : 'Preparando…'}
        </div>
      )}

      {status === 'error' && errorMsg && <p className="mt-1 text-xs text-error">{errorMsg}</p>}

      {/* Overlay para fechar dropdown */}
      {isDropdownOpen && (
        <div className="fixed inset-0 z-30" aria-hidden="true" onClick={() => setStatus('idle')} />
      )}

      {/* Etapa 1 — escolha o modo */}
      {status === 'picking-mode' && (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-1 min-w-[210px] overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-xl sm:left-auto sm:right-0"
        >
          <p className="border-b border-outline-variant/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-outline">
            O que visualizar?
          </p>
          {availableModes.map((opt) => (
            <button
              key={opt.value}
              role="menuitem"
              type="button"
              onClick={() => handleSelectMode(opt.value)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base text-primary">
                {opt.icon}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Etapa 2 — escolha a ação */}
      {status === 'picking-action' && selectedMode && (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-1 min-w-[220px] overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-xl sm:left-auto sm:right-0"
        >
          {/* Cabeçalho com modo selecionado e botão voltar */}
          <div className="flex items-center gap-2 border-b border-outline-variant/10 px-3 py-2.5">
            <button
              type="button"
              onClick={() => setStatus('picking-mode')}
              aria-label="Voltar"
              className="rounded-lg p-1 text-outline transition hover:bg-surface-container-low hover:text-on-surface"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-base leading-none">
                arrow_back
              </span>
            </button>
            <p className="text-xs font-bold uppercase tracking-wide text-outline">
              {MODE_LABEL[selectedMode]}
            </p>
          </div>

          {/* Ação: Abrir */}
          <button
            role="menuitem"
            type="button"
            onClick={() => void handleAction('open')}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base text-primary">
              open_in_new
            </span>
            Abrir PDF
          </button>

          {/* Ação: WhatsApp */}
          <button
            role="menuitem"
            type="button"
            onClick={() => void handleAction('whatsapp')}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-on-surface transition hover:bg-surface-container-low"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base text-[#25D366]">
              share
            </span>
            Enviar no WhatsApp
          </button>
        </div>
      )}
    </div>
  )
}
