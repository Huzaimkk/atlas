import type { Deadline, EmailLog, GRESession, Professor } from '@/types/index'

const KEYS = {
  professors: 'atlas-profs',
  emailLog: 'atlas-email-log',
  greSessions: 'atlas-gre-sessions',
  greExamDate: 'atlas-gre-examdate',
  deadlines: 'atlas-deadlines',
} as const

export interface LegacyPayload {
  professors: Professor[]
  emailLog: EmailLog[]
  greSessions: GRESession[]
  greExamDate: string | null
  deadlines: Deadline[]
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/** Collects every pre-v2 localStorage key into one payload. Run once, client-side. */
export function collectLegacyStorage(): LegacyPayload {
  return {
    professors: readJSON(KEYS.professors, []),
    emailLog: readJSON(KEYS.emailLog, []),
    greSessions: readJSON(KEYS.greSessions, []),
    greExamDate: (typeof window !== 'undefined' && localStorage.getItem(KEYS.greExamDate)) || null,
    deadlines: readJSON(KEYS.deadlines, []),
  }
}

export function hasLegacyStorage(payload: LegacyPayload): boolean {
  return (
    payload.professors.length > 0 ||
    payload.emailLog.length > 0 ||
    payload.greSessions.length > 0 ||
    payload.deadlines.length > 0 ||
    !!payload.greExamDate
  )
}

/** Posts the collected payload to /api/migrate-legacy. Does not clear localStorage — that's a manual, separate step once the summary looks right. */
export async function migrateLegacyStorage() {
  const payload = collectLegacyStorage()
  if (!hasLegacyStorage(payload)) return { migrated: false as const }

  const res = await fetch('/api/migrate-legacy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Migration request failed: ${res.status}`)
  return { migrated: true as const, summary: await res.json() }
}
