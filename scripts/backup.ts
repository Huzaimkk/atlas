// Atlas — manual backup. Supabase's free tier has no point-in-time
// recovery, and the verified 323-row pool took weeks of research to build
// with no restore path if it's ever lost — a pg_dump costs nothing and
// covers the only unrecoverable risk (spec §5).
//
// Run it: node --env-file=.env.local scripts/backup.ts
//
// Writes a timestamped, gitignored dump to backups/. Requires the
// PostgreSQL client tools (pg_dump) on PATH — install via your OS package
// manager (e.g. `brew install libpq` on macOS, `apt install postgresql-client`
// on Debian/Ubuntu, or the PostgreSQL installer on Windows) if it's missing.
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set — run with --env-file=.env.local')
  process.exit(1)
}

// Same IPv6-only-host workaround as scripts/lib/pg-client.mjs: db.<ref>.supabase.co
// has no IPv4 route from this network, so pg_dump needs the pooler host instead.
function resolveConnectionString(raw: string): string {
  const url = new URL(raw)
  if (url.hostname.startsWith('db.') && url.hostname.endsWith('.supabase.co')) {
    const ref = url.hostname.split('.')[1]
    return `postgresql://postgres.${ref}:${url.password}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres`
  }
  return raw
}

const backupsDir = join(process.cwd(), 'backups')
mkdirSync(backupsDir, { recursive: true })

const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const outFile = join(backupsDir, `atlas-${timestamp}.sql`)
const connectionString = resolveConnectionString(DATABASE_URL)

console.log(`Dumping to ${outFile} ...`)
const dump = spawn('pg_dump', ['--no-owner', '--no-privileges', '-f', outFile, connectionString], { stdio: 'inherit' })

dump.on('error', (err) => {
  console.error(`Could not start pg_dump: ${err.message}`)
  console.error('Install the PostgreSQL client tools and ensure pg_dump is on PATH.')
  process.exit(1)
})

dump.on('exit', (code) => {
  if (code === 0) {
    console.log(`Backup complete: ${outFile}`)
  } else {
    console.error(`pg_dump exited with code ${code}`)
    process.exit(code ?? 1)
  }
})
