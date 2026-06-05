/**
 * Script de backup do Supabase
 *
 * Exporta todas as tabelas do banco e lista os arquivos do Storage
 * para um arquivo JSON em backups/backup-YYYY-MM-DD_HH-mm.json
 *
 * Como usar:
 *   node scripts/backup.mjs
 *
 * Para agendar (Windows Task Scheduler ou cron):
 *   node C:\caminho\para\o\projeto\scripts\backup.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
config()

const SUPABASE_URL   = process.env.VITE_SUPABASE_URL
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

// ── Utilitários ───────────────────────────────────────────────────────────────

function timestamp() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`
}

/** Busca todos os registros de uma tabela contornando o limite de 1000 linhas. */
async function fetchAll(table, select = '*') {
  const rows = []
  let from = 0
  const PAGE = 1000

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE - 1)

    if (error) throw new Error(`Erro ao buscar ${table}: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) break
    from += PAGE
  }

  return rows
}

/**
 * Extrai os arquivos do Storage a partir das URLs já salvas no banco —
 * muito mais rápido do que percorrer o bucket folder por folder.
 */
function extractStorageFiles(songs) {
  const files = []
  const fields = ['partitura_url', 'letra_url', 'cifra_url', 'audio_url']

  for (const song of songs) {
    for (const field of fields) {
      const url = song[field]
      if (url && url.includes('supabase')) {
        files.push({ song_id: song.id, title: song.title, field, url })
      }
    }
  }

  return files
}

// ── Tabelas para exportar ─────────────────────────────────────────────────────

const TABLES = [
  'teams',
  'team_members',
  'songs',
  'masses',
  'mass_songs',
]


// ── Main ──────────────────────────────────────────────────────────────────────

console.log('\n🗄️  Iniciando backup do Supabase...\n')

const backup = {
  meta: {
    created_at: new Date().toISOString(),
    supabase_url: SUPABASE_URL,
    tables: {},
    storage: {},
  },
  data: {},
  storage: {},
}

// Exporta tabelas
for (const table of TABLES) {
  process.stdout.write(`   📋 Exportando tabela "${table}"... `)
  try {
    const rows = await fetchAll(table)
    backup.data[table] = rows
    backup.meta.tables[table] = rows.length
    console.log(`${rows.length} registros`)
  } catch (err) {
    console.error(`❌  ${err.message}`)
    backup.data[table] = []
    backup.meta.tables[table] = 0
  }
}

console.log()

// Extrai arquivos do Storage a partir das URLs salvas nas músicas
process.stdout.write(`   🪣 Mapeando arquivos do Storage... `)
const storageFiles = extractStorageFiles(backup.data['songs'] ?? [])
backup.storage['song-files'] = storageFiles
backup.meta.storage['song-files'] = storageFiles.length
console.log(`${storageFiles.length} arquivo(s) mapeados`)

// Salva o arquivo
const __dir = dirname(fileURLToPath(import.meta.url))
const backupDir = join(__dir, '..', 'backups')
if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })

const filename = `backup-${timestamp()}.json`
const filepath = join(backupDir, filename)

writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8')

const sizeKb = (Buffer.byteLength(JSON.stringify(backup), 'utf-8') / 1024).toFixed(1)

console.log('\n' + '═'.repeat(55))
console.log('✅  Backup concluído!')
console.log(`   Arquivo : backups/${filename}`)
console.log(`   Tamanho : ${sizeKb} KB`)
console.log('\n   Resumo:')
for (const [table, count] of Object.entries(backup.meta.tables)) {
  console.log(`     ${table.padEnd(16)} ${count} registros`)
}
for (const [bucket, count] of Object.entries(backup.meta.storage)) {
  console.log(`     ${bucket.padEnd(16)} ${count} arquivos no Storage`)
}
console.log('═'.repeat(55))
console.log('\n💡  Os arquivos do Storage (PDFs/áudios) NÃO são baixados,')
console.log('    apenas listados. Eles ficam seguros no Supabase.')
console.log('    Para restaurar, use o arquivo JSON gerado + API do Supabase.\n')
