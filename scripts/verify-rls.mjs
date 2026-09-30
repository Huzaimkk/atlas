// Re-verifies the gap_queue security fix (0002) two ways: the actual
// Postgres reloption, and an empirical anon-key read against seeded data.
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
const { rows } = await client.query(
  `select relname, reloptions from pg_class where relname = 'gap_queue'`
)
console.log('[pg_class] gap_queue reloptions ->', rows[0]?.reloptions ?? null)
await client.end()

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const TEST_VERSION = 999999
await admin.from('profile_snapshots').insert({
  version: TEST_VERSION, is_current: false,
  identity: {}, credentials: {}, evidence: {}, teaching_service: {}, document_inventory: {},
})
const opp = await admin.from('opportunities').insert({
  title: 'RLS re-test — safe to ignore', track: 'phd_funded', category: 4, institution: 'test',
  status: 'open', tier: 'T3', source_url: 'https://example.com',
  source_type: 'manual', verification_level: 'conflicting', origin: 'manual',
}).select('id').single()
const verdict = await admin.from('verdicts').insert({
  opportunity_id: opp.data.id, snapshot_version: TEST_VERSION, type: 'GAP',
}).select('id').single()
await admin.from('gaps').insert({
  verdict_id: verdict.data.id, opportunity_id: opp.data.id, type: 'document', label: 'RLS re-test gap',
})

const anonGapQueue = await anon.from('gap_queue').select('*')
console.log('[anon-key] gap_queue ->', { rowCount: anonGapQueue.data?.length, error: anonGapQueue.error?.message ?? null })

await admin.from('opportunities').delete().eq('id', opp.data.id)
await admin.from('profile_snapshots').delete().eq('version', TEST_VERSION)
console.log('[cleanup] test rows removed')
