// Atlas — multi-tenant P1, step 2 of 3 (run after 0012_multi_tenant_part1.sql,
// before 0012_multi_tenant_part2.sql).
//
// 1. Finds or creates the owner's auth.users row via the Supabase Admin
//    Auth API (email-only — no password; they sign in via magic link once
//    the P2 auth screens exist).
// 2. Backfills user_id on every existing row across all nine per-user
//    tables, using that user's real id.
// 3. Backfills profile_snapshots.user_version with sequential ordinals
//    (ordered by the existing global `version`, which is itself creation-
//    ordered) — a one-time UPDATE, not a live computed view, so using
//    row_number() here is safe (see migration 0012 part 1's comment on why
//    a *live* row_number() would be the wrong choice for the trigger).
//
// Usage: node --env-file=.env.local scripts/seed-multi-tenant-user.mjs <owner-email>
import { createClient } from '@supabase/supabase-js'
import { createPgClient } from './lib/pg-client.mjs'

const ownerEmail = process.argv[2]
if (!ownerEmail) {
  console.error('Usage: node scripts/seed-multi-tenant-user.mjs <owner-email>')
  process.exit(1)
}

const PER_USER_TABLES = [
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

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const pg = createPgClient()
await pg.connect()

try {
  // ---- 1. find or create the owner ----
  const { rows: existingRows } = await pg.query('select id from auth.users where email = $1', [ownerEmail])
  let ownerId = existingRows[0]?.id

  if (!ownerId) {
    const { data, error } = await admin.auth.admin.createUser({ email: ownerEmail, email_confirm: true })
    if (error) throw new Error(`Could not create owner user: ${error.message}`)
    ownerId = data.user.id
    console.log(`Created auth.users row for ${ownerEmail} -> ${ownerId}`)
  } else {
    console.log(`Found existing auth.users row for ${ownerEmail} -> ${ownerId}`)
  }

  // ---- 2. backfill user_id on all nine tables ----
  await pg.query('begin')
  const counts = {}
  for (const table of PER_USER_TABLES) {
    const { rowCount } = await pg.query(`update ${table} set user_id = $1 where user_id is null`, [ownerId])
    counts[table] = rowCount
  }

  // ---- 3. backfill user_version, ordered by the global version (creation order) ----
  const { rowCount: versionCount } = await pg.query(
    `update profile_snapshots ps
     set user_version = sub.rn
     from (
       select id, row_number() over (partition by user_id order by version asc) as rn
       from profile_snapshots
       where user_id = $1
     ) sub
     where ps.id = sub.id`,
    [ownerId]
  )
  await pg.query('commit')

  console.log('\nBackfilled user_id rows per table:')
  for (const [table, count] of Object.entries(counts)) console.log(`  ${table}: ${count}`)
  console.log(`\nBackfilled user_version on ${versionCount} profile_snapshots row(s).`)
  console.log(`\nOwner user_id: ${ownerId}`)
} catch (err) {
  await pg.query('rollback').catch(() => {})
  console.error('Backfill failed, rolled back:', err.message)
  process.exit(1)
} finally {
  await pg.end()
}
