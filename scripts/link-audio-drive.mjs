/**
 * Script: link-audio-drive.mjs
 *
 * Lista os arquivos de áudio na pasta do Google Drive e atualiza
 * o campo audio_url nas músicas correspondentes no Supabase.
 *
 * Lógica de matching:
 *   - "1263.mp3"     → todas as músicas com book_number = "1263"
 *   - "1227 - a.mp3" → música com book_number = "1227" cujo título começa com "a" (minúsculo)
 *   - "042.mp3"      → música(s) com book_number = "0042"
 *
 * Pré-requisitos no .env:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   IMPORT_TEAM_ID
 *   GOOGLE_API_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config()

const SUPABASE_URL     = process.env.VITE_SUPABASE_URL
const SERVICE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY
const TEAM_ID          = process.env.IMPORT_TEAM_ID
const GOOGLE_API_KEY   = process.env.GOOGLE_API_KEY
const FOLDER_ID        = '1ezTUC0r9fv9r1TR3OeZKrmtl4g09lpR1'

if (!SUPABASE_URL || !SERVICE_KEY || !TEAM_ID || !GOOGLE_API_KEY) {
  console.error('\n❌  Variáveis faltando no .env:')
  if (!SUPABASE_URL)   console.error('   - VITE_SUPABASE_URL')
  if (!SERVICE_KEY)    console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  if (!TEAM_ID)        console.error('   - IMPORT_TEAM_ID')
  if (!GOOGLE_API_KEY) console.error('   - GOOGLE_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// ── 1. Listar arquivos do Google Drive ───────────────────────────────────────

async function listDriveFiles() {
  const files = []
  let pageToken = null

  do {
    const params = new URLSearchParams({
      q: `'${FOLDER_ID}' in parents and trashed = false`,
      key: GOOGLE_API_KEY,
      fields: 'nextPageToken, files(id, name)',
      pageSize: '1000',
      orderBy: 'name',
    })
    if (pageToken) params.set('pageToken', pageToken)

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`)
    if (!res.ok) {
      const err = await res.json()
      throw new Error(`Drive API error: ${err.error?.message ?? res.statusText}`)
    }

    const json = await res.json()
    files.push(...(json.files ?? []))
    pageToken = json.nextPageToken ?? null
  } while (pageToken)

  return files
}

// ── 2. Parsear nome do arquivo ───────────────────────────────────────────────

/**
 * Parseia o nome do arquivo e retorna { number, letter }.
 *
 * Exemplos:
 *   "0001.mp3"     → { number: 1,    letter: null }
 *   "042.mp3"      → { number: 42,   letter: null }
 *   "1263.mp3"     → { number: 1263, letter: null }
 *   "1227 - a.mp3" → { number: 1227, letter: 'a'  }
 *   "1227 - b.mp3" → { number: 1227, letter: 'b'  }
 */
function parseFileName(name) {
  // com letra: "1227 - a.mp3"
  const withLetter = name.match(/^(\d+)\s*-\s*([a-z])\.[^.]+$/i)
  if (withLetter) {
    return { number: parseInt(withLetter[1], 10), letter: withLetter[2].toLowerCase() }
  }

  // sem letra: "0001.mp3" ou "1263.mp3"
  const plain = name.match(/^(\d+)\.[^.]+$/)
  if (plain) {
    return { number: parseInt(plain[1], 10), letter: null }
  }

  return null // arquivo com nome não reconhecido
}

/**
 * Monta a URL de áudio do Google Drive.
 * O formato /uc?id=... permite reprodução direta no browser.
 */
function driveAudioUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/view`
}

// ── 3. Buscar músicas do Supabase ────────────────────────────────────────────

async function fetchAllSongs() {
  const PAGE = 1000
  const all = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('songs')
      .select('id, title, book_number')
      .eq('team_id', TEAM_ID)
      .not('book_number', 'is', null)
      .range(from, from + PAGE - 1)

    if (error) throw error
    all.push(...(data ?? []))
    if (!data || data.length < PAGE) break
    from += PAGE
  }

  return all
}

// ── 4. Main ──────────────────────────────────────────────────────────────────

console.log('🎵  Iniciando link de áudios do Google Drive...\n')

// Busca arquivos e músicas em paralelo
const [driveFiles, songs] = await Promise.all([
  listDriveFiles(),
  fetchAllSongs(),
])

console.log(`📁  ${driveFiles.length} arquivo(s) encontrado(s) no Drive`)
console.log(`🎶  ${songs.length} música(s) no banco\n`)

// Índice: book_number (como inteiro) → array de músicas
const songsByNumber = new Map()
for (const song of songs) {
  const num = parseInt(song.book_number, 10)
  if (isNaN(num)) continue
  if (!songsByNumber.has(num)) songsByNumber.set(num, [])
  songsByNumber.get(num).push(song)
}

// Processa cada arquivo do Drive
let matched = 0
let skipped = 0
const notFound = []

for (const file of driveFiles) {
  const parsed = parseFileName(file.name)

  if (!parsed) {
    console.log(`⚠️   Ignorado (nome não reconhecido): ${file.name}`)
    skipped++
    continue
  }

  const { number, letter } = parsed
  const candidates = songsByNumber.get(number) ?? []

  if (candidates.length === 0) {
    notFound.push(file.name)
    continue
  }

  const audioUrl = driveAudioUrl(file.id)
  let targets = []

  if (letter === null) {
    // Sem letra → atualiza todas as músicas com esse número
    targets = candidates
  } else {
    // Com letra → encontra a música cujo título começa com essa letra (minúsculo)
    targets = candidates.filter((s) => s.title.charAt(0) === letter)

    if (targets.length === 0) {
      // Fallback: ignora case
      targets = candidates.filter((s) => s.title.charAt(0).toLowerCase() === letter)
    }

    if (targets.length === 0) {
      notFound.push(file.name)
      console.log(`⚠️   Sem match para "${file.name}" (nº ${number}, letra "${letter}")`)
      continue
    }
  }

  // Atualiza no Supabase
  const ids = targets.map((s) => s.id)
  const { error } = await supabase
    .from('songs')
    .update({ audio_url: audioUrl })
    .in('id', ids)

  if (error) {
    console.error(`❌  Erro ao atualizar nº ${number}: ${error.message}`)
    skipped++
  } else {
    matched += targets.length
    const titulos = targets.map((s) => `"${s.title}"`).join(', ')
    process.stdout.write(`\r   ✅  ${matched} link(s) atribuídos...`)
    if (targets.length > 1 || letter !== null) {
      console.log(`\n      nº${number}${letter ? ` -${letter}` : ''} → ${titulos}`)
    }
  }
}

// ── Resumo ───────────────────────────────────────────────────────────────────
console.log('\n\n' + '═'.repeat(55))
console.log('✅  Concluído!')
console.log(`   Links atribuídos  : ${matched}`)
console.log(`   Arquivos ignorados: ${skipped}`)
console.log(`   Sem correspondência: ${notFound.length}`)
if (notFound.length > 0) {
  console.log('\n   Arquivos sem match no banco:')
  notFound.forEach((n) => console.log(`     - ${n}`))
}
console.log('═'.repeat(55))
