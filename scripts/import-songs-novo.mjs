import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { parse } from 'csv-parse/sync'
import { config } from 'dotenv'
config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const TEAM_ID = process.env.IMPORT_TEAM_ID
const PDF_BASE_DIR = 'C:\\codigos'
const BUCKET = 'song-files'

const PART_MAP = [
  [/entrada/i, 'entrada'],
  [/ato\s*penitencial/i, 'ato_penitencial'],
  [/gl[oó]ria|hino\s*de\s*louvor/i, 'hino_de_louvor'],
  [/salmo/i, 'salmo'],
  [/sequ[eê]ncia/i, 'sequencia'],
  [/aclama[cç][aã]o|aleluia/i, 'aclamacao'],
  [/ofert[oó]rio|oferendas/i, 'ofertorio'],
  [/santo/i, 'santo'],
  [/cordeiro/i, 'cordeiro'],
  [/comunh[aã]o/i, 'comunhao'],
  [/p[oó]s.?comunh[aã]o/i, 'pos_comunhao'],
  [/final|sa[ií]da|louvor\s*final/i, 'final'],
]

function extractParts(title) {
  const parts = new Set()
  for (const [, inner] of [...title.matchAll(/\(([^)]+)\)/g)])
    for (const [pattern, value] of PART_MAP)
      if (pattern.test(inner)) parts.add(value)
  return [...parts]
}

function cleanTitle(title) {
  return title.replace(/\s*\([^)]*\)/g, '').trim() || title.trim()
}

function buildArtist(melodia, letra) {
  const parts = [melodia?.trim(), letra?.trim()].filter(Boolean)
  if (!parts.length) return null
  if (parts.length === 2 && parts[0] === parts[1]) return parts[0]
  return parts.join(', ')
}

async function pLimit(tasks, concurrency) {
  const results = []
  let index = 0
  async function worker() {
    while (index < tasks.length) { const i = index++; results[i] = await tasks[i]() }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

const CSV_PATH = 'C:\\codigos\\cantos\\cantos_novo.csv'
const raw = readFileSync(CSV_PATH, 'utf-8')
const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true, bom: true })

// Filtro: exatamente 4 caracteres E >= 1263
const filtered = rows.filter(row => {
  const num = String(row['Numero'] ?? '').trim()
  return num.length === 4 && parseInt(num) >= 1263
})

console.log(`📄 Total no CSV: ${rows.length} | Válidos (4 chars >= 1263): ${filtered.length}`)

const songs = filtered.map(row => {
  const rawTitle = row['Titulo'] ?? ''
  return {
    dbPayload: {
      team_id: TEAM_ID,
      title: cleanTitle(rawTitle),
      artist: buildArtist(row['Compositor_Melodia'], row['Compositor_Letra']),
      key: null,
      origin: 'arquidiocese',
      book_number: String(row['Numero']).trim().padStart(4, '0'),
      suggested_parts: extractParts(rawTitle),
      suggested_seasons: [],
      audio_url: null, partitura_url: null, letra_url: null, cifra_url: null, created_by: null,
    },
    pdfRelPath: row['Arquivo']?.trim() ?? null,
  }
})

console.log('\n📋 Amostra dos primeiros 3:')
songs.slice(0, 3).forEach(({ dbPayload: s }, i) =>
  console.log(`  [${i+1}] "${s.title}" | nº${s.book_number} | artista: ${s.artist ?? '—'} | partes: [${s.suggested_parts.join(', ')}]`)
)

// FASE 1 — Inserção
console.log(`\n🚀 FASE 1 — Inserindo ${songs.length} músicas...`)
const insertedSongs = []
const BATCH = 50
for (let i = 0; i < songs.length; i += BATCH) {
  const batch = songs.slice(i, i + BATCH)
  const { data, error } = await supabase.from('songs').insert(batch.map(s => s.dbPayload)).select('id')
  if (error) { console.error(`\n❌ Erro lote ${Math.floor(i/BATCH)+1}:`, error.message); continue }
  data.forEach((song, idx) => insertedSongs.push({ id: song.id, pdfRelPath: batch[idx].pdfRelPath }))
  process.stdout.write(`\r   ✅ ${insertedSongs.length}/${songs.length} inseridas...`)
}
console.log(`\n   Total inserido: ${insertedSongs.length}`)

// FASE 2 — Upload PDFs
const withPdf = insertedSongs.filter(s => s.pdfRelPath)
console.log(`\n📤 FASE 2 — Upload de ${withPdf.length} PDFs (5 em paralelo)...`)
let uploaded = 0, uploadErrors = 0

const tasks = withPdf.map(({ id, pdfRelPath }) => async () => {
  const localPath = join(PDF_BASE_DIR, pdfRelPath)
  if (!existsSync(localPath)) { uploadErrors++; return }
  const fileBuffer = readFileSync(localPath)
  const storagePath = `${TEAM_ID}/${id}/partitura.pdf`
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, fileBuffer, { contentType: 'application/pdf', upsert: true })
  if (upErr) { uploadErrors++; return }
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  await supabase.from('songs').update({ partitura_url: urlData.publicUrl }).eq('id', id)
  uploaded++
  process.stdout.write(`\r   ✅ ${uploaded}/${withPdf.length} PDFs enviados...`)
})

await pLimit(tasks, 5)

console.log('\n\n' + '═'.repeat(50))
console.log('✅  Importação concluída!')
console.log(`   Músicas inseridas : ${insertedSongs.length} / ${songs.length}`)
console.log(`   PDFs enviados     : ${uploaded} / ${withPdf.length}`)
if (uploadErrors > 0) console.log(`   Erros de upload  : ${uploadErrors}`)
console.log('═'.repeat(50))
