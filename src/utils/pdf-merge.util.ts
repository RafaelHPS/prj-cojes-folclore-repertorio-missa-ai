import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export type MergeMode = 'partitura' | 'cifra' | 'both'

export interface MergeSong {
  title: string
  partLabel: string
  partitura_url: string | null
  cifra_url: string | null
}

export interface MergeProgress {
  loaded: number
  total: number
}

/**
 * Baixa e mescla os PDFs de partitura e/ou cifra de uma lista de músicas.
 * Insere uma página separadora antes de cada música com o nome da parte
 * litúrgica e o título da música.
 *
 * @param songs  - Lista de músicas com URLs de partitura/cifra
 * @param mode   - 'partitura' | 'cifra' | 'both'
 * @param onProgress - Callback de progresso (loaded / total arquivos)
 * @returns Blob do PDF mesclado
 */
export async function mergeMassPdfs(
  songs: MergeSong[],
  mode: MergeMode,
  onProgress?: (p: MergeProgress) => void,
): Promise<Blob> {
  // Constrói a lista de itens a baixar (mantém ordem: partitura antes de cifra)
  const items: { song: MergeSong; type: 'partitura' | 'cifra'; url: string }[] = []
  for (const song of songs) {
    if ((mode === 'partitura' || mode === 'both') && song.partitura_url) {
      items.push({ song, type: 'partitura', url: song.partitura_url })
    }
    if ((mode === 'cifra' || mode === 'both') && song.cifra_url) {
      items.push({ song, type: 'cifra', url: song.cifra_url })
    }
  }

  if (items.length === 0) throw new Error('Nenhum arquivo disponível para o modo selecionado.')

  // Download paralelo de todos os PDFs
  let loaded = 0
  onProgress?.({ loaded, total: items.length })

  const buffers = await Promise.all(
    items.map(async (item) => {
      const res = await fetch(item.url)
      if (!res.ok) throw new Error(`Falha ao baixar PDF: ${item.url}`)
      const buf = await res.arrayBuffer()
      onProgress?.({ loaded: ++loaded, total: items.length })
      return { item, buf }
    }),
  )

  // Mescla com pdf-lib
  const merged = await PDFDocument.create()
  const helvetica = await merged.embedFont(StandardFonts.HelveticaBold)
  const helveticaRegular = await merged.embedFont(StandardFonts.Helvetica)

  // Agrupa por música para inserir separador uma vez por música (mesmo em 'both')
  let lastSongTitle = ''

  for (const { item, buf } of buffers) {
    const isFirstOfSong = item.song.title !== lastSongTitle
    lastSongTitle = item.song.title

    if (isFirstOfSong) {
      // ── Página separadora ──────────────────────────────────────
      const sep = merged.addPage([595, 842]) // A4 portrait
      const { width, height } = sep.getSize()

      // Barra superior colorida
      sep.drawRectangle({
        x: 0,
        y: height - 6,
        width,
        height: 6,
        color: rgb(0.24, 0.39, 0.78), // azul primário
      })

      // Barra lateral esquerda
      sep.drawRectangle({
        x: 0,
        y: 0,
        width: 6,
        height,
        color: rgb(0.24, 0.39, 0.78),
      })

      // Parte litúrgica
      const partFontSize = 12
      sep.drawText(item.song.partLabel.toUpperCase(), {
        x: 60,
        y: height / 2 + 30,
        size: partFontSize,
        font: helveticaRegular,
        color: rgb(0.5, 0.5, 0.5),
        maxWidth: width - 120,
      })

      // Título da música
      const titleFontSize = 28
      const titleLines = wrapText(item.song.title, helvetica, titleFontSize, width - 120)
      let titleY = height / 2
      for (const line of titleLines) {
        sep.drawText(line, {
          x: 60,
          y: titleY,
          size: titleFontSize,
          font: helvetica,
          color: rgb(0.1, 0.1, 0.1),
        })
        titleY -= titleFontSize * 1.3
      }

      // Tipo de documento (quando mode === 'both')
      if (mode === 'both') {
        const typeLabel = item.type === 'partitura' ? 'Partitura' : 'Cifra'
        sep.drawText(typeLabel, {
          x: 60,
          y: titleY - 10,
          size: 12,
          font: helveticaRegular,
          color: rgb(0.24, 0.39, 0.78),
        })
      }
    } else if (mode === 'both') {
      // Mesmo título mas tipo diferente (cifra após partitura): mini separador
      const sep = merged.addPage([595, 842])
      const { width, height } = sep.getSize()
      sep.drawRectangle({ x: 0, y: height - 6, width, height: 6, color: rgb(0.24, 0.39, 0.78) })
      sep.drawRectangle({ x: 0, y: 0, width: 6, height, color: rgb(0.24, 0.39, 0.78) })
      sep.drawText(item.song.title, {
        x: 60,
        y: height / 2 + 10,
        size: 20,
        font: helvetica,
        color: rgb(0.1, 0.1, 0.1),
        maxWidth: width - 120,
      })
      sep.drawText('Cifra', {
        x: 60,
        y: height / 2 - 20,
        size: 12,
        font: helveticaRegular,
        color: rgb(0.24, 0.39, 0.78),
      })
    }

    // ── Copia páginas do PDF da música ────────────────────────
    try {
      const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true })
      const pageIndices = srcDoc.getPageIndices()
      const copiedPages = await merged.copyPages(srcDoc, pageIndices)
      copiedPages.forEach((p) => merged.addPage(p))
    } catch {
      // PDF corrompido ou protegido — insere página de aviso
      const errPage = merged.addPage([595, 842])
      errPage.drawText('Arquivo não pôde ser carregado.', {
        x: 60,
        y: errPage.getSize().height / 2,
        size: 14,
        font: helveticaRegular,
        color: rgb(0.8, 0.2, 0.2),
      })
    }
  }

  const pdfBytes = await merged.save()
  return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
}

/**
 * Quebra texto em linhas para caber na largura máxima (estimativa por caractere).
 */
function wrapText(text: string, _font: unknown, fontSize: number, maxWidth: number): string[] {
  // Estimativa: cada caractere ocupa ~0.55 * fontSize de largura
  const charsPerLine = Math.floor(maxWidth / (fontSize * 0.55))
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).trim().length > charsPerLine) {
      if (current) lines.push(current)
      current = word
    } else {
      current = current ? `${current} ${word}` : word
    }
  }
  if (current) lines.push(current)
  return lines
}
