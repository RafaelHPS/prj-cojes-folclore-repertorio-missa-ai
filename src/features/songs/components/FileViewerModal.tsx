import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  title: string
  url: string
  onClose: () => void
}

export function FileViewerModal({ title, url, onClose }: Props) {
  const onCloseRef = useRef(onClose)
  const closedByBack = useRef(false)
  const pendingBackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    // Em StrictMode (dev), o React roda setup→cleanup→setup deste efeito de
    // propósito. Se um history.back() do cleanup "fantasma" chegasse a
    // disparar, o popstate assíncrono resultante seria capturado pelo
    // listener do segundo setup e fecharia o modal sozinho. Por isso o
    // back() do cleanup é adiado (setTimeout 0) e cancelável: o próximo
    // setup cancela o timer se ainda não disparou (= era só o StrictMode
    // remontando), e só um cleanup "de verdade" (sem setup seguinte) deixa
    // o timer disparar e desfazer o pushState.
    if (pendingBackTimer.current) {
      clearTimeout(pendingBackTimer.current)
      pendingBackTimer.current = null
    }

    window.history.pushState({ modal: 'viewer' }, '')

    function handlePopState() {
      closedByBack.current = true
      onCloseRef.current()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      // Fechou pelo X — remove a entrada que empurramos
      if (!closedByBack.current) {
        pendingBackTimer.current = setTimeout(() => {
          pendingBackTimer.current = null
          window.history.back()
        }, 0)
      }
    }
  }, [])

  const cleanUrl = url.split('?').at(0) ?? url
  const ext = cleanUrl.split('.').pop()?.toLowerCase() ?? ''
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)
  const isPdf = ext === 'pdf'

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#140a08]/90">
      <div className="flex flex-shrink-0 items-center justify-between px-6 py-3.5">
        <p className="truncate text-sm font-medium text-white">{title}</p>
        <div className="ml-4 flex flex-shrink-0 items-center gap-3.5">
          <a
            href={url}
            download
            className="text-xs font-semibold text-white/70 transition hover:text-white"
          >
            ↓ Baixar
          </a>
          <button
            onClick={onClose}
            aria-label="Fechar visualizador"
            className="rounded-lg bg-white/10 p-1.5 text-xl leading-none text-white transition hover:bg-white/20"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isImage ? (
          <img src={url} alt={title} className="h-full w-full object-contain" />
        ) : isPdf ? (
          <iframe src={url} className="h-full w-full border-0" title={title} />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <div>
              <p className="mb-6 text-white/70">
                Este tipo de arquivo não pode ser visualizado aqui.
              </p>
              <a
                href={url}
                download
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition hover:bg-secondary"
              >
                ↓ Baixar arquivo
              </a>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
