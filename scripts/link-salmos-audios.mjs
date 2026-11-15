/**
 * Preenche o audio_url dos salmos a partir do relatório gerado por
 * match-salmos-audios.py.
 *
 * Só toca em salmos que ainda não têm áudio — um link já cadastrado nunca é
 * sobrescrito — e só aplica pares que passaram na validação (ok/provavel).
 *
 * Uso:
 *   node scripts/link-salmos-audios.mjs <relatorio.csv> [--apply]
 *
 * Sem --apply roda em modo simulação.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import { config } from 'dotenv'
config()

const ACCEPTED = new Set(['ok', 'provavel'])

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  },
)
const TEAM_ID = process.env.IMPORT_TEAM_ID

async function fetchPsalms() {
  const { data, error } = await supabase
    .from('songs')
    .select('id, code, book_number, audio_url')
    .eq('team_id', TEAM_ID)
    .eq('origin', 'salmos')

  if (error) throw error
  return new Map(data.map((song) => [String(parseInt(song.book_number, 10)), song]))
}

async function main() {
  const [reportPath] = process.argv.slice(2)
  const isDryRun = !process.argv.includes('--apply')
  if (!reportPath) throw new Error('Informe o relatório gerado por match-salmos-audios.py.')
  if (!TEAM_ID) throw new Error('IMPORT_TEAM_ID não configurado no .env')

  const report = parse(readFileSync(reportPath, 'utf8').replace(/^﻿/, ''), {
    delimiter: ';',
    columns: true,
  })
  const psalms = await fetchPsalms()

  const rejected = report.filter((r) => !ACCEPTED.has(r.status))
  const missingSong = report.filter((r) => !psalms.has(r.pagina_livro))
  const alreadyLinked = report.filter((r) => psalms.get(r.pagina_livro)?.audio_url)
  const pending = report.filter(
    (r) =>
      ACCEPTED.has(r.status) && psalms.has(r.pagina_livro) && !psalms.get(r.pagina_livro).audio_url,
  )

  console.log(`${report.length} pares no relatório`)
  console.log(`  já têm áudio (mantidos)  : ${alreadyLinked.length}`)
  console.log(`  reprovados na validação  : ${rejected.length}`)
  console.log(`  sem salmo no banco       : ${missingSong.length}`)
  console.log(`  a preencher              : ${pending.length}`)

  console.log('\namostra:')
  console.table(
    pending.slice(0, 6).map((r) => ({
      pág: r.pagina_livro,
      código: `#${psalms.get(r.pagina_livro).code}`,
      faixa: r.faixa,
      status: r.status,
    })),
  )

  if (isDryRun) {
    console.log('\nSimulação — rode novamente com --apply para gravar.')
    return
  }

  let updated = 0
  for (const row of pending) {
    const { error } = await supabase
      .from('songs')
      .update({ audio_url: row.audio_url })
      .eq('id', psalms.get(row.pagina_livro).id)
      .is('audio_url', null)
    if (error) throw error
    updated++
  }
  console.log(`\n${updated} salmos receberam o link de áudio.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
