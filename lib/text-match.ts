// Single source of truth for "does this whole word appear in this text."
// Three separate substring-collision bugs motivated pulling this out of
// wherever it had been hand-rolled: plain `.includes()`/inline regex let
// "ppo" match inside "opportunity" (lib/fingerprint.ts's relevance gate),
// "ens" match inside "Siemens", and "spar" match inside "OwlSpark" (both
// in the bulk xlsx-import's Corrections keyword matcher). Every one of
// those was a correct-looking `string.includes(token)` that quietly
// matched the token as a substring of an unrelated longer word. Route
// every future keyword/token match through here instead of re-deriving
// the same regex.

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Lookaround rather than \b: \b only fires at a transition between a word
// char and a non-word char, which silently fails to match a token that
// itself starts or ends on a non-word character (e.g. "c++" — the
// trailing \b after two '+' characters never fires, since neither side of
// that position is a word char). Explicit lookaround checks "no word char
// immediately adjacent" directly, so it's correct for any token shape.
const BOUNDARY = '[A-Za-z0-9_]'

/**
 * Whole-word, case-insensitive match of `token` inside `haystack`. A
 * hyphen (or any other non-word character) on either side counts as a
 * boundary exactly like whitespace does — "ppo" matches "PPO-based
 * training" but not "Opportunity" (no boundary before "ppo" — it's buried
 * inside one continuous word), and "spar" matches "SPAR fellowship" but
 * not "OwlSpark" for the same reason.
 */
export function matchesToken(haystack: string, token: string): boolean {
  if (!token) return false
  const pattern = `(?<!${BOUNDARY})${escapeRegExp(token)}(?!${BOUNDARY})`
  return new RegExp(pattern, 'i').test(haystack)
}

/**
 * Whole-word match of two tokens appearing adjacent, with flexible
 * whitespace between them (e.g. "machine learning" as one bigram, not two
 * independently-matching singles) — same boundary semantics as
 * matchesToken on each side.
 */
export function matchesBigram(haystack: string, a: string, b: string): boolean {
  if (!a || !b) return false
  const pattern = `(?<!${BOUNDARY})${escapeRegExp(a)}\\s+${escapeRegExp(b)}(?!${BOUNDARY})`
  return new RegExp(pattern, 'i').test(haystack)
}
