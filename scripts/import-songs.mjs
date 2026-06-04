/**
 * Script de importação em massa do CSV do livro da Arquidiocese
 * para a tabela `songs` do Supabase, com upload dos PDFs como partitura.
 *
 * Como usar:
 *   1. Adicione no .env:
 *        SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
 *        IMPORT_TEAM_ID=uuid-da-equipe-destino
 *   2. Coloque o cantos.csv na pasta scripts/
 *   3. Execute: node scripts/import-songs.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { parse } from 'csv-parse/sync'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { config } from 'dotenv'

config()

// ── Configuração ──────────────────────────────────────────────────────────────

const SUPABASE_URL      = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const TEAM_ID           = process.env.IMPORT_TEAM_ID
const PDF_BASE_DIR      = 'C:\\codigos'        // pasta pai de cantos/
const BUCKET            = 'song-files'
const BATCH_SIZE        = 50                   // inserções por lote
const UPLOAD_CONCURRENCY = 5                   // PDFs em paralelo

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !TEAM_ID) {
  console.error('\n❌  Variáveis faltando no .env:')
  if (!SUPABASE_URL)       console.error('   - VITE_SUPABASE_URL')
  if (!SERVICE_ROLE_KEY)   console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  if (!TEAM_ID)            console.error('   - IMPORT_TEAM_ID')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ── Mapeamento de partes da missa ─────────────────────────────────────────────

const PART_MAP = [
  [/entrada/i,                      'entrada'],
  [/ato\s*penitencial/i,            'ato_penitencial'],
  [/gl[oó]ria|hino\s*de\s*louvor/i,'hino_de_louvor'],
  [/salmo/i,                        'salmo'],
  [/sequ[eê]ncia/i,                 'sequencia'],
  [/aclama[cç][aã]o|aleluia/i,      'aclamacao'],
  [/ofert[oó]rio|oferendas/i,       'ofertorio'],
  [/santo/i,                        'santo'],
  [/cordeiro/i,                     'cordeiro'],
  [/comunh[aã]o/i,                  'comunhao'],
  [/p[oó]s.?comunh[aã]o/i,         'pos_comunhao'],
  [/final|sa[ií]da|louvor\s*final/i,'final'],
]

function extractParts(title) {
  const parts = new Set()
  for (const [, inner] of [...title.matchAll(/\(([^)]+)\)/g)]) {
    for (const [pattern, value] of PART_MAP) {
      if (pattern.test(inner)) parts.add(value)
    }
  }
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

// ── Utilitário de concorrência ────────────────────────────────────────────────

async function pLimit(tasks, concurrency) {
  const results = []
  let index = 0

  async function worker() {
    while (index < tasks.length) {
      const i = index++
      results[i] = await tasks[i]()
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

// ── Leitura do CSV ────────────────────────────────────────────────────────────

const __dir   = dirname(fileURLToPath(import.meta.url))
const csvPath = join(__dir, 'cantos.csv')

if (!existsSync(csvPath)) {
  console.error(`\n❌  CSV não encontrado em: ${csvPath}`)
  console.error('   Copie o arquivo cantos.csv para a pasta scripts/')
  process.exit(1)
}

const rows = parse(readFileSync(csvPath, 'utf-8'), {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  bom: true,
})

console.log(`\n📄  ${rows.length} cantos encontrados no CSV`)

// ── Transformação ─────────────────────────────────────────────────────────────

const songs = rows.map((row) => {
  const rawTitle = row['Titulo'] ?? ''
  return {
    // dados para o banco
    dbPayload: {
      team_id:           TEAM_ID,
      title:             cleanTitle(rawTitle),
      artist:            buildArtist(row['Compositor_Melodia'], row['Compositor_Letra']),
      key:               null,
      origin:            'arquidiocese',
      book_number:       String(row['Numero'] ?? '').trim() || null,
      suggested_parts:   extractParts(rawTitle),
      suggested_seasons: [],
      audio_url:         null,
      partitura_url:     null,
      letra_url:         null,
      cifra_url:         null,
      created_by:        null,
    },
    // caminho local do PDF (ex: "cantos/1_Não_há_medo_Entrada.pdf")
    pdfRelPath: row['Arquivo']?.trim() ?? null,
  }
})

// Preview
console.log('\n📋  Amostra dos primeiros 3 registros:')
songs.slice(0, 3).forEach(({ dbPayload: s, pdfRelPath }, i) => {
  const pdfExists = pdfRelPath && existsSync(join(PDF_BASE_DIR, pdfRelPath))
  console.log(
    `  [${i + 1}] "${s.title}" | nº${s.book_number} | artista: ${s.artist ?? '—'} | partes: [${s.suggested_parts.join(', ')}] | PDF: ${pdfExists ? '✅' : '❌ não encontrado'}`,
  )
})

// ── FASE 1 — Inserção em lote ─────────────────────────────────────────────────

console.log(`\n🚀  FASE 1 — Inserindo ${songs.length} músicas em lotes de ${BATCH_SIZE}...`)

const insertedSongs = [] // [{ id, pdfRelPath }]

for (let i = 0; i < songs.length; i += BATCH_SIZE) {
  const batch = songs.slice(i, i + BATCH_SIZE)

  const { data, error } = await supabase
    .from('songs')
    .insert(batch.map((s) => s.dbPayload))
    .select('id, book_number, title')

  if (error) {
    console.error(`\n❌  Erro no lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message)
    continue
  }

  // associa os IDs retornados com os PDFs usando a mesma ordem
  data.forEach((song, idx) => {
    insertedSongs.push({ id: song.id, pdfRelPath: batch[idx].pdfRelPath })
  })

  const pct = Math.round(((i + batch.length) / songs.length) * 100)
  process.stdout.write(`\r   ✅  ${insertedSongs.length} inseridas... ${pct}%`)
}

console.log(`\n   Total inserido: ${insertedSongs.length}`)

// ── FASE 2 — Upload dos PDFs ──────────────────────────────────────────────────

const withPdf = insertedSongs.filter((s) => s.pdfRelPath)
console.log(`\n📤  FASE 2 — Upload de ${withPdf.length} PDFs (${UPLOAD_CONCURRENCY} em paralelo)...`)

let uploaded = 0
let uploadErrors = 0

const uploadTasks = withPdf.map(({ id, pdfRelPath }) => async () => {
  const localPath = join(PDF_BASE_DIR, pdfRelPath)

  if (!existsSync(localPath)) {
    process.stdout.write(`\r   ⚠️  PDF não encontrado: ${pdfRelPath}`)
    uploadErrors++
    return
  }

  const fileBuffer = readFileSync(localPath)
  const storagePath = `${TEAM_ID}/${id}/partitura.pdf`

  // upload para o bucket
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    process.stdout.write(`\r   ❌  Erro no upload de ${pdfRelPath}: ${uploadError.message}`)
    uploadErrors++
    return
  }

  // pega a URL pública
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

  // atualiza partitura_url na música
  const { error: updateError } = await supabase
    .from('songs')
    .update({ partitura_url: urlData.publicUrl })
    .eq('id', id)

  if (updateError) {
    uploadErrors++
    return
  }

  uploaded++
  process.stdout.write(`\r   ✅  ${uploaded}/${withPdf.length} PDFs enviados...`)
})

await pLimit(uploadTasks, UPLOAD_CONCURRENCY)

// ── Resumo Final ──────────────────────────────────────────────────────────────

console.log('\n')
console.log('═'.repeat(50))
console.log('✅  Importação concluída!')
console.log(`   Músicas inseridas : ${insertedSongs.length} / ${songs.length}`)
console.log(`   PDFs enviados     : ${uploaded} / ${withPdf.length}`)
if (uploadErrors > 0) console.log(`   Erros de upload  : ${uploadErrors}`)
console.log('═'.repeat(50))
