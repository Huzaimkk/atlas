// Atlas — multi-tenant P1 empirical RLS proof, setup step.
//
// Creates a throwaway second user ("user B") and gives them a few rows of
// their own across more than one per-user table, so scripts/verify-multi-tenant-rls.mjs
// has real data to query as user B and confirm user A's rows never come back.
//
// Safe to re-run — idempotent on the email, and all rows it creates are
// tagged and removable by scripts/cleanup-test-user.mjs.
//
// Usage: node --env-file=.env.local scripts/seed-second-test-user.mjs
import { createClient } from '@supabase/supabase-js'
import { createPgClient } from './lib/pg-client.mjs'

const TEST_EMAIL = 'atlas-rls-test-user-b@example.com'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const pg = createPgClient()
await pg.connect()

try {
  const { rows: existing } = await pg.query('select id from auth.users where email = $1', [TEST_EMAIL])
  let userBId = existing[0]?.id
  if (!userBId) {
    const { data, error } = await admin.auth.admin.createUser({ email: TEST_EMAIL, email_confirm: true })
    if (error) throw new Error(`Could not create user B: ${error.message}`)
    userBId = data.user.id
    console.log(`Created user B: ${TEST_EMAIL} -> ${userBId}`)
  } else {
    console.log(`User B already exists: ${TEST_EMAIL} -> ${userBId}`)
  }

  // Pick one real shared opportunity to attach an application to — opportunities
  // stay shared, so this doesn't create a second one.
  const { data: opp, error: oppErr } = await admin.from('opportunities').select('id').limit(1).maybeSingle()
  if (oppErr) throw new Error(`Could not read opportunities: ${oppErr.message}`)

  const now = new Date().toISOString()

  // Two profile_snapshots rows for user B (exercises the user_version
  // trigger — these should land as user_version 1 and 2 for user B,
  // independent of whatever user A's ordinals are).
  const snapshotBase = {
    user_id: userBId,
    identity: { citizenship: 'Testland', current_degree_level: 'test', current_institution: 'test', funding_requirement: 'flexible', term_flexibility: 'any', geography: 'any', target_degree_levels: [], years_of_education: 16 },
    credentials: { degrees: [], certifications: [] },
    evidence: { publications: [], preprints: [], patents: [], open_source: [], venture_work: [] },
    teaching_service: { ta_history: [], mentoring: [], review_work: [] },
    document_inventory: { sop: 'missing', research_statement: 'missing', cv: 'missing', transcripts: 'missing', lor_commitments: 'missing', writing_sample: 'missing', portfolio: 'missing' },
  }
  const { data: snap1, error: snap1Err } = await admin.from('profile_snapshots').insert({ ...snapshotBase, version: 900001, is_current: false }).select('id, version, user_version').single()
  if (snap1Err) throw new Error(`profile_snapshots insert 1 failed: ${snap1Err.message}`)
  const { data: snap2, error: snap2Err } = await admin.from('profile_snapshots').insert({ ...snapshotBase, version: 900002, is_current: true }).select('id, version, user_version').single()
  if (snap2Err) throw new Error(`profile_snapshots insert 2 failed: ${snap2Err.message}`)
  console.log(`Seeded profile_snapshots for user B: version ${snap1.version} (user_version ${snap1.user_version}), version ${snap2.version} (user_version ${snap2.user_version})`)

  if (opp) {
    const { error: appErr } = await admin.from('applications').insert({
      user_id: userBId,
      opportunity_id: opp.id,
      status: 'not_started',
      status_changed_at: now,
      status_history: [{ status: 'not_started', at: now }],
      required_documents: [],
    })
    if (appErr) throw new Error(`applications insert failed: ${appErr.message}`)
    console.log(`Seeded 1 applications row for user B against opportunity ${opp.id}`)
  } else {
    console.log('No opportunities found to attach a test application to — skipped (not required for the RLS test).')
  }

  console.log(`\nUser B id: ${userBId}`)
  console.log(`User B email: ${TEST_EMAIL}`)
} finally {
  await pg.end()
}
