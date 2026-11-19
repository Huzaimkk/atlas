// One-off: move every per-user row from the seeded user to a real auth account.
//
// The multi-tenant backfill (scripts/seed-multi-tenant-user.mjs) put all
// existing personal data under a seeded user. The account actually used to
// sign in is a different auth.users row, so it saw the shared pool and none
// of its own data. This re-points user_id on every per-user table.
//
// Dry run by default: prints what would move and refuses if the target
// already owns any rows. --apply runs it in one transaction and rolls back
// if any table's moved count differs from the dry-run count.
//
// Usage:
//   node --env-file=.env.local scripts/repoint-user.mjs <target-email>
//   node --env-file=.env.local scripts/repoint-user.mjs <target-email> --apply
import { createPgClient } from './lib/pg-client.mjs'

const FROM = 'de2223b9-b014-488b-b7d0-5e04455342b9'
const TABLES = [
  'profile_snapshots',
  'verdicts',
  'gaps',
  'gap_closures',
  'applications',
  'referees',
  'command_log',
  'outreach_log',
  'inbox_leads',
]

const email = process.argv[2]
const apply = process.argv.includes('--apply')
if (!email || email.startsWith('--')) {
  console.error('usage: repoint-user.mjs <target-email> [--apply]')
  process.exit(1)
}

const db = createPgClient()
await db.connect()

try {
  const { rows: users } = await db.query('select id from auth.users where lower(email) = lower($1)', [email])
  if (users.length !== 1) throw new Error(`expected exactly one auth user for that email, found ${users.length}`)
  const TO = users[0].id
  if (TO === FROM) throw new Error('target is already the seeded user — nothing to do')
  console.log(`from ${FROM}\nto   ${TO}\n`)

  // Any table with a user_id column that isn't in the list would be left behind.
  const { rows: cols } = await db.query(
    `select table_name from information_schema.columns
      where table_schema = 'public' and column_name = 'user_id'
        and table_name in (select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE')`
  )
  const extra = cols.map((c) => c.table_name).filter((t) => !TABLES.includes(t))
  if (extra.length) throw new Error(`tables with user_id not in the list: ${extra.join(', ')}`)

  const before = {}
  let collisions = 0
  for (const t of TABLES) {
    const { rows } = await db.query(
      `select count(*) filter (where user_id = $1)::int as src, count(*) filter (where user_id = $2)::int as dst from ${t}`,
      [FROM, TO]
    )
    before[t] = rows[0]
    collisions += rows[0].dst
  }
  console.table(before)
  if (collisions > 0) throw new Error(`target already owns ${collisions} rows — refusing so nothing collides`)

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to move these rows.')
  } else {
    await db.query('begin')
    const moved = {}
    for (const t of TABLES) {
      const { rowCount } = await db.query(`update ${t} set user_id = $2 where user_id = $1`, [FROM, TO])
      if (rowCount !== before[t].src) throw new Error(`${t}: moved ${rowCount}, expected ${before[t].src}`)
      moved[t] = rowCount
    }
    for (const t of TABLES) {
      const { rows } = await db.query(`select count(*)::int as n from ${t} where user_id = $1`, [FROM])
      if (rows[0].n !== 0) throw new Error(`${t}: ${rows[0].n} rows still on the seeded user`)
    }
    await db.query('commit')
    console.log('\nCommitted. Rows moved:')
    console.table(moved)
  }
} catch (e) {
  await db.query('rollback').catch(() => {})
  console.error(`\nABORTED (rolled back): ${e.message}`)
  process.exitCode = 1
} finally {
  await db.end()
}
