# Atlas — US Opportunity Batch 3

**Compiled:** 16 November 2026
**Verification standard:** every fact read from the programme's own page on the compile date. Nothing from an aggregator, nothing from memory. Where a page was silent, the row carries a "not stated" rule (`verification_only`) instead of a guess.
**Ingest:** `scripts/ingest-us-batch-3.mjs` (structured rows, quotes and source URLs live there). 22 rows inserted, 1 upgraded in place, 3 skipped because a row of that title already existed.

`verification_level` used in this batch:

- `verified` — the page prints the Fall 2027 date.
- `pattern` — the page prints a day and month with no year, or still shows last cycle. The date is the annual pattern, not confirmed.
- `conflicting` — two official pages disagree.

---

## A. Department-level PhD admissions, Fall 2027

| # | Programme | Deadline | Level | English test | GRE | Funding stated | Source |
|---|---|---|---|---|---|---|---|
| 1 | MIT EECS — PhD *(upgraded from "MIT EECS funded PhD")* | 1 Dec 2026 | verified | Duolingo ≥ 130, IELTS ≥ 7, TOEFL iBT ≥ 100 | not used | fully funded | eecs.mit.edu/academics/graduate-programs/admission-process/ |
| 2 | Purdue ECE — PhD | 1 Dec (priority), 1 Apr (final) | pattern | TOEFL / IELTS, writing ≥ 6 | optional | most funding goes to priority-date applicants | engineering.purdue.edu/ECE/Academics/Graduates/Admissions |
| 3 | UT Austin ECE — PhD | 1 Dec 2026, 11 PM CST | verified | TOEFL / IELTS | not considered | RA/TA, not guaranteed | ece.utexas.edu/academics/graduate/admissions |
| 4 | Stanford Computer Science — PhD | 8 Dec 2026 | verified | TOEFL / IELTS | not required | guaranteed | cs.stanford.edu/admissions-graduate-application-deadlines |
| 5 | Carnegie Mellon Machine Learning — PhD | 9 Dec 2026, 3 PM ET (early 18 Nov) | verified | TOEFL / IELTS preferred, Duolingo accepted | not stated | full tuition and stipend | ml.cmu.edu/academics/machine-learning-phd.html |
| 6 | TTIC — PhD in Computer Science | 9 Dec | pattern | TOEFL iBT ≥ 92, IELTS ≥ 7 | not required | tuition plus six-year stipend, **no application fee** | ttic.edu/studentapplication |
| 7 | Cornell ECE — PhD | 15 Dec | pattern | TOEFL or IELTS | not required | not stated on department page | duffield.cornell.edu/ece/phd/phd-admission-requirements/ |
| 8 | Harvard SEAS — PhD | 15 Dec 2026, 5 PM ET | verified | TOEFL or IELTS unless English-medium degree | optional | full support, $4,330/month stipend | seas.harvard.edu/…/how-apply |
| 9 | University of Washington ECE — PhD | 15 Dec | pattern | Duolingo ≥ 115 (130 recommended), IELTS ≥ 6.5 | not accepted | not stated | ece.uw.edu/academics/grad/admissions/ |
| 10 | USC Viterbi — PhD (ECE) | 15 Dec 2026 | verified | TOEFL / IELTS / PTE / Cambridge | not required | not stated | viterbigradadmission.usc.edu/doctoral/how-to-apply-phd/ |
| 11 | UC San Diego CSE — PhD | 16 Dec 2026, 11:59 PM | verified | **Duolingo ≥ 120**, IELTS ≥ 7 | not required | not stated | cse.ucsd.edu/graduate/admissions |
| 12 | Caltech Electrical Engineering — PhD | 15 Jan 2027 | conflicting | not confirmed (PDF unreadable) | encouraged | full tuition scholarship | ee.caltech.edu/academics/grad |
| 13 | UIUC ECE — PhD | 15 Jan (priority 15 Dec) | pattern | TOEFL iBT ≥ 96, IELTS ≥ 6.5 | optional | not stated | ece.illinois.edu/admissions/graduate/ |
| 14 | Texas A&M ECE — PhD | 1 Feb (international) | pattern | TOEFL / IELTS | optional | not stated | engineering.tamu.edu/electrical/admissions-and-aid/graduate-admissions/ |

**Reading across the table**

- One action dominates: an official IELTS at 7.0 or above clears the English requirement on every row here. The profile's Duolingo 120 is recorded as an interim score, and even as an official sitting it would clear only UCSD (120) and Washington (115) and fall short of MIT (130).
- GRE is not a barrier anywhere in this batch.
- Three deadlines fall on 1 December 2026 (MIT, Purdue priority, UT Austin), alongside Berkeley and Stanford EE from batch 1.
- TTIC is the only programme with no application fee.

## B. Fellowships, residencies and founder programmes

| # | Programme | Status on 16 Nov 2026 | What decides it | Source |
|---|---|---|---|---|
| 15 | Ai2 Predoctoral Young Investigators | rolling, no deadline stated | bachelor's or master's, pre-PhD; page lists visa support | allenai.org/predoctoral-young-investigators |
| 16 | Z Fellows | rolling | no age or location rule; $10k is an investment, not a grant | zfellows.com |
| 17 | Aga Khan Foundation ISP | opens early 2027 | Pakistan eligible; first-year postgraduates only; 50% loan | the.akdn/…/international-scholarships |
| 18 | Kempner Institute Post-Baccalaureate | 2027-28 opens winter 2026 | **blocked** — US citizens and permanent residents only | kempnerinstitute.harvard.edu/education/post-baccalaureate-program/ |
| 19 | Quad Fellowship | closed, next cycle to be announced | **blocked** — Quad and ASEAN citizens only | quadfellowship.org/apply |
| 20 | Jane Street Graduate Research Fellowship | closed 13 Nov 2026 | needs a PhD place for Fall 2027; international students eligible | janestreet.com/…/graduate-research-fellowship/ |
| 21 | Two Sigma PhD Fellowship | closed 25 Sep 2026 | third-year PhD students at US universities | twosigma.com/graduate-students/phd-fellowships/ |
| 22 | Google PhD Fellowship (Canada & US) | closed 30 Apr 2026 | enrolled PhD students, university nomination only | research.google/programs-and-events/phd-fellowship/ |
| 23 | South Park Commons Founder Fellowship | Fall 2026 closed 2 Aug | no formal rule; $400K for 7% | southparkcommons.com/news/f26-founder-fellowship |

Rows 20–22 are not actionable until a PhD offer is accepted. They are recorded now so the next cycle is on the calendar.

## Already in the pool, left untouched

Thiel Fellowship, Emergent Ventures and Schmidt Science Fellows already had rows under those exact titles. This batch's findings for them (Thiel: no degree holders; Emergent Ventures: rolling, minimum age 13; Schmidt: PhD-institution nomination, closed 13 Jul 2026) were **not** merged into the existing rows.

## Checked and deliberately not ingested

| Programme | Why |
|---|---|
| Microsoft Research PhD Fellowship | Page says the call has been paused since 2023; only 2022 rules are shown |
| IBM PhD Fellowship | Paused for 2026-27; a new programme is expected in Q1 2027 |
| Apple Scholars in AIML | Open to invited institutions by nomination only; no application page |
| Apple AIML Residency | Page dated Nov 2025; master's or above; current status not stated |
| Kempner Research Fellowship | Postdoctoral; deadline passed 1 Oct 2026 |
| Arc AIxBio Fellows | For enrolled undergraduates; page does not answer whether recent graduates qualify |
| Flatiron Institute | Only postdoctoral and faculty roles listed |
| HHMI | No graduate fellowship described on the programmes page |

## Could not be read — still to do

The official pages for these refused automated fetches or had moved. Nothing was ingested for them.

- Princeton ECE PhD, University of Michigan ECE PhD, Johns Hopkins BME PhD (HTTP 403)
- Carnegie Mellon ECE PhD, Columbia EE PhD, Rice CS PhD (404 or connection failure)
- Georgia Tech ECE PhD (TLS certificate error)
- OpenAI Residency (403), Qualcomm Innovation Fellowship (page body needs JavaScript), Neo Scholars (DNS failure)

## Stale rows noticed in the existing pool

- **Knight-Hennessy Scholars 2027** is still marked `closing_soon` with a 6 Oct 2026 deadline. The page now says the 2027 application is closed and 2028 opens in June 2027.
- **Anthropic Fellows** — the posting says "apply by October 18 to be considered for our January cohort"; that date has passed, applications remain rolling.
