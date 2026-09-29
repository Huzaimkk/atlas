import { createClient } from '@supabase/supabase-js'

// Schema lives in supabase/migrations/0001_atlas_v2_schema.sql (spec §7).
//
// RLS on every table has no anon/authenticated policies — default deny.
// `supabase` (anon key) therefore has no access to any atlas table; it
// exists only for future browser-facing features that don't need one.
// All reads/writes go through `supabaseAdmin` from server-only code (API
// routes, Server Components) — never import it into a client component.

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
