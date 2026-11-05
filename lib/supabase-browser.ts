import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client for the sign-in screen — writes the session
// to cookies via @supabase/ssr so lib/auth-server.ts's server-side
// getSessionUserId() can read the same session on the next request.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
