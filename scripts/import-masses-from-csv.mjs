/**
 * Importa missas a partir de um CSV de domingos litúrgicos (Data;Domingo Litúrgico).
 *
 * As missas são criadas com modo público DESATIVADO (is_public = false) — o time
 * publica cada celebração manualmente depois de montar o repertório.
 *
 * Uso:
 *   node scripts/import-masses-from-csv.mjs <caminho-do-csv> [--apply]
 *
 * Sem --apply roda em modo simulação (dry run), apenas listando o que seria criado.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import { config } from 'dotenv'
config()

const MASS_TIME = '18:00:00'
const IS_PUBLIC = false

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
)

const TEAM_ID = process.env.IMPORT_TEAM_ID

/** Regras avaliadas em ordem: a primeira que casar define o tempo litúrgico. */
const SEASON_RULES = [
  [/tempo\s*comum/i, 'tempo_comum'],
  [/advento/i, 'advento'],
  [/sagrada\s*fam[ií]lia|epifania|batismo\s*do\s*senhor|natal/i, 'natal'],
  [/quaresma|domingo\s*de\s*ramos/i, 'quaresma'],
  [/p[aá]scoa|ascens[aã]o/i, 'pascoa'],
  [/pentecostes/i, 'pentecostes'],
  // Solenidades que caem em domingo mas não seguem o tempo do domingo
  [/rei\s*do\s*universo|sant[ií]ssima\s*trindade/i, 'outros'],
]

function resolveSeason(description) {
  for (const [pattern, season] of SEASON_RULES) {
    if (pattern.test(description)) return season
  }
  return 'outros'
}

function parseBrazilianDate(value) {
  const [day, month, year] = value.trim().split('/')
  return `${year}-${month}-${day}`
}

/** Separa "26º Domingo do Tempo Comum, Ano A" em título e ano litúrgico. */
function splitTitleAndYear(rawLabel) {
  const match = rawLabel.match(/^(.*?),\s*Ano\s*([ABC])\s*$/i)
  if (!match) return { title: rawLabel.trim(), liturgicalYear: null }
  return { title: match[1].trim(), liturgicalYear: match[2].toUpperCase() }
}

function readRows(csvPath) {
  const content = readFileSync(csvPath, 'utf8').replace(/^﻿/, '')
  const records = parse(content, { delimiter: ';', columns: true, skip_empty_lines: true, trim: true })

  return records.map((record) => {
    const rawLabel = record['Domingo Litúrgico']
    const { title, liturgicalYear } = splitTitleAndYear(rawLabel)

    return {
      team_id: TEAM_ID,
      title,
      date: parseBrazilianDate(record['Data']),
      time: MASS_TIME,
      liturgical_year: liturgicalYear,
      liturgical_season: resolveSeason(rawLabel),
      is_public: IS_PUBLIC,
    }
  })
}

async function main() {
  const [csvPath] = process.argv.slice(2)
  const isDryRun = !process.argv.includes('--apply')

  if (!csvPath) throw new Error('Informe o caminho do CSV.')
  if (!TEAM_ID) throw new Error('IMPORT_TEAM_ID não configurado no .env')

  const rows = readRows(csvPath)

  const { data: existing, error: existingError } = await supabase
    .from('masses')
    .select('date, time')
    .eq('team_id', TEAM_ID)

  if (existingError) throw existingError

  const existingKeys = new Set(existing.map((mass) => `${mass.date}|${mass.time}`))
  const pending = rows.filter((row) => !existingKeys.has(`${row.date}|${row.time}`))
  const skipped = rows.length - pending.length

  console.table(
    pending.map((row) => ({
      data: row.date,
      titulo: row.title,
      ano: row.liturgical_year,
      tempo: row.liturgical_season,
      publico: row.is_public,
    })),
  )
  console.log(`${rows.length} linhas no CSV · ${skipped} já existentes · ${pending.length} a criar`)

  if (isDryRun) {
    console.log('\nSimulação — rode novamente com --apply para gravar.')
    return
  }
  if (pending.length === 0) return

  const { data, error } = await supabase.from('masses').insert(pending).select('id')
  if (error) throw error

  console.log(`\n${data.length} missas criadas com sucesso.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
