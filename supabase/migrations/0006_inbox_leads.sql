-- Atlas v2 — Manual ingest (Inbox), spec §9e / Phase B "manual add".
--
-- extraction_error carries the raw CometAPI failure (e.g. the quota-zero
-- error) when extraction itself couldn't run — the row still gets created
-- so the attempt is visible in the Inbox, never silently dropped.
--
-- dedupe_match_id does double duty, same field for two related meanings
-- (spec's own InboxLead shape, not a new design here): while the lead is
-- 'conflicting' it names the existing opportunity this collides with;
-- once confirmed ('resolved') it's repointed at the opportunity that
-- drop became. Either way it's "the opportunity this lead relates to".

create table inbox_leads (
  id uuid primary key default gen_random_uuid(),
  origin text not null check (origin in ('screenshot','pdf','txt','search','manual')),
  raw_excerpt text,
  extracted jsonb not null default '{}'::jsonb,
  confidence text not null check (confidence in ('unverified','resolving','conflicting','resolved')) default 'unverified',
  extraction_error text,
  dropped_at timestamptz not null default now(),
  dedupe_match_id uuid references opportunities(id) on delete set null,
  created_at timestamptz not null default now()
);

create index inbox_leads_confidence_idx on inbox_leads (confidence);

alter table inbox_leads enable row level security;
-- No policies — default-deny, same posture as every other table in this
-- schema. All access goes through supabaseAdmin (service role) server-side.
