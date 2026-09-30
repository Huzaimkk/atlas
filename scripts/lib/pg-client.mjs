import pg from 'pg'

// Supabase's direct db.<ref>.supabase.co host is IPv6-only. This machine's
// network has no IPv6 route (confirmed 2026-09-30: DNS resolves the AAAA
// record fine, but the TCP connect fails with "Network is unreachable").
// Supavisor's session pooler is IPv4-compatible and reaches the same
// database — fall back to it automatically rather than failing every
// script that touches DATABASE_URL.
export function createPgClient() {
  const raw = process.env.DATABASE_URL
  if (!raw) throw new Error('DATABASE_URL is not set')
  const url = new URL(raw)
  if (url.hostname.startsWith('db.') && url.hostname.endsWith('.supabase.co')) {
    const ref = url.hostname.split('.')[1]
    const poolerUrl = `postgresql://postgres.${ref}:${url.password}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres`
    return new pg.Client({ connectionString: poolerUrl })
  }
  return new pg.Client({ connectionString: raw })
}
