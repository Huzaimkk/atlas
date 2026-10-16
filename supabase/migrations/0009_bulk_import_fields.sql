-- Atlas v2 — bulk research-file import (Opportunity_Research_EU_USA_UAE.xlsx).
--
-- external_id preserves the source file's own stable "OPP-xxxxxxxxxx" ID,
-- so re-running the import (or a future refresh of the same file) can
-- dedupe against rows already brought in, not just against each other.
--
-- source_assessment holds the source file's own "CV fit" + "Why it fits /
-- does not fit" text verbatim — explicitly NOT our fit_score (user
-- instruction: it reads "strong" on 73% of rows with templated
-- justifications; our diagnostic engine computes fit independently, see
-- lib/fingerprint.ts's overlapScore). Kept for reference only.
--
-- ai_writing_policy must surface before drafting anything for a row
-- (user instruction) — a few programmes prohibit AI drafting entirely.
--
-- verified_correction holds the matched row from the file's own
-- Corrections sheet, imported as an override annotation on the existing
-- row it corrects — never as a new row of its own.

alter table opportunities add column external_id text;
alter table opportunities add column source_assessment text;
alter table opportunities add column ai_writing_policy text;
alter table opportunities add column verified_correction text;

create unique index opportunities_external_id_idx on opportunities (external_id) where external_id is not null;

-- 'paused': a programme/cycle that's temporarily suspended (e.g. ISTernship's
-- summer round, paused for 2026 and 2027) — distinct from 'expired', which
-- implies a fixed past deadline that simply passed.
-- 'program_specific': background/reference material — a programme exists
-- but isn't tied to a specific open call or deadline right now. Combined
-- with a null deadline, these route to the Pool's own "Reference" section
-- instead of Live/Upcoming/Past (user instruction).
alter table opportunities drop constraint opportunities_status_check;
alter table opportunities add constraint opportunities_status_check
  check (status in ('not_yet_open','open','closing_soon','expired','rolling','paused','program_specific'));
