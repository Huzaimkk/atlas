-- Atlas v2 — accountability UI (Today view + Applications pipeline)
--
-- 1. verdicts.ready_since. diagnoseOpportunity/diagnosePool both delete +
--    re-insert every verdict row on every run (lib/diagnostic-engine.ts),
--    so computed_at resets to "now" on every re-diagnosis and can never
--    answer "how long has this been READY with nothing done" — the whole
--    point of the Today view's aging-READY block. This column is carried
--    forward by the engine across re-diagnoses (set once when a row first
--    becomes READY, kept as-is while it stays READY, cleared the moment it
--    stops being READY) instead of being derived from computed_at.
alter table verdicts add column ready_since timestamptz;

-- 2. applications — replace the generic identified/preparing/submitted/
--    interview/decision shape (never surfaced in any UI, spec'd Phase 1)
--    with the explicit funnel the Applications view needs, each
--    transition dated so "overdue commitments" (status unchanged for N
--    days while not in a terminal state) is a real query, not a guess.
alter table applications drop constraint applications_stage_check;
alter table applications rename column stage to status;
alter table applications add constraint applications_status_check
  check (status in (
    'not_started','researching','drafting','submitted','interview',
    'offer','rejected','withdrawn'
  ));
alter table applications alter column status set default 'not_started';

alter table applications add column status_changed_at timestamptz not null default now();
-- [{status, at}] — full history, append-only; status_changed_at mirrors the
-- most recent entry for cheap sorting/filtering without unpacking the array.
alter table applications add column status_history jsonb not null default '[]';
-- [{type, label, satisfied, inventory_status}] — seeded from the
-- opportunity's own requirements cross-referenced against the profile's
-- document_inventory at creation time, then independently toggleable per
-- application (see lib/application-documents.ts).
alter table applications add column required_documents jsonb not null default '[]';

-- decision/submitted_at are now redundant: status_history already carries a
-- dated entry for every transition, including into submitted/offer/
-- rejected/withdrawn, with no duplicate state to drift out of sync.
alter table applications drop column decision;
alter table applications drop column submitted_at;

-- One application per opportunity — rows are created lazily on first
-- status change (see app/api/applications/route.ts), never pre-seeded.
alter table applications add constraint applications_opportunity_unique unique (opportunity_id);
