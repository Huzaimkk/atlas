// One-off: seed the referee roster from profile-snapshot-v5.md's "Likely
// referees" list (§6, open item #9: "name the three" — still unresolved,
// so all 5 named candidates are seeded, not just 3; the Today counter's
// target denominator of 3 is a UI constant, not this table's row count).
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const CANDIDATES = [
  { name: 'Mirza Shahid', affiliation: 'Senior Member IEEE', relationship: 'Co-author (AI-DTC paper) — strongest candidate' },
  { name: 'DOW Medical University contact', affiliation: 'DOW Medical University', relationship: null },
  { name: 'A DUET professor', affiliation: 'DUET', relationship: null },
  { name: 'Aisha Steel or Petrochem manager', affiliation: 'Aisha Steel / Petrochem', relationship: 'Manager' },
  { name: 'DeepLearning.AI program contact', affiliation: 'DeepLearning.AI', relationship: 'Program contact' },
]

const { data: existing } = await sb.from('referees').select('name')
const existingNames = new Set((existing ?? []).map((r) => r.name))
const toInsert = CANDIDATES.filter((c) => !existingNames.has(c.name))

if (toInsert.length === 0) {
  console.log('All candidates already seeded, nothing to do.')
  process.exit(0)
}

const { data, error } = await sb.from('referees').insert(toInsert).select('name')
if (error) {
  console.error('Insert failed:', error.message)
  process.exit(1)
}
console.log(`Seeded ${data.length} referee candidates:`, data.map((r) => r.name))
