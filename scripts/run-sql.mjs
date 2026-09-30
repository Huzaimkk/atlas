// Runs a .sql file (or files) against DATABASE_URL directly.
// Usage: node --env-file=.env.local scripts/run-sql.mjs supabase/migrations/000X_name.sql [...]
import { readFileSync } from 'fs'
import { createPgClient } from './lib/pg-client.mjs'

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('Usage: node scripts/run-sql.mjs <file.sql> [...]')
  process.exit(1)
}

const client = createPgClient()
await client.connect()

try {
  for (const file of files) {
    const sql = readFileSync(file, 'utf8')
    console.log(`\n--- running ${file} ---`)
    const result = await client.query(sql)
    const results = Array.isArray(result) ? result : [result]
    for (const r of results) {
      if (r.command) console.log(`${r.command} (${r.rowCount ?? 0} rows)`)
    }
    console.log(`--- ${file} OK ---`)
  }
} finally {
  await client.end()
}
