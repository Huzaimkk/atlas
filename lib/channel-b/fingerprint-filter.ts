// Pre-insert relevance filter (user instruction, Channel B build): these
// aggregators post high volume across every field, not just the profile's
// research fingerprint (profile v5 §2) — most of it is irrelevant and
// should never reach the pool at all, let alone get a second fetch to
// resolve its official link.
//
// This is a volume filter, not a diagnostic — it decides whether an item
// is worth creating a lead for, not whether the lead is eligible. That's
// still diagnoseOne()'s job once the row exists.
//
// Two false-positive classes were found and fixed while building this:
//   1. Plain substring matching let "ppo" (from "PPO policy networks")
//      match inside the word "opportunity" itself — which appears in
//      nearly every post title on an opportunities aggregator. Fixed with
//      word-boundary (\b) matching, not substring.
//   2. Word-boundary matching alone wasn't enough: common English words
//      that happen to appear inside a technical fingerprint phrase
//      ("policy", "state", "learning", "scientific"...) are real whole
//      words, so they correctly word-boundary-matched "Global Policy
//      Conferences" — just against the wrong sense of "policy". These are
//      demoted to WEAK_SINGLES below: they only count as a signal when
//      they appear as part of the original two-word phrase they came from
//      ("policy networks", "machine learning"), never alone.

const CONNECTORS = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'into', 'via', 'using', 'based', 'on', 'of', 'in',
  'to', 'a', 'an', 'as', 'at', 'by', 'or', 'is', 'are',
])

// Real whole words, but too generic to trust as a standalone signal —
// only count when matched as part of the bigram phrase they came from.
const WEAK_SINGLES = new Set([
  'policy', 'state', 'drive', 'direct', 'scientific', 'networks', 'learning', 'machine', 'deep', 'edge',
  'deployment', 'estimation', 'simulated', 'datasets', 'prediction', 'healthcare', 'control', 'modelling', 'systems',
])

function tokenize(text: string): string[] {
  return text
    .split(/[\s,/()]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
}

export interface FingerprintKeywords {
  /** Safe to match on their own — acronyms and specific technical terms (e.g. "pmsm", "biosignal", "cyber-physical"). */
  singles: string[]
  /** Only count as a match when the exact adjacent pair appears (e.g. "machine learning", "policy networks"). */
  bigrams: [string, string][]
}

export function extractFingerprintKeywords(fingerprint: string[]): FingerprintKeywords {
  const singles = new Set<string>()
  const bigrams = new Set<string>()
  const bigramPairs: [string, string][] = []

  for (const phrase of fingerprint) {
    const parenMatch = phrase.match(/\(([^)]+)\)/)
    const mainPart = phrase.replace(/\([^)]*\)/g, '')
    const parenPart = parenMatch?.[1] ?? ''

    for (const part of [mainPart, parenPart]) {
      const words = tokenize(part)
      for (const w of words) {
        if (w.length < 3) continue
        if (CONNECTORS.has(w)) continue
        if (!WEAK_SINGLES.has(w)) singles.add(w)
      }
      for (let i = 0; i < words.length - 1; i++) {
        const [a, b] = [words[i], words[i + 1]]
        if (a.length < 3 || b.length < 3 || CONNECTORS.has(a) || CONNECTORS.has(b)) continue
        const key = `${a} ${b}`
        if (bigrams.has(key)) continue
        bigrams.add(key)
        bigramPairs.push([a, b])
      }
    }
  }

  return { singles: [...singles], bigrams: bigramPairs }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Whole-word match against the given text (title + excerpt): any safe
 * single keyword, OR any bigram's two words appearing adjacent (with
 * flexible whitespace, to tolerate the source phrase's own exact spacing).
 */
export function isRelevant(text: string, keywords: FingerprintKeywords): boolean {
  const lower = text.toLowerCase()
  if (keywords.singles.some((kw) => new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i').test(lower))) return true
  return keywords.bigrams.some(([a, b]) => new RegExp(`\\b${escapeRegExp(a)}\\s+${escapeRegExp(b)}\\b`, 'i').test(lower))
}
