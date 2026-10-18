import { describe, expect, it } from 'vitest'
import { matchesBigram, matchesToken } from './text-match'

describe('matchesToken', () => {
  // The three production bugs this utility exists to prevent — each was a
  // plain `.includes()` substring check matching a token inside an
  // unrelated longer word.
  it('does not match "ppo" inside "Opportunity"', () => {
    expect(matchesToken('Opportunity_Research_EU_USA_UAE.xlsx', 'ppo')).toBe(false)
  })
  it('matches "ppo" as a real whole word', () => {
    expect(matchesToken('PPO is a reinforcement learning algorithm', 'ppo')).toBe(true)
  })

  it('does not match "ens" inside "Siemens"', () => {
    expect(matchesToken('Siemens Graduate Programme', 'ens')).toBe(false)
  })
  it('matches "ens" as a real whole word (ENS dates correction)', () => {
    expect(matchesToken('ENS Paris-Saclay MSc scholarship', 'ens')).toBe(true)
  })

  it('does not match "spar" inside "OwlSpark"', () => {
    expect(matchesToken('OwlSpark Accelerator', 'spar')).toBe(false)
  })
  it('matches "spar" as a real whole word (SPAR fellowship correction)', () => {
    expect(matchesToken('SPAR research mentorship fellowship', 'spar')).toBe(true)
  })

  // Hyphenation — a hyphen is not a word character, so it separates words
  // exactly like whitespace does, on either side of the token.
  it('matches a token separated from the rest of the text by a hyphen', () => {
    expect(matchesToken('state-of-the-art ppo-style training', 'ppo')).toBe(true)
  })
  it('matches a hyphenated token split across a hyphen boundary', () => {
    expect(matchesToken('cyber-physical systems research', 'cyber-physical')).toBe(true)
  })
  it('does not match a hyphenated token when the haystack has no hyphen at all', () => {
    expect(matchesToken('cyberphysical systems research', 'cyber-physical')).toBe(false)
  })

  // Case-insensitivity, both directions.
  it('matches regardless of haystack case', () => {
    expect(matchesToken('MBZUAI COMPUTATIONAL BIOLOGY TRACK', 'mbzuai')).toBe(true)
  })
  it('matches regardless of token case', () => {
    expect(matchesToken('mbzuai computational biology track', 'MBZUAI')).toBe(true)
  })

  it('returns false for an empty token', () => {
    expect(matchesToken('anything at all', '')).toBe(false)
  })

  it('escapes regex-special characters in the token', () => {
    expect(matchesToken('C++ developer (senior)', 'c++')).toBe(true)
    expect(matchesToken('C developer', 'c++')).toBe(false)
  })
})

describe('matchesBigram', () => {
  it('matches two words adjacent with normal spacing', () => {
    expect(matchesBigram('applied machine learning research', 'machine', 'learning')).toBe(true)
  })
  it('matches across irregular whitespace', () => {
    expect(matchesBigram('machine   learning   pipeline', 'machine', 'learning')).toBe(true)
  })
  it('does not match when the two words are not adjacent', () => {
    expect(matchesBigram('machine learning is not deep learning', 'deep', 'machine')).toBe(false)
  })
  it('does not match a bigram split by an unrelated word', () => {
    expect(matchesBigram('machine assisted learning', 'machine', 'learning')).toBe(false)
  })
  it('is case-insensitive', () => {
    expect(matchesBigram('Machine Learning Engineer', 'machine', 'learning')).toBe(true)
  })
})
