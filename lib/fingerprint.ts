// Shared word-overlap matching against the profile's research_fingerprint
// (profile v5 §2) — used both to gate Channel B aggregator noise
// (lib/channel-b/fingerprint-filter.ts) and to score fit on pool rows
// (lib/diagnostic-engine.ts). One tokenizer and one false-positive-aware
// keyword set, so the two don't drift into disagreeing about what counts
// as a match.
//
// Two false-positive classes were found and fixed while building the
// Channel B gate, and both apply here too:
//   1. Plain substring matching let "ppo" (from "PPO policy networks")
//      match inside the word "opportunity" itself. Fixed with word-
//      boundary matching, not substring.
//   2. Common English words that happen to appear inside a technical
//      fingerprint phrase ("policy", "state", "learning"...) are real
//      whole words, so they'd word-boundary-match in totally unrelated
//      contexts. These are demoted to WEAK_SINGLES: they only count as a
//      match when they appear as part of the original two-word phrase
//      they came from. A related case — "ai"/"ml" matching an unrelated
//      "AI safety" tag when the fingerprint's real AI use is "agentic AI
//      automation" — is handled separately, by a minimum token length
//      (see MIN_TOKEN_LENGTH) rather than the weak-singles list, since
//      2-letter tokens carry no signal at all on their own.

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

// Tokens shorter than this are dropped everywhere below (both sides of the
// comparison) — not just for noise reduction. It's load-bearing: "ai" and
// "ml" are 2 characters, and without this floor they'd register as
// standalone matches against tags like "AI safety" or "ML systems" that
// share nothing with the fingerprint beyond those two letters. The
// fingerprint's own genuine AI/ML usage ("agentic AI automation", "applied
// ML on scientific datasets") still matches — via the longer words next to
// "ai"/"ml" in the same phrase, which the bigram pass below picks up.
const MIN_TOKEN_LENGTH = 3

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
        if (w.length < MIN_TOKEN_LENGTH) continue
        if (CONNECTORS.has(w)) continue
        if (!WEAK_SINGLES.has(w)) singles.add(w)
      }
      for (let i = 0; i < words.length - 1; i++) {
        const [a, b] = [words[i], words[i + 1]]
        if (a.length < MIN_TOKEN_LENGTH || b.length < MIN_TOKEN_LENGTH || CONNECTORS.has(a) || CONNECTORS.has(b)) continue
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
 * Whole-word match against free text (e.g. an aggregator post's title +
 * excerpt): any safe single keyword, OR any bigram's two words appearing
 * adjacent (with flexible whitespace, to tolerate the source phrase's own
 * exact spacing). Binary — used as a relevance gate, not a score.
 */
export function isRelevant(text: string, keywords: FingerprintKeywords): boolean {
  const lower = text.toLowerCase()
  if (keywords.singles.some((kw) => new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i').test(lower))) return true
  return keywords.bigrams.some(([a, b]) => new RegExp(`\\b${escapeRegExp(a)}\\s+${escapeRegExp(b)}\\b`, 'i').test(lower))
}

/**
 * Continuous 0-100 overlap score for a short, curated piece of text (e.g.
 * an opportunity's field_tags joined together) against the fingerprint —
 * the fraction of the candidate's own meaningful words that the
 * fingerprint recognizes, via the same singles+bigram logic as
 * isRelevant(). Unlike isRelevant(), a word already used in CONNECTORS is
 * simply excluded from the denominator too, since field_tags are curated
 * labels, not noisy free text — every word in them is meant to carry
 * topic signal.
 *
 * Returns null when the candidate text has no scorable words at all (e.g.
 * empty field_tags) — never a fabricated 0 standing in for "no signal".
 */
export function overlapScore(candidateText: string, keywords: FingerprintKeywords): number | null {
  const words = tokenize(candidateText).filter((w) => w.length >= MIN_TOKEN_LENGTH && !CONNECTORS.has(w))
  if (words.length === 0) return null

  const singleSet = new Set(keywords.singles)
  const bigramSet = new Set(keywords.bigrams.map(([a, b]) => `${a} ${b}`))
  const matched = new Set<number>()

  for (let i = 0; i < words.length; i++) {
    if (singleSet.has(words[i])) matched.add(i)
  }
  for (let i = 0; i < words.length - 1; i++) {
    if (bigramSet.has(`${words[i]} ${words[i + 1]}`)) {
      matched.add(i)
      matched.add(i + 1)
    }
  }

  return Math.round((matched.size / words.length) * 100)
}
