import { PDFDocument } from 'pdf-lib'

const IMAGE_EXT_REGEX = /\.(png|jpe?g)$/i

// A4 retrato em pontos PDF (padrão usado em todo o merge de PDFs da missa)
const A4_WIDTH = 595
const A4_HEIGHT = 842
const MARGIN = 20

function isPngFile(file: File): boolean {
  return file.type === 'image/png' || /\.png$/i.test(file.name)
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || IMAGE_EXT_REGEX.test(file.name)
}

/**
 * Calcula largura/altura da imagem ajustada (contain) dentro da área disponível,
 * preservando a proporção original.
 */
function fitWithinArea(
  imgWidth: number,
  imgHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight)
  return { width: imgWidth * scale, height: imgHeight * scale }
}

/**
 * Converte um arquivo de imagem (PNG/JPG) em um PDF de página única A4 retrato,
 * com a imagem centralizada e ajustada à página (mantendo a proporção original).
 * Arquivos que não são imagem são retornados sem alteração.
 *
 * Necessário porque a mesclagem de PDFs da missa (mergeMassPdfs) só sabe ler
 * páginas de um PDFDocument — uma imagem enviada diretamente seria ignorada
 * com uma página de erro no lugar. A página A4 fixa mantém a consistência
 * visual com as demais páginas do PDF mesclado.
 */
export async function convertImageToPdfIfNeeded(file: File): Promise<File> {
  if (!isImageFile(file)) return file

  const bytes = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.create()
  const image = isPngFile(file) ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)

  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
  const { width, height } = fitWithinArea(
    image.width,
    image.height,
    A4_WIDTH - MARGIN * 2,
    A4_HEIGHT - MARGIN * 2,
  )
  page.drawImage(image, {
    x: (A4_WIDTH - width) / 2,
    y: (A4_HEIGHT - height) / 2,
    width,
    height,
  })

  const pdfBytes = await pdfDoc.save()
  const fileName = `${file.name.replace(/\.[^.]+$/, '')}.pdf`
  return new File([pdfBytes as BlobPart], fileName, { type: 'application/pdf' })
}
