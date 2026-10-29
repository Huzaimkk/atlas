// Removes the throwaway RLS-test user B and every row it owns. Run after
// scripts/verify-multi-tenant-rls.mjs has reported its results — this test
// user has no reason to persist once the proof is captured.
//
// Usage: node --env-file=.env.local scripts/cleanup-test-user.mjs
import { createClient } from '@supabase/supabase-js'
import { createPgClient } from './lib/pg-client.mjs'

const TEST_EMAIL_B = 'atlas-rls-test-user-b@example.com'

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const pg = createPgClient()
await pg.connect()

try {
  const { rows } = await pg.query('select id from auth.users where email = $1', [TEST_EMAIL_B])
  const userBId = rows[0]?.id
  if (!userBId) {
    console.log('No test user B found — nothing to clean up.')
    process.exit(0)
  }
  // ON DELETE CASCADE on every per-user table's user_id FK (migration 0012
  // part 1) means deleting the auth.users row alone removes every row it owns.
  const { error } = await admin.auth.admin.deleteUser(userBId)
  if (error) throw new Error(error.message)
  console.log(`Deleted user B (${userBId}) and all rows owned via ON DELETE CASCADE.`)
} finally {
  await pg.end()
}
