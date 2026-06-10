import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFFont,
  PDFName,
  PDFNumber,
  PDFPage,
  PDFRef,
  StandardFonts,
  rgb,
} from 'pdf-lib'

export type MergeMode = 'partitura' | 'cifra' | 'letra' | 'both'

export interface MergeSong {
  title: string
  partLabel: string
  partitura_url: string | null
  cifra_url: string | null
  letra_url: string | null
}

export interface MergeProgress {
  loaded: number
  total: number
}

// ── Constantes visuais ────────────────────────────────────────

const PRIMARY = rgb(0.24, 0.39, 0.78)
const DARK = rgb(0.1, 0.1, 0.1)
const GRAY = rgb(0.5, 0.5, 0.5)
const LIGHT = rgb(0.78, 0.78, 0.78)

const MODE_LABEL: Record<MergeMode, string> = {
  partitura: 'Partituras',
  letra: 'Letras',
  cifra: 'Cifras',
  both: 'Partituras + Cifras',
}

// ── Tipos internos ────────────────────────────────────────────

interface TocEntry {
  title: string
  partLabel: string
  /** Índice da página separadora ANTES da inserção do índice */
  separatorPageIndex: number
}

// ── Auxiliares ────────────────────────────────────────────────

/**
 * Quebra texto em linhas para caber na largura máxima (estimativa por caractere).
 */
function wrapText(text: string, _font: unknown, fontSize: number, maxWidth: number): string[] {
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

/**
 * Trunca o texto para caber em maxWidth usando largura real da fonte.
 */
function truncateText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let t = text
  while (t.length > 1 && font.widthOfTextAtSize(t + '…', size) > maxWidth) {
    t = t.slice(0, -1)
  }
  return t + '…'
}

/**
 * Cria uma anotação de link PDF (GoTo) e retorna a PDFRef.
 * O link navega para a página `targetPage` (modo FitH — ajusta largura).
 * Usa ação GoTo explícita para maior compatibilidade com viewers mobile.
 */
function createLinkAnnot(
  doc: PDFDocument,
  targetPage: PDFPage,
  rect: [number, number, number, number],
): PDFRef {
  const [x1, y1, x2, y2] = rect

  // Destino: topo da página alvo ajustado à largura (FitH)
  const dest = PDFArray.withContext(doc.context)
  dest.push(targetPage.ref)
  dest.push(PDFName.of('FitH'))
  dest.push(PDFNumber.of(842)) // topo da página A4

  // Ação GoTo explícita — maior compatibilidade com viewers mobile
  const action = PDFDict.withContext(doc.context)
  action.set(PDFName.of('S'), PDFName.of('GoTo'))
  action.set(PDFName.of('D'), dest)

  const annotRect = PDFArray.withContext(doc.context)
  annotRect.push(PDFNumber.of(x1))
  annotRect.push(PDFNumber.of(y1))
  annotRect.push(PDFNumber.of(x2))
  annotRect.push(PDFNumber.of(y2))

  const border = PDFArray.withContext(doc.context)
  border.push(PDFNumber.of(0))
  border.push(PDFNumber.of(0))
  border.push(PDFNumber.of(0))

  const annot = PDFDict.withContext(doc.context)
  annot.set(PDFName.of('Type'), PDFName.of('Annot'))
  annot.set(PDFName.of('Subtype'), PDFName.of('Link'))
  annot.set(PDFName.of('Rect'), annotRect)
  annot.set(PDFName.of('Border'), border)
  annot.set(PDFName.of('A'), action) // action explícita em vez de Dest direto

  return doc.context.register(annot)
}

// ── Merge principal ───────────────────────────────────────────

/**
 * Baixa e mescla os PDFs de uma lista de músicas.
 * Gera uma primeira página de índice com links clicáveis para cada música.
 * Insere uma página separadora antes de cada música com nome e parte litúrgica.
 */
export async function mergeMassPdfs(
  songs: MergeSong[],
  mode: MergeMode,
  onProgress?: (p: MergeProgress) => void,
): Promise<Blob> {
  // Constrói a lista de itens a baixar
  const items: { song: MergeSong; type: 'partitura' | 'letra' | 'cifra'; url: string }[] = []
  for (const song of songs) {
    if ((mode === 'partitura' || mode === 'both') && song.partitura_url)
      items.push({ song, type: 'partitura', url: song.partitura_url })
    if (mode === 'letra' && song.letra_url) items.push({ song, type: 'letra', url: song.letra_url })
    if ((mode === 'cifra' || mode === 'both') && song.cifra_url)
      items.push({ song, type: 'cifra', url: song.cifra_url })
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

  const merged = await PDFDocument.create()
  const bold = await merged.embedFont(StandardFonts.HelveticaBold)
  const regular = await merged.embedFont(StandardFonts.Helvetica)

  // ── Fase 1: construir páginas de conteúdo, rastreando índice ─

  const tocEntries: TocEntry[] = []
  let currentPageCount = 0
  let lastSongTitle = ''

  for (const { item, buf } of buffers) {
    const isFirstOfSong = item.song.title !== lastSongTitle
    lastSongTitle = item.song.title

    if (isFirstOfSong) {
      // Registra ponto de entrada para o índice
      tocEntries.push({
        title: item.song.title,
        partLabel: item.song.partLabel,
        separatorPageIndex: currentPageCount,
      })
      currentPageCount++

      // Página separadora principal
      const sep = merged.addPage([595, 842])
      const { width, height } = sep.getSize()
      sep.drawRectangle({ x: 0, y: height - 6, width, height: 6, color: PRIMARY })
      sep.drawRectangle({ x: 0, y: 0, width: 6, height, color: PRIMARY })
      sep.drawText(item.song.partLabel.toUpperCase(), {
        x: 60,
        y: height / 2 + 30,
        size: 12,
        font: regular,
        color: GRAY,
        maxWidth: width - 120,
      })
      const titleLines = wrapText(item.song.title, bold, 28, width - 120)
      let titleY = height / 2
      for (const line of titleLines) {
        sep.drawText(line, { x: 60, y: titleY, size: 28, font: bold, color: DARK })
        titleY -= 28 * 1.3
      }
      if (mode === 'both') {
        const typeLabel = item.type === 'partitura' ? 'Partitura' : 'Cifra'
        sep.drawText(typeLabel, { x: 60, y: titleY - 10, size: 12, font: regular, color: PRIMARY })
      }
    } else if (mode === 'both') {
      // Mini separador para segundo tipo (cifra após partitura)
      currentPageCount++
      const sep = merged.addPage([595, 842])
      const { width, height } = sep.getSize()
      sep.drawRectangle({ x: 0, y: height - 6, width, height: 6, color: PRIMARY })
      sep.drawRectangle({ x: 0, y: 0, width: 6, height, color: PRIMARY })
      sep.drawText(item.song.title, {
        x: 60,
        y: height / 2 + 10,
        size: 20,
        font: bold,
        color: DARK,
        maxWidth: width - 120,
      })
      sep.drawText(item.type === 'letra' ? 'Letra' : 'Cifra', {
        x: 60,
        y: height / 2 - 20,
        size: 12,
        font: regular,
        color: PRIMARY,
      })
    }

    // Copia páginas do PDF da música
    try {
      const srcDoc = await PDFDocument.load(buf, { ignoreEncryption: true })
      const indices = srcDoc.getPageIndices()
      const copied = await merged.copyPages(srcDoc, indices)
      copied.forEach((p) => merged.addPage(p))
      currentPageCount += indices.length
    } catch {
      currentPageCount++
      const errPage = merged.addPage([595, 842])
      errPage.drawText('Arquivo não pôde ser carregado.', {
        x: 60,
        y: errPage.getSize().height / 2,
        size: 14,
        font: regular,
        color: rgb(0.8, 0.2, 0.2),
      })
    }
  }

  // ── Fase 2: inserir páginas de índice no início ─────────────

  const ENTRIES_PER_PAGE = 16
  const tocPageCount = Math.max(1, Math.ceil(tocEntries.length / ENTRIES_PER_PAGE))

  const tocPages: PDFPage[] = []
  for (let i = 0; i < tocPageCount; i++) {
    tocPages.push(merged.insertPage(i, [595, 842]))
  }

  const allPages = merged.getPages()

  // ── Fase 3: desenhar índice e adicionar links GoTo ──────────

  for (let tpi = 0; tpi < tocPageCount; tpi++) {
    const tocPage = tocPages[tpi]
    if (!tocPage) continue
    const { width, height } = tocPage.getSize()

    // Decoração igual às páginas separadoras
    tocPage.drawRectangle({ x: 0, y: height - 6, width, height: 6, color: PRIMARY })
    tocPage.drawRectangle({ x: 0, y: 0, width: 6, height, color: PRIMARY })

    // Cabeçalho
    if (tpi === 0) {
      tocPage.drawText('ÍNDICE', { x: 60, y: height - 78, size: 30, font: bold, color: DARK })
      tocPage.drawText(MODE_LABEL[mode].toUpperCase(), {
        x: 60,
        y: height - 106,
        size: 9,
        font: regular,
        color: GRAY,
      })
      tocPage.drawLine({
        start: { x: 60, y: height - 118 },
        end: { x: width - 60, y: height - 118 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85),
      })
    } else {
      tocPage.drawText('ÍNDICE — continuação', {
        x: 60,
        y: height - 58,
        size: 10,
        font: regular,
        color: GRAY,
      })
      tocPage.drawLine({
        start: { x: 60, y: height - 70 },
        end: { x: width - 60, y: height - 70 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85),
      })
    }

    const pageEntries = tocEntries.slice(tpi * ENTRIES_PER_PAGE, (tpi + 1) * ENTRIES_PER_PAGE)
    const startY = tpi === 0 ? height - 142 : height - 88
    const ROW_H = 42

    const annotRefs: PDFRef[] = []

    for (let i = 0; i < pageEntries.length; i++) {
      const entry = pageEntries[i]
      if (!entry) continue

      const actualPageIndex = entry.separatorPageIndex + tocPageCount
      const targetPage = allPages[actualPageIndex]
      if (!targetPage) continue

      const rowY = startY - i * ROW_H
      const displayNum = String(actualPageIndex + 1)

      // Fundo alternado sutil para facilitar leitura
      if (i % 2 === 0) {
        tocPage.drawRectangle({
          x: 50,
          y: rowY - 10,
          width: width - 100,
          height: ROW_H - 2,
          color: rgb(0.97, 0.97, 0.99),
        })
      }

      // Parte litúrgica (pequena, cinza, acima do título)
      tocPage.drawText(entry.partLabel.toUpperCase(), {
        x: 60,
        y: rowY + 16,
        size: 8,
        font: regular,
        color: GRAY,
      })

      // Título (truncado se necessário)
      const maxTitleW = width - 170
      const title = truncateText(entry.title, bold, 13, maxTitleW)
      tocPage.drawText(title, { x: 60, y: rowY, size: 13, font: bold, color: DARK })

      // Número de página (azul, à direita)
      const numW = bold.widthOfTextAtSize(displayNum, 12)
      tocPage.drawText(displayNum, {
        x: width - 60 - numW,
        y: rowY,
        size: 12,
        font: bold,
        color: PRIMARY,
      })

      // Linha pontilhada entre título e número
      const titleW = bold.widthOfTextAtSize(title, 13)
      const lineX1 = 60 + titleW + 8
      const lineX2 = width - 60 - numW - 8
      if (lineX2 > lineX1 + 10) {
        tocPage.drawLine({
          start: { x: lineX1, y: rowY + 5 },
          end: { x: lineX2, y: rowY + 5 },
          thickness: 0.5,
          color: LIGHT,
          dashArray: [1.5, 3.5],
        })
      }

      // Anotação de link clicável (linha inteira)
      annotRefs.push(createLinkAnnot(merged, targetPage, [50, rowY - 10, width - 50, rowY + 26]))
    }

    // Registra Annots na página de índice
    if (annotRefs.length > 0) {
      const annotsArr = PDFArray.withContext(merged.context)
      annotRefs.forEach((ref) => annotsArr.push(ref))
      tocPage.node.set(PDFName.of('Annots'), annotsArr)
    }
  }

  const pdfBytes = await merged.save()
  return new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
}
