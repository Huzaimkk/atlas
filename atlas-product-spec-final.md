# Atlas — Product Spec

**Status:** draft, open for revision
**Written:** 27 October 2026
**Relationship to `atlas-v2-spec1.md`:** v2-spec1 stays authoritative for the diagnostic engine, verdict taxonomy, standard of proof and ingest channels. Nothing in it is repealed here. This document describes the change from a single-operator command center to a product other people can use.

---

## 1. What changes

Atlas today assumes exactly one user. Not by accident — every design decision was correct for one operator:

- No `user_id` on any table
- `profile_snapshots.is_current` enforces one current profile **globally**
- RLS is default-deny with **zero policies**; all access is service-role, server-side
- No authentication of any kind
- `post_degree_hours()` reads *the* current profile

The product version keeps the engine and changes the container around it.

**The core loop stays the same and is the whole point:** a profile goes in, every opportunity in the pool gets a verdict about *that person specifically*, and the gaps are ranked by how many rows each one unblocks. Atlas does not return a list of links. It returns a position.

---

## 2. Schema: shared vs per-user

The split matters more than any other decision here.

### Shared — one copy, everyone reads it

| Table | Why shared |
|---|---|
| `opportunities` | **This is the asset.** 323 verified rows with quoted eligibility rules and source URLs. A new user inherits all of it on signup. |
| `page_snapshots` | Change detection is per-page, not per-user. |
| `sources` | A fetch record is about a page, not a person. Per-user sources would multiply HTTP and Serper cost by the user count against the same hundred pages — see §5. |

Verified rows are the compounding advantage. One user's manual addition becomes everyone's row. The pool gets better with scale instead of just more expensive.

### Per-user — needs `user_id`, needs RLS

`profile_snapshots` · `verdicts` · `gaps` · `gap_closures` · `applications` · `referees` · `command_log` · `outreach_log` · `inbox_leads`

`outreach_log` holds third-party email addresses — professors, programme officers. Same PII category as `referees`. It must never appear in a shared view or any aggregate.

### Two boundaries that are easy to get wrong

**A shared fetch record saves money; a shared watchlist leaks intent.** "This URL was last fetched at T with status S" is infrastructure. "This user is watching this lab" is private — which labs someone follows says what they intend. If both currently live in `sources`, split them: `sources` stays shared, and `watchlist (user_id, source_id)` carries RLS.

**`inbox_leads` is a private staging area that promotes into a shared table.** A dropped lead is unverified and personal. Once verified against the programme's own page it becomes an `opportunities` row everyone sees, and the shared row carries no reference back to who dropped it. This promotion is the mechanism §2's "the pool compounds with users" actually runs on.

### Migration notes that will bite if missed

1. **`profile_snapshots.is_current`** is currently a global one-row constraint. It becomes unique **per `user_id`**. A partial unique index on `(user_id) where is_current` is the clean form.
2. **`post_degree_hours()`** takes a `user_id` argument instead of reading the current profile.
3. **`gap_queue`** already has `security_invoker = true` (migration 0002, after a verified leak). It needs `user_id` in its projection, and that `security_invoker` setting is now load-bearing — do not remove it.
4. **Do this migration while the data is small.** 323 rows and one user is an afternoon. Ten thousand rows and real users is a weekend with downtime.

---

## 3. Isolation model

Two valid patterns. We take the safer one, because this codebase has already shipped one cross-tenant-shaped leak.

**Chosen: RLS-enforced.** Clients read with the user's JWT; Postgres policies keyed to `auth.uid()` enforce isolation. A bug in application code cannot leak another user's data, because the database refuses.

**Rejected: service-role everywhere, scoped in app code.** Simpler, and one missed `.eq('user_id', …)` exposes everything.

Service-role access survives in exactly one place: the diagnosis worker, which legitimately writes verdicts across users. It must scope every write by `user_id` explicitly, and it is the only code path allowed to hold that key.

**Auth:** Supabase Auth, email + one OAuth provider. No custom session handling.

---

## 4. Product surfaces

### 4.1 Home

Profile summary, live counters, and the **profile enhancer** — the Gap Queue inverted. Instead of per-opportunity gaps, aggregate: *"These five things unlock 40 rows. This one unlocks 12 on its own."*

Mostly computed already; unblock-counts exist.

### 4.2 CV intake

Drag and drop. **Parse produces a draft, never a profile.**

This is the hard part and it is not a parsing problem. `profile-snapshot-v5.md` took hours of interrogation and v4 still shipped wrong — it called a paper "near submission-ready" when no hardware testing had happened. No parser catches that.

The engine's verdicts are only as good as the profile, and a thin profile produces *confidently wrong* verdicts. v2-spec1's standing principle applies to strangers too: a wrongly BLOCKED row removes an opportunity silently and permanently.

So intake is two stages:

1. **Parse** — extract what's on the page. Degrees, dates, roles, publications, scores.
2. **Interview** — fill what a CV structurally cannot say. *"Your BE completed January 2026. Were you employed during the degree? Those hours don't count toward post-degree requirements."* Papers get a real status, not a title. Test scores get a date, because validity windows expire.

**The interview is the moat.** Anyone can parse a PDF.

Every field carries provenance: parsed, user-stated, or inferred. Inferred fields never produce BLOCKED.

### 4.3 Sections

Existing categories and tracks, surfaced as navigation: conferences and CFPs · PhD and master's · research directions · founder and VC · events and travel.

### 4.4 Email crafter

Drafts outreach to professors, programme officers, potential referees. Needs a working LLM key — CometAPI quota has been zero for weeks, so this is blocked on credentials, not code.

**Reply tracking, not open tracking.** Detect replies via Gmail/IMAP. Open-tracking pixels on cold emails to academics are reputationally poor and consent-regulated in the EU. The reply is the signal worth having.

### 4.5 Referee letters

First-class, because it is the universal bottleneck. A referee-facing page: upload once, reuse across applications, see what's outstanding. Counter reads **letters secured**, not contacted — contacted is not the thing that matters.

### 4.6 Network

**Cohort visibility, inside Atlas.** *"Four users with similar profiles applied here."* Opt-in.

This replaces LinkedIn automation deliberately — see §6.

---

## 5. Scale

**Re-diagnosis is the cost center.** 323 rows × 1 user is four seconds. 1,000 rows × 1,000 users, delete-and-reinsert on every run, is the entire economics of the product.

Incremental re-diagnosis is already on the Phase E backlog. Multi-tenant makes it mandatory. Re-diagnose on profile change or opportunity change, per user, queued — never the whole cross product.

**`page_snapshots` must store a content hash plus extracted text, not full page HTML.** Full HTML runs 100–500 KB per snapshot; weekly diffing across a hundred watched pages is roughly 80 MB a month, which exhausts the 500 MB free tier in about six months with a single user. A hash answers the only question being asked — *did this page change?* — in 64 bytes. Migrate while the table is still small.

**Free-tier limits that are not about size.** The project auto-pauses after 7 idle days and silently kills cron; nothing surfaces as an error, the pool simply stops growing. And there is no point-in-time recovery, so the verified pool — weeks of research — has no restore path. A gitignored weekly `pg_dump` costs nothing and covers the only unrecoverable risk. Pro buys no-pause and 7-day PITR, and is worth it once cron carries weight or anyone besides the author depends on the data.

---

## 6. Deliberately not building

**Visa advice.** Immigration advice is regulated in the US, UK and EU; giving it without authorization is legal exposure, not product risk. Ship document checklists, deadline timelines, and sourced statements of fact — *"this programme's page states it sponsors F-1"* — held to the same §5.6 standard as every other rule. Never *"you should apply under this category."*

**LinkedIn automation.** No official API for connection requests, automating them breaks LinkedIn's terms, and the penalty lands on the user's account. Channel A has been manual for good reason. Ship "here are twelve people in your field at this institution, and a drafted message" — the user sends it.

**Open-tracking pixels.** See §4.4.

---

## 7. What makes this defensible

1. **Verdict provenance.** Every competitor returns "87% match." Atlas returns *"BLOCKED — this page states 2,800 post-degree work hours, you have 1,500, here is the link."* The §5.6 standard of proof is the product, not an implementation detail.
2. **The shared verified pool**, compounding with every user.
3. **The intake interview**, which is where profile fidelity actually comes from.

---

## 8. Build order

**P1 — Infrastructure.** `user_id` across the seven per-user tables, RLS policies keyed to `auth.uid()`, shared/per-user split, Supabase Auth, `post_degree_hours(user_id)`, `is_current` unique per user. No new features.

**P2 — Product shell and design.** Home with profile enhancer, section navigation, CV dropzone, settings, auth screens. Interview, email and network are stubbed with real routes and placeholder internals.

**P3 — Intake.** Parse plus interview, with provenance per field.

**P4 — Email and referees.** Blocked on an LLM key.

**P5 — Incremental re-diagnosis.** Before any real user count.

**P6 — Network.** Opt-in cohort visibility.

P1 and P2 are the current scope. Everything after is sequenced, not scheduled.

---

## 9. Standing principle, carried forward from v2-spec1

> The pool exists to widen the search, not narrow it. A wrongly READY row costs an afternoon. A wrongly BLOCKED row removes an opportunity silently and permanently. When uncertain, surface it.

This mattered for one user. For strangers, nobody is checking the engine's reasoning, so it matters more.
