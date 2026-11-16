/**
 * Grava as letras extraídas do "Cantai ao Senhor" (scripts/letras-cantai/*.json)
 * na coluna `songs.lyrics` (supabase/migration_song_lyrics.sql).
 *
 * A música do app é encontrada pelo número no livro. Quando o número tem mais de
 * uma música (ex.: 1155 a…n, 646 e 646 B), o título desempata.
 *
 * Uso:
 *   node scripts/import-lyrics.mjs [--apply] [--overwrite]
 *
 * Sem --apply roda em modo simulação, só listando o que seria gravado.
 * Sem --overwrite pula músicas que já têm letra (seguro rodar de novo).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { config } from 'dotenv'
config()

const LYRICS_PATH = 'scripts/letras-cantai/letras-cantai-ao-senhor.json'
// "cojes" usa a numeração de outro livro; só "arquidiocese" é o Cantai ao Senhor.
const BOOK_ORIGINS = ['arquidiocese']
const CONCURRENCY = 8

const withLabel = (label, type) => (section) => ({ ...section, label, type: type ?? section.type })
const dropSuffix = (suffix) => (section) => ({
  ...section,
  label: section.label?.replace(suffix, '') ?? null,
})

/**
 * Páginas do livro que o app cadastrou como músicas separadas. Cada parte vira
 * uma entrada própria, encontrada pelo título (ou pela letra, em "1524 A").
 */
const SPLITS = {
  771: [
    { appTitle: 'Ato Penitencial', pick: (s) => s.slice(0, 3) },
    { appTitle: 'Glória!', pick: (s) => s.slice(3).map(dropSuffix(' (Glória)')) },
  ],
  1331: [
    'Aclamação Memorial - Anunciamos',
    'Aclamação Memorial - Todas as Vezes',
    'Aclamação Memorial - Salvador do mundo',
    'Aclamação Memorial - Toda vez',
  ].map((appTitle, i) => ({
    appTitle,
    pick: (s) => [s[0], withLabel(null)(s[i + 1])],
  })),
  1336: [
    { appTitle: 'Aleluia - Opção 01', pick: (s) => [withLabel(null)(s[0])] },
    { appTitle: 'Aleluia - Opção 02', pick: (s) => [withLabel(null)(s[1])] },
  ],
  1524: [
    { number: '1524 A', pick: (s) => [withLabel(null, 'stanza')(s[0])] },
    { number: '1524 B', pick: (s) => [withLabel('Pres.')(s[1]), s[2]] },
  ],
}

function expandSplits(entries) {
  return entries.flatMap((entry) => {
    const parts = SPLITS[entry.number]
    if (!parts) return [{ ...entry, key: entry.number }]
    return parts.map((part) => ({
      ...entry,
      number: part.number ?? entry.number,
      key: part.number ?? `${entry.number} ${part.appTitle}`,
      app_title: part.appTitle ?? entry.app_title,
      sections: part.pick(entry.sections),
    }))
  })
}

const isApply = process.argv.includes('--apply')
const shouldOverwrite = process.argv.includes('--overwrite')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  },
)
const TEAM_ID = process.env.IMPORT_TEAM_ID

/** Mesma limpeza do import-songs-novo.mjs: tira "(Entrada)" etc. do título. */
function cleanTitle(title) {
  return title.replace(/\s*\([^)]*\)/g, '').trim() || title.trim()
}

/** Compara títulos ignorando acento, caixa, pontuação e o prefixo de letra ("l - "). */
function normalizeTitle(title) {
  return cleanTitle(title)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^[a-n]\s*[-–)]?\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function padNumber(number) {
  return number.split(' ')[0].padStart(4, '0')
}

/** "1188 H" → "h"; o app grava a letra no começo do título ("h - Amém!"). */
function entryLetter(entry) {
  return entry.number.split(' ')[1]?.toLowerCase() ?? null
}

function songLetter(song) {
  return song.title.match(/^([a-n])\s*[-–)]?\s/i)?.[1].toLowerCase() ?? null
}

function toSections(entry) {
  return entry.sections.map(({ type, label, lines, repeat }) => ({ type, label, lines, repeat }))
}

async function fetchBookSongs() {
  const songs = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('songs')
      .select('id, title, book_number, origin, has_lyrics')
      .eq('team_id', TEAM_ID)
      .in('origin', BOOK_ORIGINS)
      .range(from, from + 999)
    if (error) throw error
    songs.push(...data)
    if (data.length < 1000) break
  }
  return songs
}

function groupBy(items, keyOf) {
  const groups = new Map()
  for (const item of items) {
    const key = keyOf(item)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return groups
}

/** Liga cada música do app a uma entrada de letra. Devolve os pares e as sobras. */
function matchSongs(songs, entries) {
  const entriesByNumber = groupBy(entries, (e) => padNumber(e.number))
  const entriesByTitle = groupBy(
    entries.filter((e) => e.app_title),
    (e) => normalizeTitle(e.app_title),
  )
  const songsByNumber = groupBy(songs, (s) => s.book_number)
  const pairs = []
  const unmatchedSongs = []

  for (const song of songs) {
    const title = normalizeTitle(song.title)
    const letter = songLetter(song)
    const sameNumber = entriesByNumber.get(song.book_number) ?? []
    const byLetter = sameNumber.filter((e) => letter && entryLetter(e) === letter)
    const byTitle = sameNumber.filter((e) => e.app_title && normalizeTitle(e.app_title) === title)
    const isOnlyOne = sameNumber.length === 1 && songsByNumber.get(song.book_number).length === 1
    // Último recurso: título idêntico em outro número (o PDF grafa "123 a" para 1230 A).
    const elsewhere = entriesByTitle.get(title) ?? []
    const entry = [byLetter, byTitle, isOnlyOne ? sameNumber : [], elsewhere].find(
      (candidates) => candidates.length === 1,
    )?.[0]
    if (entry) pairs.push({ song, entry })
    else unmatchedSongs.push(song)
  }

  const usedKeys = new Set(pairs.map((p) => p.entry.key))
  const unusedEntries = entries.filter((e) => !usedKeys.has(e.key))
  return { pairs, unmatchedSongs, unusedEntries }
}

/**
 * Uma letra ligada a duas músicas só é aceitável quando são cópias da mesma
 * música (o app tem algumas cadastradas em dobro, com número e título iguais).
 */
function findConflictingEntries(pairs) {
  const songsByEntry = groupBy(pairs, (p) => p.entry.key)
  return [...songsByEntry.entries()].filter(
    ([, group]) => new Set(group.map((p) => normalizeTitle(p.song.title))).size > 1,
  )
}

async function runPool(items, worker) {
  let cursor = 0
  async function next() {
    while (cursor < items.length) await worker(items[cursor++])
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, next))
}

async function writeLyrics(pairs) {
  let written = 0
  const failures = []
  await runPool(pairs, async ({ song, entry }) => {
    const { error } = await supabase
      .from('songs')
      .update({ lyrics: toSections(entry) })
      .eq('id', song.id)
    if (error) failures.push(`${song.book_number} ${song.title}: ${error.message}`)
    else written++
    if (written % 100 === 0) process.stdout.write(`  ${written}/${pairs.length}\r`)
  })
  return { written, failures }
}

function printList(label, items, format) {
  console.log(`\n${label}: ${items.length}`)
  for (const item of items.slice(0, 40)) console.log('  ' + format(item))
  if (items.length > 40) console.log(`  … e mais ${items.length - 40}`)
}

async function main() {
  if (!TEAM_ID) throw new Error('IMPORT_TEAM_ID não definido no .env')
  const entries = expandSplits(JSON.parse(readFileSync(LYRICS_PATH, 'utf8')))
  const songs = await fetchBookSongs()
  const { pairs, unmatchedSongs, unusedEntries } = matchSongs(songs, entries)

  const conflicts = findConflictingEntries(pairs)
  if (conflicts.length > 0) {
    printList(
      'Letras ligadas a músicas diferentes',
      conflicts,
      ([number, group]) =>
        `${number} → ${group.map((p) => `${p.song.book_number} "${p.song.title}"`).join(' | ')}`,
    )
    throw new Error('Corrija o pareamento antes de gravar.')
  }

  const toWrite = shouldOverwrite ? pairs : pairs.filter((p) => !p.song.has_lyrics)
  console.log(`Letras no JSON: ${entries.length} | músicas do livro no app: ${songs.length}`)
  console.log(`Pareadas: ${pairs.length} | a gravar: ${toWrite.length}`)
  printList('Músicas do app sem letra', unmatchedSongs, (s) => `${s.book_number} ${s.title}`)
  printList('Letras sem música no app', unusedEntries, (e) => `${e.number} ${e.title}`)

  if (!isApply) {
    console.log('\nSimulação. Rode com --apply para gravar.')
    return
  }
  const { written, failures } = await writeLyrics(toWrite)
  console.log(`\nGravadas: ${written}`)
  printList('Falhas', failures, (f) => f)
  if (failures.length > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
