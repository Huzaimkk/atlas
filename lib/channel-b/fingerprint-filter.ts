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
// The actual tokenizer/keyword-matching logic now lives in lib/fingerprint
// (shared with the diagnostic engine's fit-score computation, so both stay
// in agreement about what counts as a match) — this file just re-exports
// the relevance-gate pieces Channel B's ingest module imports.
export { extractFingerprintKeywords, isRelevant, type FingerprintKeywords } from '@/lib/fingerprint'
