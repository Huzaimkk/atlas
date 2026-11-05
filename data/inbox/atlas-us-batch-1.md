# Atlas — US Opportunity Batch 1

**Compiled:** 16 October 2026
**US presence window:** November 2026 – March 2027, Houston and California
**Verification standard:** every row checked against the programme's own page. Nothing here is from an aggregator.
**Ingest instruction:** `source_type: official`, `verification_level: verified`, each eligibility rule classified `mechanical` or `discretionary` with the quote below.

---

## Profile fields to add first

```
us_presence:
  start_date: 2026-11-01   # confirm exact
  end_date:   2027-03-31   # confirm exact
  cities:     [Houston TX, California]
work_authorization: none   # physical presence is NOT work authorisation
```

**Critical:** rows blocked on US work authorisation (Anthropic Fellows, Claude Corps) stay BLOCKED. Being in the country does not change them.

---

## Category 3 — US PhD programmes

### 1. UC Berkeley EECS — PhD
| Field | Value |
|---|---|
| Deadline | **1 December 2026, 8:59pm PST** |
| Degree level | **Bachelor's confirmed** — "5–6 year full-time commitment starting with a Bachelor's" |
| GRE | Not required, **not accepted** |
| English | TOEFL / IELTS only. **Duolingo not accepted.** Test deadline November |
| Location | Berkeley, California — inside US window |
| `source_url` | https://eecs.berkeley.edu/academics/graduate/research-programs/admissions/ |

**Verdict: GAP** — English test is the only gap. `rule_type: mechanical` on the test, `discretionary` on everything else.
⚠️ Tightest deadline in this batch and the only one Duolingo doesn't satisfy.

### 2. UCSD ECE — PhD
| Field | Value |
|---|---|
| Deadline | **16 December 2026, 11:59pm PT** |
| Degree level | B.S. and/or M.S. in engineering, physical sciences or mathematics; **min 3.0 GPA** (profile: 3.3) |
| GRE | "GRE scores are not required for either M.S. or Ph.D. applications for Fall 2027" |
| English | **Duolingo minimum 120 — accepted.** Also IELTS 7, PTE 65 |
| Location | La Jolla, California — inside US window |
| `source_url` | https://www.ece.ucsd.edu/graduate/graduate-admissions |

**Verdict: READY on credentials** — existing Duolingo 120 satisfies it.
⚠️ **Zero margin.** The requirement is exactly 120 and the score is exactly 120. Flag this on the row; a retake with a higher score removes the risk.

### 3. Rice ECE — PhD
| Field | Value |
|---|---|
| Deadline | **~21 December 2026**, late deadline 1 January — confirm the year on the page |
| Degree level | Min 3.0 GPA, bachelor's required at acceptance |
| GRE | Optional, "strongly recommended" — `discretionary` |
| English | TOEFL iBT 90 / IELTS 7 / **Duolingo 115 — profile clears with margin** |
| Funding | **"All enrolled full-time PhD students are supported with full tuition and a stipend."** First-year fellowship, then RA support |
| Location | **Houston** — primary city |
| `source_url` | https://eceweb.rice.edu/academics/graduate-programs/graduate-admissions |

**Verdict: READY on credentials.** Strongest row in the batch — Houston, guaranteed funding, Duolingo satisfied with margin.
⚠️ Page doesn't state whether bachelor's-only applicants enter the PhD directly. `GAP — verify entry route`, never BLOCKED.

### 4. University of Houston ECE — PhD
| Field | Value |
|---|---|
| Deadline | 15 March priority / 15 May regular — **much later, lower urgency** |
| GRE | Optional, recommended |
| English | TOEFL preferred, IELTS accepted; no minimums published |
| Location | **Houston** |
| `source_url` | https://www.ece.uh.edu/graduate/admission-procedures |

**Verdict: NOT_YET_URGENT.** Fallback option with a deadline well after the others.

---

## Category 7 — In-person events inside the US window

### 5. CES 2027
- **6–9 January 2027**, Las Vegas
- Relevant to Berry AI / hardware; NVIDIA's largest annual showcase (profile holds NVIDIA 6G Developer Program membership; NVIDIA Inception is an existing T3 row)
- `location_mode: in-person` · outside Houston/California but reachable

### 6. Energy HPC & AI Conference
- **23–25 February 2027**, BioScience Research Collaborative, 6500 Main St, Houston TX 77030 — **Rice University campus**
- HPC, machine learning and data science at the intersection of energy and IT
- **Closes with a Poster Reception showcasing research by emerging leaders in HPC and AI**
- `source_url`: https://kenkennedy.rice.edu/energyhpc-ai
- **High fit.** Houston, Rice campus, and the exact industrial-energy-plus-AI intersection this profile occupies. Submitting a poster puts the applicant physically at Rice while the Rice application is under review.

### 7. IEEE APEC 2027 — Applied Power Electronics Conference
- **7–11 March 2027**, Ernest N. Morial Convention Center, New Orleans LA
- ~5 hours by road from Houston, or a short flight
- Runs **Student Job Fair, Student Mentorship Program, Student Demonstration Competition, Student Attendance Support Program, Student Leader Program**
- `source_url`: https://apec-conf.org/
- **Highest fit in this batch.** Direct field match for the PMSM / Direct Torque Control work, with structured student access to power-electronics faculty and industry. Check the Student Attendance Support Program for travel funding.

### 8. SXSW 2027
- **15–21 March 2027**, Austin TX — ~3 hours from Houston
- Founder and tech track rather than academic; relevant to Aladdin AI and Berry AI
- `location_mode: in-person`

---

## Ruled out — record as IRRELEVANT with reason

- **NeurIPS 2026** — 6–12 December 2026, **Sydney**. Not reachable.
- **IEEE ECCE 2027** — Providence RI, typically September/October. Falls outside the US window.

---

## Calendar shape

| When | What |
|---|---|
| **Now – early Nov** | HAT (HEC, Pakistan-administered — harder once abroad). Berkeley English test. |
| **1 Dec** | UC Berkeley EECS deadline |
| **8–9 Dec** | Stanford AI+HEALTH panel — **online**, no location constraint |
| **16 Dec** | UCSD ECE deadline |
| **~21 Dec** | Rice ECE deadline |
| **6–9 Jan** | CES, Las Vegas |
| **January** | **Lab visits.** Applications under review Dec–Feb; this is the month physical presence converts. |
| **23–25 Feb** | Energy HPC & AI, Rice, Houston |
| **7–11 Mar** | IEEE APEC, New Orleans |
| **15–21 Mar** | SXSW, Austin |

**The January insight:** applications sit with committees from mid-December through February. An email reading *"I applied to your program, I'm in Houston until March, could I come by the lab for thirty minutes?"* is available to almost no other international applicant. That month is worth more than any conference in it.

---

## Open items

1. **Exact US arrival and departure dates** — the window above is assumed November 1 to March 31.
2. **Houston first or California first?** Determines which lab visits cluster when.
3. **HAT** — taken or not? Administered in Pakistan; gets much harder after departure.
4. **Berkeley English test** — booked? 46 days to deadline and Duolingo won't satisfy it.

---

*Batch 1 of an ongoing series. Next: UCLA, Stanford, USC, Caltech, UC Irvine, Texas A&M, UT Austin; NVIDIA GTC; US hackathons; Rice and UH seminar series.*
