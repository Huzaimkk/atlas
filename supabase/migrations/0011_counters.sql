-- Atlas v2 — accountability counters (item 3): gap-closure provenance and
-- a referee roster. See the commit message / PR discussion for why the
-- first draft of this migration was rejected (missing comma, referees had
-- RLS enabled before the table existed, gap_closures had no RLS at all,
-- and the original "boolean contacted" design couldn't express a cause
-- for closure or a referee's real status).

create type gap_closure_cause as enum (
  'satisfied',            -- credential earned, document written, referee secured
  'rule_changed',         -- re-verification corrected the requirement
  'opportunity_expired',  -- gap stopped mattering; it did not close
  'opportunity_declined',
  'unknown'
);

create table gap_closures (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  gap_type text not null,
  label text,
  cause gap_closure_cause not null default 'unknown',
  notes text,
  closed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index gap_closures_closed_at_idx on gap_closures (closed_at desc);
create index gap_closures_opportunity_idx on gap_closures (opportunity_id);
alter table gap_closures enable row level security;
-- no policies: default deny, service-role only, same as every other table

create type referee_status as enum (
  'not_contacted', 'contacted', 'agreed', 'declined', 'letter_submitted'
);

create table referees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  affiliation text,
  relationship text,
  email text,
  status referee_status not null default 'not_contacted',
  status_changed_at timestamptz not null default now(),
  status_history jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table referees enable row level security;
