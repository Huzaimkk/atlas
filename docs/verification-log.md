# Verification log

Things checked against the live system, with the date and how. An entry here
means verified, not assumed; anything still open is listed as open.

## Multi-tenant isolation — two-user test: VERIFIED (19 Nov 2026)

**Test.** Signed in to the deployed app as a second auth account
(`f61c02d7-…`, the real sign-in account) while all personal data still
belonged to the seeded user `de2223b9-…` from the multi-tenant backfill.

**Result: passed.**
- The second account saw the full shared pool (350 opportunities, which have
  no `user_id` and are readable by every authenticated user).
- It saw none of the other user's data: empty Profile, zero counters,
  "nothing needs you today". Every per-user table (`profile_snapshots`,
  `verdicts`, `gaps`, `gap_closures`, `applications`, `referees`,
  `command_log`, `outreach_log`, `inbox_leads`) returned nothing for it.

That is the intended behaviour of the `own rows only` policies in
`supabase/migrations/0012_multi_tenant_part1.sql`, observed end to end in
the product rather than only by `scripts/verify-multi-tenant-rls.mjs`.

**Follow-up, same day.** `scripts/repoint-user.mjs` moved the seeded user's
rows to the real account in one transaction. The account had 0 rows in every
table beforehand, so nothing collided.

| table | rows moved |
|---|---|
| profile_snapshots | 1 |
| verdicts | 350 |
| gaps | 308 |
| gap_closures | 0 |
| applications | 1 |
| referees | 5 |
| command_log | 4 |
| outreach_log | 0 |
| inbox_leads | 0 |

Afterwards, `fetchAtlasData` for the real account loaded with no errors.
The profile reads "BE Electronics Engineering (completed)". All 350
opportunities carry a verdict: GAP 188, NOT_YET_OPEN 56, EXPIRED 50,
UNEXAMINED 39, BLOCKED 15, READY 1, LATE_WINDOW 1. There are 71 gap groups,
29 actions, 1 application, 5 referees and 1 missed deadline.

The seeded user `de2223b9-…` now owns no rows. `scripts/rediagnose.mjs`
defaults to the real account (override with `ATLAS_USER_ID`).
