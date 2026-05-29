interface Props {
  title: string
  url: string
  onClose: () => void
}

export function FileViewerModal({ title, url, onClose }: Props) {
  const cleanUrl = url.split('?').at(0) ?? url
  const ext = cleanUrl.split('.').pop()?.toLowerCase() ?? ''
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)
  const isPdf = ext === 'pdf'

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90">
      <div className="flex flex-shrink-0 items-center justify-between bg-gray-900 px-6 py-3">
        <p className="truncate text-sm font-medium text-white">{title}</p>
        <div className="ml-4 flex flex-shrink-0 items-center gap-3">
          <a href={url} download className="text-xs text-gray-400 transition hover:text-white">
            ↓ Baixar
          </a>
          <button
            onClick={onClose}
            aria-label="Fechar visualizador"
            className="text-xl leading-none text-gray-400 transition hover:text-white"
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
              <p className="mb-6 text-gray-300">Este tipo de arquivo não pode ser visualizado aqui.</p>
              <a
                href={url}
                download
                className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                ↓ Baixar arquivo
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
