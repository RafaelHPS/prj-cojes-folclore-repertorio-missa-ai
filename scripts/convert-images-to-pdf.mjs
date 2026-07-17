/**
 * Script: convert-images-to-pdf.mjs
 *
 * Conversão retroativa: para cada música que tem partitura/letra/cifra
 * salva como imagem (PNG/JPG), baixa o arquivo, converte para PDF de
 * página única (mesmas dimensões da imagem) e faz upload como um novo
 * arquivo `${type}.pdf` no Storage, atualizando o campo correspondente
 * na tabela `songs`.
 *
 * Não deleta os arquivos de imagem originais no Storage — eles ficam
 * órfãos (sem referência no banco) como backup de segurança. Podem ser
 * removidos manualmente depois de conferir que a conversão está OK.
 *
 * Pré-requisitos no .env:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { PDFDocument } from 'pdf-lib'
import { config } from 'dotenv'
config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = 'song-files'
const FILE_TYPES = ['partitura', 'letra', 'cifra']
const IMAGE_EXT_REGEX = /\.(png|jpe?g)$/i

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('\n❌  Variáveis faltando no .env:')
  if (!SUPABASE_URL) console.error('   - VITE_SUPABASE_URL')
  if (!SERVICE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// ── 1. Buscar todas as músicas (todas as equipes) ────────────────────────────

async function fetchAllSongs() {
  const PAGE = 1000
  const all = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('songs')
      .select('id, team_id, title, partitura_url, letra_url, cifra_url')
      .range(from, from + PAGE - 1)

    if (error) throw error
    all.push(...(data ?? []))
    if (!data || data.length < PAGE) break
    from += PAGE
  }

  return all
}

// ── 2. Utilitários ────────────────────────────────────────────────────────────

function cleanUrl(url) {
  return url.split('?')[0]
}

function isImageUrl(url) {
  return IMAGE_EXT_REGEX.test(cleanUrl(url))
}

function isPngUrl(url) {
  return /\.png$/i.test(cleanUrl(url))
}

async function convertImageUrlToPdfBytes(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Falha ao baixar imagem: HTTP ${res.status}`)
  const bytes = new Uint8Array(await res.arrayBuffer())

  const pdfDoc = await PDFDocument.create()
  const image = isPngUrl(url) ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)
  const { width, height } = image.size()
  const page = pdfDoc.addPage([width, height])
  page.drawImage(image, { x: 0, y: 0, width, height })

  return pdfDoc.save()
}

// ── 3. Main ───────────────────────────────────────────────────────────────────

console.log('🖼️   Iniciando conversão retroativa de imagens para PDF...\n')

const songs = await fetchAllSongs()
console.log(`🎶  ${songs.length} música(s) no banco\n`)

let converted = 0
let skipped = 0
let errors = 0
const errorDetails = []

for (const song of songs) {
  for (const type of FILE_TYPES) {
    const field = `${type}_url`
    const url = song[field]

    if (!url || !isImageUrl(url)) continue

    try {
      const pdfBytes = await convertImageUrlToPdfBytes(url)
      const path = `${song.team_id}/${song.id}/${type}.pdf`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, pdfBytes, { upsert: true, contentType: 'application/pdf' })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path)

      const { error: updateError } = await supabase
        .from('songs')
        .update({ [field]: publicUrlData.publicUrl })
        .eq('id', song.id)

      if (updateError) throw updateError

      converted++
      process.stdout.write(`\r   ✅  ${converted} arquivo(s) convertido(s)...`)
    } catch (err) {
      errors++
      errorDetails.push(`"${song.title}" (${type}): ${err.message ?? err}`)
    }
  }
}

// ── Resumo ────────────────────────────────────────────────────────────────────
console.log('\n\n' + '═'.repeat(55))
console.log('✅  Concluído!')
console.log(`   Convertidos : ${converted}`)
console.log(`   Ignorados   : ${skipped} (já não eram imagem)`)
console.log(`   Erros       : ${errors}`)
if (errorDetails.length > 0) {
  console.log('\n   Detalhes dos erros:')
  errorDetails.forEach((e) => console.log(`     - ${e}`))
}
console.log('\n   ℹ️   As imagens originais NÃO foram apagadas do Storage —')
console.log('      ficaram órfãs (sem referência no banco) como backup.')
console.log('═'.repeat(55))
