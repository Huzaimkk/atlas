-- Atlas — multi-tenant P1, part 2 (NOT YET RUN)
-- Run ONLY after scripts/seed-multi-tenant-user.mjs has backfilled user_id
-- on every existing row in all nine tables — these ALTER COLUMN ... SET
-- NOT NULL statements fail loudly (not silently) if any row still has a
-- null user_id, which is the intended safety behavior, not a bug to work
-- around.

alter table profile_snapshots alter column user_id set not null;
alter table profile_snapshots alter column user_version set not null;
-- Guarantees the ordinal is actually unique per user — belt-and-suspenders
-- alongside the trigger, since a direct UPDATE (e.g. the backfill script)
-- bypasses the BEFORE INSERT trigger entirely.
alter table profile_snapshots add constraint profile_snapshots_user_version_unique unique (user_id, user_version);
alter table verdicts           alter column user_id set not null;
alter table gaps               alter column user_id set not null;
alter table gap_closures       alter column user_id set not null;
alter table applications       alter column user_id set not null;
alter table referees           alter column user_id set not null;
alter table command_log        alter column user_id set not null;
alter table outreach_log       alter column user_id set not null;
alter table inbox_leads        alter column user_id set not null;

-- profile_snapshots.is_current: was a single GLOBAL constraint (migration
-- 0001's profile_snapshots_one_current, an index on the constant
-- expression `is_current` itself). Multi-tenant needs "at most one current
-- row per user", not "at most one current row, period" — the index key
-- becomes user_id instead.
drop index profile_snapshots_one_current;
create unique index profile_snapshots_one_current_per_user
  on profile_snapshots (user_id)
  where is_current;

-- applications.opportunity_id was uniqued GLOBALLY (migration 0010, for the
-- single-operator app's upsert-by-opportunity_id pattern). Multi-tenant
-- needs "one application per user per opportunity", not "one application
-- per opportunity across every user" — found during the application-code
-- audit (app/api/applications/route.ts's upsert would otherwise let user B
-- overwrite user A's application row against a shared opportunity).
alter table applications drop constraint applications_opportunity_unique;
alter table applications add constraint applications_user_opportunity_unique unique (user_id, opportunity_id);
