import 'server-only'
import { supabaseAdmin } from '@/lib/supabase'

// Free-tier Supabase projects auto-pause after 7 days idle (confirmed
// directly this session) and DNS for the project hostname goes down with
// it. Every route that runs unattended (cron-triggered ingest, scheduled
// notifications) must check this FIRST and fail loudly — a dashboard
// quietly showing its empty state when the real cause is "the database
// went to sleep" is exactly the silent-failure shape that let
// Knight-Hennessy's deadline pass unnoticed. A failed health check must
// short-circuit the caller, not just get logged.
export async function checkSupabaseHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin.from('opportunities').select('id', { count: 'exact', head: true })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
