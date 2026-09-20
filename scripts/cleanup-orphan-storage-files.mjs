/**
 * Audita (e opcionalmente remove) arquivos órfãos no bucket `song-files`.
 *
 * A conversão retroativa de imagens para PDF (convert-images-to-pdf.mjs) subiu
 * um `{tipo}.pdf` ao lado de cada imagem e repontou o banco, mas deixou a
 * imagem original no Storage de propósito, como backup.
 *
 * Há duas origens distintas de órfão, e só estas duas são removidas:
 *
 *   A) Sobra da conversão — o arquivo é imagem, ninguém no banco aponta para ele
 *      e existe um `{tipo}.pdf` irmão que o banco referencia. Esse PDF irmão é o
 *      que prova que a conversão daquele arquivo deu certo.
 *
 *   B) Música excluída — a pasta tem o id de uma música que não existe mais na
 *      tabela `songs`. `deleteSong` remove a linha mas não o Storage, então os
 *      arquivos ficam para trás.
 *
 * Qualquer outro arquivo sem referência é apenas reportado, nunca removido.
 *
 * Uso:
 *   node scripts/cleanup-orphan-storage-files.mjs           # auditoria (dry run)
 *   node scripts/cleanup-orphan-storage-files.mjs --apply   # remove os seguros
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config()

const BUCKET = 'song-files'
const FILE_TYPES = ['partitura', 'letra', 'cifra']
const IMAGE_EXT_REGEX = /\.(png|jpe?g)$/i
const LIST_PAGE = 100
const CONCURRENCY = 15
const DELETE_BATCH = 100

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

/** Extrai o caminho dentro do bucket a partir da URL pública salva no banco. */
function toStoragePath(url) {
  const marker = `/object/public/${BUCKET}/`
  const i = url.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(url.slice(i + marker.length).split('?')[0])
}

async function fetchAllSongs() {
  const PAGE = 1000
  const all = []
  let from = 0

  for (;;) {
    const { data, error } = await supabase
      .from('songs')
      .select('id, team_id, title, code, partitura_url, letra_url, cifra_url')
      .range(from, from + PAGE - 1)

    if (error) throw error
    all.push(...(data ?? []))
    if (!data || data.length < PAGE) break
    from += PAGE
  }

  return all
}

/** Lista um diretório inteiro do bucket, paginando até o fim. */
async function listAll(prefix) {
  const entries = []
  let offset = 0

  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: LIST_PAGE, offset })

    if (error) throw error
    entries.push(...(data ?? []))
    if (!data || data.length < LIST_PAGE) break
    offset += LIST_PAGE
  }

  return entries
}

/** Executa `worker` sobre os itens com paralelismo limitado. */
async function mapPool(items, worker) {
  const results = []
  let cursor = 0

  async function run() {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await worker(items[i])
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, run))
  return results
}

async function collectObjects() {
  const teams = (await listAll('')).filter((e) => !e.id).map((e) => e.name)
  const objects = []

  for (const team of teams) {
    const songFolders = (await listAll(team)).filter((e) => !e.id).map((e) => e.name)
    process.stdout.write(`\r   varrendo ${team} — ${songFolders.length} pasta(s)...`)

    const perFolder = await mapPool(songFolders, async (folder) => {
      const files = (await listAll(`${team}/${folder}`)).filter((e) => e.id)
      return files.map((f) => ({
        path: `${team}/${folder}/${f.name}`,
        name: f.name,
        folder: `${team}/${folder}`,
        songId: folder,
        size: f.metadata?.size ?? 0,
      }))
    })

    objects.push(...perFolder.flat())
  }

  process.stdout.write('\r'.padEnd(60) + '\r')
  return objects
}

function classify(objects, songs) {
  const referenced = new Set()
  const existingSongIds = new Set(songs.map((s) => s.id))
  const staleImageRefs = []

  for (const song of songs) {
    for (const type of FILE_TYPES) {
      const url = song[`${type}_url`]
      if (!url) continue
      const path = toStoragePath(url)
      if (path) referenced.add(path)
      if (IMAGE_EXT_REGEX.test(url.split('?')[0])) {
        staleImageRefs.push({ code: song.code, title: song.title, type })
      }
    }
  }

  const byPath = new Set(objects.map((o) => o.path))
  const fromConversion = []
  const fromDeletedSongs = []
  const otherOrphans = []

  for (const obj of objects) {
    if (referenced.has(obj.path)) continue

    // B) a música dona da pasta não existe mais — tudo dentro dela é resíduo
    if (!existingSongIds.has(obj.songId)) {
      fromDeletedSongs.push(obj)
      continue
    }

    // A) imagem substituída por um PDF convertido que o banco já referencia
    const type = FILE_TYPES.find((t) => obj.name.toLowerCase().startsWith(`${t}.`))
    const pdfSibling = type ? `${obj.folder}/${type}.pdf` : null
    const hasConvertedPdf = !!pdfSibling && byPath.has(pdfSibling) && referenced.has(pdfSibling)

    if (IMAGE_EXT_REGEX.test(obj.name) && hasConvertedPdf) fromConversion.push(obj)
    else otherOrphans.push(obj)
  }

  return {
    fromConversion,
    fromDeletedSongs,
    otherOrphans,
    staleImageRefs,
    referencedCount: referenced.size,
  }
}

function formatMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function main() {
  const isDryRun = !process.argv.includes('--apply')

  console.log('Lendo músicas do banco...')
  const songs = await fetchAllSongs()

  console.log(`Varrendo o bucket "${BUCKET}"...`)
  const objects = await collectObjects()

  const { fromConversion, fromDeletedSongs, otherOrphans, staleImageRefs, referencedCount } =
    classify(objects, songs)

  const toDelete = [...fromConversion, ...fromDeletedSongs]
  const totalBytes = toDelete.reduce((sum, o) => sum + o.size, 0)

  console.log(`\nArquivos no bucket        : ${objects.length}`)
  console.log(`Referenciados no banco    : ${referencedCount}`)
  console.log(`Sobras da conversão       : ${fromConversion.length}`)
  console.log(`De músicas excluídas      : ${fromDeletedSongs.length}`)
  console.log(`Outros órfãos             : ${otherOrphans.length} — apenas reportados`)
  console.log(`Músicas ainda em imagem   : ${staleImageRefs.length}`)
  console.log(`A remover                 : ${toDelete.length} (${formatMb(totalBytes)})`)

  if (staleImageRefs.length > 0) {
    console.log('\nEstas músicas AINDA apontam para imagem (conversão não rodou ou falhou):')
    console.table(staleImageRefs.slice(0, 20))
  }

  if (otherOrphans.length > 0) {
    console.log('\nÓrfãos que NÃO serão removidos (origem não identificada):')
    console.table(
      otherOrphans.slice(0, 20).map((o) => ({ path: o.path, kb: Math.round(o.size / 1024) })),
    )
  }

  if (toDelete.length === 0) {
    console.log('\nNada a remover.')
    return
  }

  console.log('\nArquivos a remover:')
  console.table(
    toDelete.map((o) => ({
      path: o.path,
      kb: Math.round(o.size / 1024),
      origem: fromConversion.includes(o) ? 'conversão' : 'música excluída',
    })),
  )

  if (isDryRun) {
    console.log('\nSimulação — rode novamente com --apply para remover.')
    return
  }

  let removed = 0
  for (let i = 0; i < toDelete.length; i += DELETE_BATCH) {
    const batch = toDelete.slice(i, i + DELETE_BATCH).map((o) => o.path)
    const { error } = await supabase.storage.from(BUCKET).remove(batch)
    if (error) throw error
    removed += batch.length
    process.stdout.write(`
   ${removed}/${toDelete.length} removido(s)...`)
  }

  console.log(`\n\n${removed} arquivo(s) órfão(s) removido(s) — ${formatMb(totalBytes)} liberados.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
