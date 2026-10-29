import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

// The one chokepoint every per-user-table read/write in application code
// goes through. Reads the real Supabase session cookie (set by the P2 auth
// flow — sign-in page, magic link callback) — never a stub, never a
// fallback to some default/"owner" id. No session, no access: callers
// catch UNAUTHENTICATED and return 401, same as any other auth failure.
//
// Deliberately NOT cached across a request — a Server Component or route
// handler that needs the id more than once should call this once and pass
// the result down, not rely on this doing it for them.
export async function getSessionUserId(): Promise<string> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // route handlers/Server Components here never refresh the session themselves — that's the auth callback route's job
      },
    }
  )
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('UNAUTHENTICATED')
  return data.user.id
}
