/**
 * Importa os salmos do Livro dos Salmos a partir do CSV corrigido
 * (fix-salmos-csv.py) e dos PDFs montados (build-salmos-pdfs.py).
 *
 * Pula as músicas cujo número no livro já existe na equipe com origem "salmos",
 * então é seguro rodar de novo.
 *
 * Uso:
 *   node scripts/import-salmos.mjs <salmos_corrigido.csv> <pasta_dos_pdfs> [--apply]
 *
 * Sem --apply roda em modo simulação, só listando o que seria criado.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { parse } from 'csv-parse/sync'
import { config } from 'dotenv'
config()

const BUCKET = 'song-files'
const BATCH = 50
const UPLOAD_CONCURRENCY = 5

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  },
)
const TEAM_ID = process.env.IMPORT_TEAM_ID

/**
 * Regras avaliadas em ordem: a primeira que casar define o tempo litúrgico.
 * Solenidades que caem fora do tempo do domingo (Trindade, Corpus Christi, Sagrado
 * Coração, Cristo Rei) vão para "outros", como já é feito nas missas e nos salmos
 * cadastrados. Semana Santa fica em Quaresma, pois o app não tem Tríduo.
 */
const SEASON_RULES = [
  [/RAMOS|SEMANA SANTA|PAIXÃO DO SENHOR|QUARESMA/, 'quaresma'],
  [
    /DEPOIS DE PENTECOSTES|SANTÍSSIMA TRINDADE|SS\. TRINDADE|CORPO E SANGUE|REI DO UNIVERSO/,
    'outros',
  ],
  [/PENTECOSTES/, 'pentecostes'],
  [/PÁSCOA|ASCENSÃO/, 'pascoa'],
  [/ADVENTO/, 'advento'],
  [/NATAL|SAGRADA FAMÍLIA|SANTA MÃE DE DEUS|EPIFANIA|BATISMO DO SENHOR/, 'natal'],
  [/TEMPO COMUM/, 'tempo_comum'],
]

function resolveSeason(title) {
  const upper = title.toUpperCase()
  for (const [pattern, season] of SEASON_RULES) {
    if (pattern.test(upper)) return season
  }
  return 'outros'
}

/** As 9 sequências estão no livro dos salmos, mas não são salmo responsorial. */
function resolvePart(title) {
  return /SEQU[EÊ]NCIA|SEQÜÊNCIA/i.test(title) ? 'sequencia' : 'salmo'
}

function readRows(csvPath, pdfDir) {
  const content = readFileSync(csvPath, 'utf8').replace(/^﻿/, '')
  const records = parse(content, {
    delimiter: ';',
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  return records.map((record) => ({
    numero: record.numero,
    pdfPath: join(pdfDir, `${record.numero}.pdf`),
    payload: {
      team_id: TEAM_ID,
      title: record.titulo,
      artist: record.compositor || null,
      key: null,
      origin: 'salmos',
      book_number: String(parseInt(record.pagina_livro, 10)),
      suggested_parts: [resolvePart(record.titulo)],
      suggested_seasons: [resolveSeason(record.titulo)],
    },
  }))
}

async function fetchExistingBookNumbers() {
  const { data, error } = await supabase
    .from('songs')
    .select('book_number')
    .eq('team_id', TEAM_ID)
    .eq('origin', 'salmos')

  if (error) throw error
  return new Set(data.map((song) => String(parseInt(song.book_number, 10))))
}

async function runPool(items, worker) {
  let cursor = 0
  async function next() {
    while (cursor < items.length) {
      const item = items[cursor++]
      await worker(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, items.length) }, next))
}

function summarize(rows) {
  const count = (key, pick) =>
    rows.reduce((acc, r) => ((acc[pick(r)] = (acc[pick(r)] ?? 0) + 1), acc), {})
  console.log(
    'momento :',
    count('part', (r) => r.payload.suggested_parts[0]),
  )
  console.log(
    'tempo   :',
    count('season', (r) => r.payload.suggested_seasons[0]),
  )
  console.log(
    'autor   :',
    count('artist', (r) => r.payload.artist),
  )
}

async function main() {
  const [csvPath, pdfDir] = process.argv.slice(2)
  const isDryRun = !process.argv.includes('--apply')

  if (!csvPath || !pdfDir) throw new Error('Informe o CSV corrigido e a pasta dos PDFs.')
  if (!TEAM_ID) throw new Error('IMPORT_TEAM_ID não configurado no .env')

  const rows = readRows(csvPath, pdfDir)
  const missingPdf = rows.filter((r) => !existsSync(r.pdfPath))
  if (missingPdf.length > 0) {
    throw new Error(`PDF ausente para: ${missingPdf.map((r) => r.numero).join(', ')}`)
  }

  const existing = await fetchExistingBookNumbers()
  const pending = rows.filter((r) => !existing.has(r.payload.book_number))
  const skipped = rows.filter((r) => existing.has(r.payload.book_number))

  console.log(
    `${rows.length} linhas | ${skipped.length} já cadastradas (puladas) | ${pending.length} a criar`,
  )
  console.log(`puladas (nº no livro): ${skipped.map((r) => r.payload.book_number).join(', ')}\n`)
  summarize(pending)

  console.log('\namostra:')
  console.table(
    pending.slice(0, 8).map((r) => ({
      nº: r.payload.book_number,
      titulo: r.payload.title.slice(0, 50),
      momento: r.payload.suggested_parts[0],
      tempo: r.payload.suggested_seasons[0],
      autor: r.payload.artist,
    })),
  )

  if (isDryRun) {
    console.log('\nSimulação — rode novamente com --apply para gravar.')
    return
  }

  console.log(`\nFASE 1 — inserindo ${pending.length} músicas...`)
  const inserted = []
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH)
    const { data, error } = await supabase
      .from('songs')
      .insert(batch.map((r) => r.payload))
      .select('id, book_number')
    if (error) throw error

    const pdfByBook = new Map(batch.map((r) => [r.payload.book_number, r.pdfPath]))
    for (const song of data)
      inserted.push({ id: song.id, pdfPath: pdfByBook.get(song.book_number) })
    process.stdout.write(`\r   ${inserted.length}/${pending.length} inseridas...`)
  }

  console.log(`\n\nFASE 2 — enviando ${inserted.length} partituras...`)
  const failures = []
  let uploaded = 0
  await runPool(inserted, async ({ id, pdfPath }) => {
    const path = `${TEAM_ID}/${id}/partitura.pdf`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, readFileSync(pdfPath), { contentType: 'application/pdf', upsert: true })
    if (uploadError) return failures.push({ id, erro: uploadError.message })

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const { error: updateError } = await supabase
      .from('songs')
      .update({ partitura_url: urlData.publicUrl })
      .eq('id', id)
    if (updateError) return failures.push({ id, erro: updateError.message })

    uploaded++
    process.stdout.write(`\r   ${uploaded}/${inserted.length} partituras enviadas...`)
  })

  console.log(`\n\n${inserted.length} salmos criados, ${uploaded} partituras vinculadas.`)
  if (failures.length > 0) {
    console.log('Falhas no envio (música criada, partitura pendente):')
    console.table(failures)
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
