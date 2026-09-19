# Atlas v2 — Improvement Spec

**Prepared for:** Huzaim Akhtar
**Date:** 14 September 2026 · confirmed and locked 15 September 2026
**Status:** LOCKED — cleared for build agent handoff
**Supersedes:** current `app/page.tsx` toolkit-and-trackers model

---

## 0. The one-line change

Atlas today is a **directory plus a writing toolkit**. Atlas v2 is a **diagnostic engine**.

The difference: today, Atlas can show you that the University of Bonn had two funded PhD slots. It cannot tell you whether you were eligible, what you were missing, or that the deadline passed on 14 August. v2 answers all three, on every row, automatically.

Every opportunity in the system carries a verdict about *you specifically*. Nothing is just listed.

---

## 1. Why the current model fails

Evidence, drawn from the screenshot-derived opportunities file dated today:

| Problem | Evidence | Consequence |
|---|---|---|
| **Decay** | 12 of ~40 dated entries already expired. Bonn 14 Aug, UTD 23 Aug, Augsburg 1 Aug, Stanford Biodesign 27 Aug, MSCA 9 Aug, Schmidt Oxford 31 Aug, CERN 30 Jun, HKS PPLC 10 Jul, AI2ML 21 Jun, Future Minds 15 Jun, HGHI 23 Aug, UN Nippon 13 Sep | A static list is wrong within ~60 days and gives no signal that it is wrong |
| **No eligibility check** | "Gates Scholarship, deadline Sept 15" is the US Gates Scholarship, restricted to US citizens. Listed as actionable for a Pakistani applicant | Wasted effort on structurally impossible applications |
| **Unverified facts** | Ruogu Fang listed at Vanderbilt; needs verification against her lab page before any outreach | A cold email to the wrong institution destroys credibility on first contact |
| **Signal-to-noise** | ~30% of the file is not opportunities: AWS cert number, Jensen Huang anecdote, a third party's Toronto offer letter, DGX Spark benchmarks | Real deadlines get buried |
| **No gap analysis** | No row states what you would need in hand to apply | You cannot prioritise, because you cannot see which single missing item unblocks the most doors |
| **Fragile storage** | Kanban, email log, deadlines, GRE tracker all in `localStorage` | Clearing site data erases the campaign |

---

## 2. Architecture — three layers

```
  LAYER 1               LAYER 2                  LAYER 3
  Profile Engine   →    Opportunity Pool    →    Diagnostic Engine
  (who you are)         (what exists)            (verdict per row)
       ↑                      ↑                        ↓
   your CV              source ingest          Action Queue + Gap Queue
                        + verification
```

Layer 3 is the product. Layers 1 and 2 are inputs to it.

---

## 3. Layer 1 — Profile Engine

Replaces the hand-written identity blob in `lib/profile.ts`.

**Input:** your CV, plus a short structured intake for things a CV omits.

**Stored fields:**

- **Identity & constraints** — citizenship (Pakistan), current degree level, current institution, funding requirement (fully funded only), term flexibility (any), geography (any)
- **Credentials** — degrees with dates and CGPA, IELTS/TOEFL status and score, GRE status and score, certifications
- **Research fingerprint** — 5–8 subfields you can credibly claim, phrased the way professors phrase them in calls for students. This is the matching key. Not "AI" but e.g. "multimodal clinical foundation models," "uncertainty-aware inference"
- **Evidence record** — publications with authorship position and venue, preprints, patents, open-source with stars/usage, ClinCell and any other venture work with metrics
- **Teaching & service** — TA/GTA history, mentoring, review work. Required separately because GTA eligibility often turns on this and nothing else
- **Document inventory** — which of {SOP, research statement, CV variants, transcripts, LOR commitments, writing sample, portfolio} exist today, and their state
- **Network** — professors already contacted, with date and outcome

**Output:** a `ProfileSnapshot` object, versioned. Every diagnostic result records which snapshot version produced it, so verdicts refresh automatically when the profile changes.

> **BLOCKED.** This layer cannot be built until the CV is uploaded. Everything downstream of it is also blocked. This is the critical path.

---

## 4. Layer 2 — Opportunity Pool

One table, one row per opportunity, all four tracks in the same table.

### Schema

| Field | Notes |
|---|---|
| `id` | |
| `title` | |
| `track` | `phd_funded` · `gta` · `ra` · `postdoc` · `scholarship` · `fellowship` · `conference` · `internship` · `accelerator` |
| `institution` / `organiser` | |
| `country`, `region` | |
| `supervisor` | name, email, lab URL — for professor-led rows |
| `field_tags[]` | matched against research fingerprint |
| `funding` | stipend amount + currency, tuition, insurance, travel. Structured, not prose |
| `eligibility` | citizenship rules, degree level, age caps, language test requirement, GRE requirement, gender/region restrictions |
| `requirements[]` | itemised deliverables: SOP, 2× LOR, transcript, research proposal, writing sample, GRE, IELTS 6.5 |
| `opens`, `deadline` | both tracked; `rolling` flag where applicable |
| `status` | `not_yet_open` · `open` · `closing_soon` · `expired` · `rolling` — computed daily, never hand-set |
| `tier` | T1 reach · T2 realistic · T3 volume |
| `apply_url`, `source_url` | `source_url` must be primary. Screenshots are discovery, never citation |
| `verified_on` | date of last check against `source_url` |
| `source_type` | `official` · `aggregator` · `social` · `manual`. Aggregator rows are never actionable until resolved to official |
| `verification_level` | `verified` (checked against a live page) · `pattern` (inferred from the program's usual annual cycle, date **not** confirmed) · `conflicting` (two sources disagree) |
| `scam_risk` | flag for unsolicited offers, application fees on free programs, non-institutional contact domains |
| `origin` | `screenshot` · `pdf` · `txt` · `search` · `manual` |

### 4b. Canonical categories — the shape of the pool

These nine categories are the domain model. The research loop (§9d) expands *within* them continuously; it does not invent new ones without your sign-off.

| # | Category | Examples in seed corpus |
|---|---|---|
| 1 | **AI safety / AI research fellowships** | MATS Fellowship, MATS Residency, Anthropic Fellows, Claude Corps, SPAR, Pivotal, GovAI, ERA Cambridge, LASR, Constellation Astra, IAPS |
| 2 | **Fully funded master's & PhD scholarships** | Chevening, Knight-Hennessy, Gates Cambridge, Commonwealth, Swiss Excellence, DAAD EPOS, ETH ESOP, Erasmus Mundus, Schwarzman, Fulbright/USEFP |
| 3 | **Fully funded PhD programs & industry PhD fellowships** | OIST, ELLIS, Apple Scholars, Google PhD Fellowship, Max Planck IMPRS, MSCA Doctoral Networks, KAUST, MBZUAI, Vector/Mila, HEC schemes |
| 4 | **Professor-led funded positions (PhD / GTA / RA / postdoc)** | Individual lab openings — sourced per §9b Channel C |
| 5 | **Research internships** | Mitacs Globalink, OIST, DAAD RISE, CERN, EPFL, KAUST VSRP, ETH SSRF, Amgen |
| 6 | **Founder, builder & startup programs** | Y Combinator, Thiel, Emergent Ventures, a16z speedrun, Antler, Techstars, EF, NVIDIA Inception |
| 7 | **Conferences & CFPs** | NeurIPS, ICML, ICLR, IEEE calls, student volunteer programs, the Riyadh conference |
| 8 | **Postdoctoral fellowships** | MSCA Postdoctoral, Humboldt, Schmidt AI in Science, Schlumberger Faculty for the Future |
| 9 | **Pattern-based annual cycles** | Rhodes, Clarendon, MEXT, GKS, Türkiye Bursları, CSC, Stipendium Hungaricum, Aga Khan, Rotary Peace, Australia Awards. All `verification_level: pattern` until confirmed |

A tenth bucket, **Notes & Inspiration**, sits outside the pool entirely. Non-opportunity content (founder anecdotes, tech news, study-habit lists, other people's offer letters and certification numbers) goes there so it never pollutes opportunity retrieval. Personal data belonging to third parties gets stripped before anything reaches the agent.

### Tiering

- **T1 — Reach.** Prestige, low odds, high cost to apply. Knight-Hennessy, Gates Cambridge, Clarendon, Schwarzman, HBS. **Capped at 5 concurrently active applications, enforced by the system** — the Action Queue refuses to promote a 6th T1 row to active without first archiving or withdrawing one (§10.6).
- **T2 — Realistic.** Strong fingerprint match, credible odds, meaningful funding. Most professor-led funded PhD and GTA/RA rows. **This is where volume should go.**
- **T3 — Volume and opportunistic.** Cheap to apply, rolling, or adjacent to the main goal. Rolling lab posts, CFPs, a16z Speedrun, YC.

---

## 5. Layer 3 — Diagnostic Engine ← *the thing you asked for*

For every row in the pool, against the current profile snapshot, produce one verdict.

### 5.1 Verdict taxonomy

| Verdict | Meaning | Surfaced as |
|---|---|---|
| **READY** | Every eligibility rule passes and every requirement is already in your document inventory | Action Queue, sorted by deadline |
| **GAP** | Eligibility passes, but *N* requirements are missing. Each gap named individually, with time and cost to close | Gap Queue, sorted by unblock-count |
| **BLOCKED** | A structural bar you cannot fix: citizenship, degree level, age, gender, region | Collapsed by default, with the reason shown. Never silently dropped — you should be able to see *why* it's out |
| **IRRELEVANT** | Fingerprint match below threshold, or track you've deselected | Hidden, reviewable on demand |
| **LATE_WINDOW** | Deadline passed, but the organiser explicitly accepts late applications | Action Queue, flagged urgent. Discovered via MATS Winter 2027 — a naive system marks this EXPIRED and you lose a live opportunity |
| **EXPIRED** | Deadline passed, no late route | Archived, but kept — most annual programs recur, so an expired row becomes next cycle's early warning |
| **NOT YET OPEN** | `opens` is in the future | Watchlist with an alert on the open date |

### 5.2 Gap taxonomy

When a row is GAP, the missing item is classified, because different gap types demand different responses:

| Gap type | Examples | Typical time to close |
|---|---|---|
| **Credential** | IELTS/TOEFL, GRE, a required degree | Weeks to months, costs money |
| **Document** | SOP, research proposal, writing sample, CV variant | Hours to days, Atlas's agents already do this |
| **Endorsement** | LORs, referee commitments | Weeks, depends on other people, start earliest |
| **Record** | First-author publication, preprint, citation count | Months, sometimes not closable before deadline |
| **Experience** | Teaching hours for GTA, specific lab technique | Months |
| **Contact** | No prior email exchange with the PI | Days, highest leverage per hour spent |

### 5.3 The Gap Queue — the key output

Gaps aggregate across the whole pool, then sort by **unblock count**:

```
IELTS 6.5          → unblocks 47 opportunities   → ~3 weeks, ~$250   → START NOW
2× LOR secured     → unblocks 31 opportunities   → ~4 weeks, free    → START NOW
Research proposal  → unblocks 12 opportunities   → ~2 days, free     → agent-assisted
GRE quant 160+     → unblocks 4 opportunities    → ~6 weeks, $220    → LOW PRIORITY
```

This is the answer to *"where am I lacking."* It turns a scattered list of missing items into a single ranked queue where the top row is objectively the highest-value thing you can do this week.

### 5.4 Fit score

Separate from eligibility and computed only for rows that pass it. Composed of fingerprint overlap with `field_tags`, supervisor publication alignment, funding adequacy, and tier-adjusted odds. Fit never overrides eligibility — a perfect-fit row you're barred from is still BLOCKED.

### 5.5 Re-diagnosis trigger

`profile_snapshots` is versioned (§3). Any write that creates a new version — CV re-upload, a new IELTS/GRE score, a closed document gap — fires a re-diagnosis job: every non-`EXPIRED`, non-archived row in the pool is re-run through Layer 3 against the new snapshot. Results are written as new rows in `verdicts`, tagged with the snapshot version that produced them, rather than overwritten in place. Two consequences:

- The Gap Queue and Action Queue always reflect the current snapshot, automatically, with no manual "recheck" step
- Verdict history stays auditable — you can see *when* a row flipped from BLOCKED to GAP, and what change caused it

This is the mechanism §3 refers to when it says verdicts "refresh automatically when the profile changes" — stated here explicitly because it's the thing that keeps the whole engine from going stale the same way the current static list does (§1).

---

## 6. Source and verification protocol

**Screenshots stay as a discovery channel.** You spot things no crawler surfaces. But a screenshot never enters the pool as fact. It enters as a *lead* with `confidence: unverified`, and gets resolved against a primary source before it's shown as actionable.

### Primary sources by track

| Track | Sources |
|---|---|
| Funded PhD / RA / postdoc | EURAXESS, FindAPhD, jobRxiv, AcademicJobsOnline, Nature Careers, HigherEdJobs, individual lab pages |
| GTA | University department and graduate-school assistantship pages. Rarely aggregated — needs targeted per-institution search |
| Scholarships | Official program sites only: DAAD, Chevening, Commonwealth, Erasmus Mundus catalogue, USEFP for Fulbright Pakistan, MEXT, GKS, CSC, Aga Khan. ProFellow and PhDportal for discovery only |
| Conferences / CFPs | WikiCFP, IEEE and ACM calendars, the conference's own CFP page |
| Founder / VC | Program pages direct: a16z Speedrun, YC, Schmidt, Knight-Hennessy |

### Freshness rules

- Any row with `status: open` and `verified_on` older than **21 days** is re-checked before it appears in the Action Queue
- Any row inside **14 days of deadline** is re-checked daily
- Failed verification moves the row to `confidence: conflicting` and flags it for manual review rather than silently deleting it

`/api/search` (Serper) already exists in the codebase and is currently orphaned. **This is what it gets wired to.**

### 6b. Scheduling & cost budget

Every cadence in §9d needs an actual trigger, not just a stated frequency. Sweeps and polls run as **Vercel Cron Jobs**, declared in `vercel.ts`, each hitting a dedicated API route per cadence tier — weekly, monthly, and daily-inside-14-days-of-deadline. No sweep runs client-side or on page load; the diagnostic engine only ever reacts to data that a cron job already wrote.

Budget this before building, not after:

- **Channel B** (§9b) sweeps all nine categories (§4b) through Serper, which is metered. The free 2,500 searches/month is a development-only budget — plan against a paid Serper tier once sweeps run continuously on schedule rather than on demand.
- **Channel C** polling (§9b, C2) is a direct HTTP fetch against known lab URLs, not a Serper query, so it doesn't draw on the same quota — but at 150–300 pages a week that's still 600–1,200+ function invocations a month to plan Vercel usage around (see §6b's batching note carried into §9b and Phase 6 below).

---

## 7. Persistence

Move off `localStorage`. The draft schema in `lib/supabase.ts` gets written and run, with these corrections:

- Replace every `create policy "Allow all" ... using (true)` — as drafted, anyone holding the public anon key gets full read and write on every table
- Tables: `profile_snapshots`, `opportunities`, `verdicts`, `gaps`, `applications`, `outreach_log`, `sources`, `page_snapshots`
- `page_snapshots` stores the last-fetched content (or a content hash, to keep row size sane) per monitored lab URL, keyed by `lab_url` + `fetched_at`. Channel C's weekly diff (§9b, C2) compares each new fetch against the most recent row here — it's the thing that makes "diff against last snapshot" possible instead of re-deriving state from `opportunities` on every poll
- Migrate existing localStorage state on first run rather than discarding it

---

## 8. Existing Atlas cleanup, folded in

| Item | Action |
|---|---|
| `COMET_API_KEY` in plain text at DEPLOY.md line 30 | **Rotate the key at CometAPI, replace with a placeholder.** Do this before any push to GitHub |
| `components/ui/AgentPanel.tsx` (unused, 205 lines) | Delete. `components/agents/` version is canonical |
| `components/ui/UniversitiesTable.tsx` (unused) | Promote — it's sortable and filterable, which the pool needs. Delete the inline plain table in `app/page.tsx` |
| Settings API-key form | Remove. It writes to `localStorage` that nothing reads. Keys live in `process.env` server-side |
| `/api/send-email` (orphaned) | Wire to outreach. Email Log status currently only ever changes by hand |
| `/api/pdf` (orphaned) | Wire to export, replacing the plain-text Blob download |
| `window.atlasLogEmail` | Dead bridge. Remove, along with the duplicate logging logic in `app/page.tsx` |
| `@dnd-kit`, `jspdf`, `html2pdf.js`, `html2canvas`, `lucide-react`, `clsx` | Six deps, zero imports. Remove or use |
| Professor list duplicated in `TOP_PROFESSORS` and `DEFAULTS` | Single source. Both become views of `opportunities` |
| `--font-space` / `--font-mono` never defined | `app/layout.tsx` fakes `next/font` with plain objects, so body text falls back to browser default. Fix or drop |

---

## 9. Build phasing

| Phase | Deliverable | Blocked by |
|---|---|---|
| **0** | Rotate the committed API key | Nothing — do today |
| **1** | Supabase schema with real RLS, `page_snapshots` included, migration off localStorage | Nothing |
| **2** | Profile Engine from CV, fingerprint confirmed by you before use | **CV upload** |
| **3** | Pool seeded with live rows from the screenshot file, each verified against primary source | Phase 1 |
| **4** | Diagnostic Engine: verdicts, gap classification, Gap Queue, re-diagnosis trigger on snapshot version change (§5.5) | Phases 2 + 3 |
| **5** | Channel B ingest: Serper sweeps on a Vercel Cron schedule (§6b), freshness SLA enforced | Phase 3 |
| **6** | Channel C: lab-page watchlist (C1) + weekly diff-and-alert polling (C2), batched into chunks against `page_snapshots` so a sweep can't exceed a Vercel function timeout (§9b) | Phases 1 + 2 |
| **7** | Existing 8 agents re-pointed to read from profile + opportunity row instead of free-text forms | Phase 4 |
| **8** | Socials. Reuses the profile engine so LinkedIn voice and outreach voice stay consistent | Phase 2 |

---

## 9b. Sourcing model for professor-led positions

**Premise: the model cannot do this alone.** Asking an LLM to recall which professors are recruiting produces confident, wrong answers — this is the origin of the Ruogu-Fang-at-Vanderbilt error. The current Professor Discovery agent has this flaw structurally: it relies on model knowledge with no verification step. Rule for v2: **model proposes, search verifies, human confirms T1.**

Three channels, different economics:

### Channel A — Manual social (LinkedIn, Instagram)
**Stays human. Permanently.** LinkedIn prohibits scraping, runs aggressive anti-bot measures, and post-level content is not reliably reachable via Serper.

What gets automated is *capture, not discovery*: paste a post body or drop a screenshot, a parser extracts `supervisor / institution / field / deadline / contact` into a lead with `origin: screenshot`, `confidence: unverified`. Resolution against a primary source happens before it becomes actionable.

- Volume: low · Serendipity: high · Precision before verification: low

### Channel B — Structured boards, automated via Serper
Machine-readable, real deadlines, PI-led funded posts:
EURAXESS · jobRxiv · AcademicJobsOnline · HigherEdJobs · Nature Careers · FindAPhD

Scheduled queries filtered by research fingerprint. Runs continuously.

- Volume: high · Serendipity: low · Precision: medium

### Channel C — Targeted search + lab-page monitoring ← *highest value, currently absent*

Two stages:

**C1 — Build the watchlist from publications, not from social media.**
Take the research fingerprint from Layer 1. Search recent publications in those exact subfields. Extract corresponding author → institution → lab URL. This surfaces professors who work on your problems *including the majority who never post on LinkedIn at all*.

Target: pilot at ~50 verified lab URLs (§10.10), expand toward 150–300 once C1/C2 are proven at pilot scale.

**C2 — Poll and diff.**
Weekly fetch of each lab's `Openings` / `Join Us` / `Prospective Students` page, batched into chunks (e.g. 25–50 URLs per cron invocation, not all 150–300 in one run) so a full sweep can't exceed a single Vercel function's timeout. Diff each fetch's content against the matching row in `page_snapshots` (§7). Any change fires an alert.

This reads the source the professor actually edits — typically days or weeks ahead of any social post, if one ever appears.

- Volume: medium · Precision: **highest of the three** · Requires: Layer 1 complete

**Consequence for the toolkit:** Professor Discovery stops outputting recalled names and starts outputting a *verified, monitored watchlist*. Its output becomes an asset that compounds, not a one-shot list.

---

## 9c. Seed corpus — Day 1 pool content

**Source:** `Global_Opportunities_MASTER_2026-27.md`, compiled 15 Sep 2026. Roughly 60 entries with source lines, already categorised and already carrying verified/pattern tags. This is the Day-1 pool, not a lead sheet — it imports directly into the §4 schema.

**Import mapping:**

| Master file convention | Schema field |
|---|---|
| URGENT / OPEN / OPENING SOON·ROLLING / CLOSED | `status` (recomputed daily, never trusted as static) |
| Verified / Pattern | `verification_level` |
| *(aggregator — confirm on official site)* | `source_type: aggregator` |
| Section number | `category` per §4b |
| Source line | `source_url` |

**Corrections to apply at import:**

1. **MATS Residency** — the master file marks this *aggregator only*. Verified directly against `matsprogram.org/residency/apply`: window 25 Aug – **31 Oct 2026 AoE**, $155,000–$285,000/yr plus uncapped compute, 6–24 months, Berkeley/London/Washington DC. Decision by end of 2026, interview or **paid** work test in the first week of December. Upgrade to `source_type: official`, `verification_level: verified`.
2. **MATS Winter 2027 Fellowship** — status is **LATE_WINDOW**, not CLOSED. Late applications accepted by emailing `applications@matsprogram.org` with a resume. Confirmed on the official program page. Stipend $6,400/mo + $8–16k/mo compute, housing, meals, travel, J-1 support; extension $7,680/mo, >80% of fellows receive one. The "$19,200 lump" aggregator figure is the same money stated differently — log as a resolved conflict, keep official figures. The Neel Nanda stream ran a separate, earlier application (closed 4 Sep) and was also still taking late applications.
3. **Swiss Government Excellence** — 29 Sep (Swiss list) vs 31 Oct (HEC) is a genuine `conflicting` row. Plan against 29 Sep; flag for embassy confirmation.
4. **Mitacs Globalink** — closes **16 Sep 2026, 1:00 pm PT**. Eligibility requires full-time undergraduate status with 1–3 semesters remaining as of fall 2027, at a listed partner institution. Run the eligibility check before this surfaces as actionable; it may resolve to BLOCKED.
5. **Non-opportunity content** — Nvidia origin story, Musk advice, study-habit list, China/Windows news, Forbes rankings and curated university lists route to **Notes & Inspiration**.
6. **Third-party personal data** — the AWS certification validation number and the named individual's Toronto offer letter are stripped at import and not stored.

---

## 9d. The research loop — how the pool keeps growing

The agent runs continuously against the nine categories in §4b. It is not a one-off seeding job.

**Cycle:**

1. **Sweep** — for each category, run the source directory (§6, §9b) with fingerprint-filtered queries
2. **Extract** — parse each hit into the §4 schema
3. **Deduplicate** — match on `supervisor + institution + field + track`, and on `program name + cycle year`. `track` is in the key so a PI running a PhD opening and a postdoc opening at the same time stays two rows, not one collapsed row. A funded PhD post on LinkedIn, on EURAXESS, and on the lab page is **one row**, not three. Merge, keeping the most authoritative `source_url`
4. **Resolve** — aggregator and social hits get chased to the official page. Row stays non-actionable until `source_type: official`
5. **Re-verify** — existing open rows past their freshness SLA (§6) get re-checked. Status transitions are computed, never hand-set
6. **Diagnose** — every new or changed row runs through Layer 3 against the current profile snapshot
7. **Report** — you get a digest: what's new, what changed, what moved to URGENT, what expired, what's now conflicting

**Per-category cadence:**

| Category | Sweep frequency | Why |
|---|---|---|
| 4 — Professor-led positions | Weekly | Lab pages change without announcement |
| 1, 6 — Fellowships, founder programs | Weekly | Rolling and short-notice cycles |
| 7 — Conferences & CFPs | Weekly | CFP windows are short |
| 2, 3, 5, 8 — Scholarships, PhD programs, internships, postdocs | Monthly, plus daily inside 14 days of a known deadline | Annual cycles, predictable |
| 9 — Pattern cycles | Monthly, targeting confirmation | The goal is to flip each row from `pattern` to `verified` |

**Expansion rule:** when the agent finds a program not in any category, it proposes the row with a category guess and flags it for your review. It never silently creates a new category.

---

## 9e. Manual ingest loop — your side channel

You will keep finding things the agent can't reach, especially on LinkedIn and Instagram. The system has to make dropping those in cost you nothing.

**Accepted inputs:** screenshot (PNG/JPEG), PDF, plain text, pasted URL, or just typed notes.

**Pipeline:**

```
you drop a file
   → OCR / parse
   → extract into §4 schema
   → dedupe against existing pool
   → if new: source_type = social|manual, verification_level = unverified
   → agent resolves to official source
   → Layer 3 diagnoses it
   → appears in your queue with a verdict
```

**Rules:**

- A manual drop is a **lead**, never a fact. It enters unverified and gets resolved before it's actionable
- If the drop duplicates an existing row, it **merges** rather than creating a second entry — and if it carries a detail the pool lacks (a contact email, a requirement), that detail is added
- If the drop contradicts an existing row, the row goes `conflicting` and surfaces for your decision. It is not silently overwritten
- Third-party personal data (someone else's offer letter, certificate numbers, private emails) is stripped at ingest and never stored
- Non-opportunity content routes to **Notes & Inspiration**, not the pool

**Why the merge behaviour matters:** the same MATS program appeared in your DeepSeek extract, in your screenshot, and in your master file, with three different stipend figures ($19,200 lump vs $6,400/month vs unstated). One row, official figures, conflict logged.

---

## 10. Confirmed decisions

Locked 15 September 2026.

1. **Verdict taxonomy** — six states as in §5.1, confirmed as written. BLOCKED stays collapsed-by-default, not hidden.
2. **Gap Queue ranked by unblock-count.** "The item that opens the most doors" is the priority rule. Deadline proximity is a separate signal surfaced inside the Action Queue, not a competing sort on the Gap Queue.
3. **BLOCKED rows stay visible**, collapsed with the reason shown — so the shape of what's structurally closed to you stays legible instead of silently disappearing.
4. **Screenshots never enter as fact.** Every lead resolves to a primary source before it's shown as actionable, no exception for speed.
5. **Expired rows are archived, not deleted** — they become next cycle's early warning.
6. **T1 cap is enforced by the system**, not just labeled: capped at 5 concurrently active applications (§4).
7. **Socials at Phase 8**, after the pool and diagnostic engine work (phase numbers shifted by the Channel C insertion — see §9).
8. **Founder/VC track defaults to T3**, since it competes with the academic track for the same hours.
9. **LinkedIn stays manual** (§9b Channel A) — no compliant automation path exists; capture-not-discovery is the ceiling here.
10. **Channel C watchlist starts at ~50 labs**, not 150–300 — pilot the C1/C2 pipeline at that size first and expand once the diff mechanism (§7, §9b) is proven, rather than building for scale before the pipeline is trusted.
11. **Weekly polling cadence** for lab pages, confirmed — daily would waste requests against pages that rarely change.
12. **MATS Fellowship late application** goes into the immediate Action Queue — live, one email, LATE_WINDOW verdict already applies (§5.1).
13. **Nine categories in §4b** confirmed as the right shape for the current profile.
14. **Sweep cadences in §9d** confirmed: weekly for professor-led positions and fellowships, monthly (plus daily inside 14 days of a known deadline) for annual scholarship/PhD/internship/postdoc cycles.
15. **Manual drops merge rather than duplicate** (§9e); a contradiction flags the row as `conflicting` for your decision rather than overwriting it.
16. **Notes & Inspiration bucket** sits outside the pool, confirmed, so non-opportunity content can't pollute retrieval.

---

*Confirmed and locked 15 September 2026. Cleared for build agent handoff — starting at Phase 0.*
