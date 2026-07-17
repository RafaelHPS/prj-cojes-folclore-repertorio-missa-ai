import { PDFDocument } from 'pdf-lib'

const IMAGE_EXT_REGEX = /\.(png|jpe?g)$/i

function isPngFile(file: File): boolean {
  return file.type === 'image/png' || /\.png$/i.test(file.name)
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || IMAGE_EXT_REGEX.test(file.name)
}

/**
 * Converte um arquivo de imagem (PNG/JPG) em um PDF de página única, preservando
 * as dimensões originais. Arquivos que não são imagem são retornados sem alteração.
 *
 * Necessário porque a mesclagem de PDFs da missa (mergeMassPdfs) só sabe ler
 * páginas de um PDFDocument — uma imagem enviada diretamente seria ignorada
 * com uma página de erro no lugar.
 */
export async function convertImageToPdfIfNeeded(file: File): Promise<File> {
  if (!isImageFile(file)) return file

  const bytes = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.create()
  const image = isPngFile(file) ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)

  const { width, height } = image.size()
  const page = pdfDoc.addPage([width, height])
  page.drawImage(image, { x: 0, y: 0, width, height })

  const pdfBytes = await pdfDoc.save()
  const fileName = `${file.name.replace(/\.[^.]+$/, '')}.pdf`
  return new File([pdfBytes as BlobPart], fileName, { type: 'application/pdf' })
}
