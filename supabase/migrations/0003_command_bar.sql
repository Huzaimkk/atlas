-- Atlas v2 — command bar support (spec extension, this session's item A/C)
--
-- 1. opportunities.verification_level gains 'unverified'. The original
--    schema's three values (verified/pattern/conflicting) all describe a
--    row that has been CHECKED against something, even if the result is
--    ambiguous. An AI-originated write needs a fourth state for "nobody
--    has checked this at all yet" — the hard rule from this session's
--    instructions: any AI-originated write is a lead, never a fact, until
--    resolved against a primary source. Postgres can't add a value to an
--    inline CHECK's IN-list without recreating the constraint.
--
-- 2. command_log — the audit trail spec'd for the command bar's history
--    panel: what was asked, what was written (if anything), what source
--    backed it. Not one of the original 8 tables; this is new surface
--    area the original spec didn't anticipate.

alter table opportunities drop constraint opportunities_verification_level_check;
alter table opportunities add constraint opportunities_verification_level_check
  check (verification_level in ('verified', 'pattern', 'conflicting', 'unverified'));

create table command_log (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  -- Full tool-call trace: [{tool, input, output}], so "what was written"
  -- and "what source backed it" are both reconstructable from one row.
  actions jsonb not null default '[]',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'read_only')),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table command_log enable row level security;
-- No anon/authenticated policies — same default-deny model as every other
-- table (see 0001's design note 1). Only supabaseAdmin, server-side, reads
-- or writes this.
