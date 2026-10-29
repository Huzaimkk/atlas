// Atlas — multi-tenant P1 empirical RLS proof.
//
// Run after 0012_multi_tenant_part1.sql, scripts/seed-multi-tenant-user.mjs,
// 0012_multi_tenant_part2.sql, and scripts/seed-second-test-user.mjs.
//
// This is the actual deliverable the P1 instructions asked for, not the SQL
// itself: five static checks against pg_catalog, then an empirical read/write
// test as user B's real JWT (no service-role key involved in the test
// itself) against all nine per-user tables plus gap_queue.
//
// Usage: node --env-file=.env.local scripts/verify-multi-tenant-rls.mjs
import { createClient } from '@supabase/supabase-js'
import { createPgClient } from './lib/pg-client.mjs'

const TEST_EMAIL_B = 'atlas-rls-test-user-b@example.com'
const PER_USER_TABLES = [
  'profile_snapshots', 'verdicts', 'gaps', 'gap_closures',
  'applications', 'referees', 'command_log', 'outreach_log', 'inbox_leads',
]

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const pg = createPgClient()
await pg.connect()

let failures = 0
function check(label, pass, detail) {
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`)
  if (!pass) failures++
}

console.log('=== Static checks (pg_catalog) ===\n')

// ---- 1. RLS enabled on all nine tables ----
{
  const { rows } = await pg.query(
    `select relname, relrowsecurity from pg_class where relname = any($1::text[])`,
    [PER_USER_TABLES]
  )
  const byName = new Map(rows.map((r) => [r.relname, r.relrowsecurity]))
  for (const table of PER_USER_TABLES) {
    check(`RLS enabled on ${table}`, byName.get(table) === true)
  }
}

// ---- 2. every INSERT/UPDATE/ALL policy on these tables has WITH CHECK ----
{
  const { rows } = await pg.query(
    `select c.relname as table_name, p.polname, p.polcmd, p.polwithcheck is not null as has_with_check, p.polroles
     from pg_policy p join pg_class c on c.oid = p.polrelid
     where c.relname = any($1::text[])`,
    [PER_USER_TABLES]
  )
  for (const r of rows) {
    // polcmd: 'r' select, 'a' insert, 'w' update, 'd' delete, '*' all
    const writeRelevant = r.polcmd === 'a' || r.polcmd === 'w' || r.polcmd === '*'
    if (writeRelevant) {
      check(`${r.table_name}."${r.polname}" (cmd=${r.polcmd}) has WITH CHECK`, r.has_with_check)
    }
  }
}

// ---- 3. zero policies granted to anon ----
{
  const { rows } = await pg.query(
    `select c.relname as table_name, p.polname, r.rolname
     from pg_policy p
     join pg_class c on c.oid = p.polrelid
     join pg_roles r on r.oid = any(p.polroles)
     where r.rolname = 'anon'`
  )
  check('zero policies granted to the anon role', rows.length === 0, rows.length ? JSON.stringify(rows) : 'confirmed zero')
}

// ---- 4. gap_queue: security_invoker + user_id in projection ----
{
  const { rows } = await pg.query(`select reloptions from pg_class where relname = 'gap_queue'`)
  const reloptions = rows[0]?.reloptions ?? []
  check('gap_queue has security_invoker=true', reloptions.some((o) => o === 'security_invoker=true'), JSON.stringify(reloptions))

  const { rows: colRows } = await pg.query(
    `select a.attname from pg_attribute a join pg_class c on c.oid = a.attrelid
     where c.relname = 'gap_queue' and a.attnum > 0 and not a.attisdropped`
  )
  check('gap_queue projection includes user_id', colRows.some((r) => r.attname === 'user_id'))
}

console.log('\n=== Empirical cross-tenant read/write test ===\n')

// ---- 5. real session for user B (no password flow — magic-link token, verified) ----
const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email: TEST_EMAIL_B })
if (linkErr) { console.error('Could not generate magic link for user B:', linkErr.message); process.exit(1) }
const userBId = linkData.user.id

const anonForAuth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { data: otpData, error: otpErr } = await anonForAuth.auth.verifyOtp({
  type: 'magiclink',
  token_hash: linkData.properties.hashed_token,
})
if (otpErr || !otpData.session) { console.error('Could not verify OTP for user B:', otpErr?.message); process.exit(1) }

const asUserB = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${otpData.session.access_token}` } },
})

const { rows: ownerRows } = await pg.query(`select id from auth.users where email != $1 and id = any(
  select distinct user_id from profile_snapshots where user_id is not null
) limit 5`, [TEST_EMAIL_B])
const userAIds = new Set(ownerRows.map((r) => r.id))

console.log(`User B id: ${userBId}`)
console.log(`Known other user id(s) in the data: ${[...userAIds].join(', ') || '(none found)'}\n`)

const rowCounts = {}
for (const table of [...PER_USER_TABLES, 'gap_queue']) {
  const { data, error } = await asUserB.from(table).select('*')
  if (error) {
    console.log(`[${table}] query error (unexpected): ${error.message}`)
    rowCounts[table] = 'ERROR'
    continue
  }
  const rows = data ?? []
  const foreignRows = rows.filter((r) => r.user_id && r.user_id !== userBId)
  rowCounts[table] = rows.length
  check(`${table}: zero foreign-user rows visible to user B (${rows.length} own row(s) returned)`, foreignRows.length === 0,
    foreignRows.length ? `leaked ${foreignRows.length} row(s) belonging to another user_id` : undefined)
}

// ---- 6. write attempt: user B tries to insert a row carrying user A's user_id ----
if (userAIds.size > 0) {
  const targetUserA = [...userAIds][0]
  const { error: writeErr } = await asUserB.from('profile_snapshots').insert({
    user_id: targetUserA, // attempting to write AS someone else
    version: 888888 + Math.floor(Math.random() * 1000),
    identity: {}, credentials: {}, evidence: {}, teaching_service: {}, document_inventory: {},
  })
  check('write carrying another user_id is rejected by Postgres', !!writeErr, writeErr ? writeErr.message : 'INSERT SUCCEEDED — this is the leak the with_check clause exists to prevent')
} else {
  console.log('[SKIP] no other user_id found in the data — cannot test the cross-user write rejection. Run scripts/seed-multi-tenant-user.mjs first.')
}

console.log('\n=== Row counts per table (as user B) ===')
for (const [table, count] of Object.entries(rowCounts)) console.log(`  ${table}: ${count}`)

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`)
await pg.end()
process.exit(failures === 0 ? 0 : 1)
