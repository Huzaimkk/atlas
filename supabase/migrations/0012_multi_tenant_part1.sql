-- Atlas — multi-tenant P1, part 1 (NOT YET RUN — pending review)
--
-- Run order for the whole P1 migration:
--   1. This file (0012_multi_tenant_part1.sql) — adds nullable user_id
--      columns, RLS policies, the shared-pool read policy, and replaces
--      post_degree_hours(). Safe to run immediately: supabaseAdmin
--      (service-role) bypasses RLS regardless of policies, so the
--      currently-live single-operator app is unaffected until its code is
--      updated to pass user_id explicitly.
--   2. scripts/seed-multi-tenant-user.mjs (not SQL — creates the seeded
--      auth.users row via the Supabase Admin Auth API, then backfills
--      user_id on every existing row across all nine per-user tables
--      using that user's real id).
--   3. 0012_multi_tenant_part2.sql — ALTER COLUMN user_id SET NOT NULL
--      (only safe once every row has one) and the is_current unique-index
--      swap.
--
-- Scope grew from the original seven tables to nine after review:
--   + outreach_log — third-party contact PII (professor/programme-officer
--     emails), same category as referees. Never joined into any shared
--     view today (checked: no migration references it outside its own
--     table/index definitions) — stays that way.
--   + inbox_leads — a private staging area; a dropped lead is unverified
--     and belongs to whoever dropped it. Its promotion path into
--     `opportunities` (app/api/inbox/confirm/route.ts) already does not
--     write any back-reference from the shared opportunities row to the
--     user — that property is preserved here, not newly added.
--   sources stays OUT of this list — checked (no application code
--   anywhere reads or writes it; its columns are url/source_type/
--   last_checked_at/last_result/notes/created_at only) and it carries no
--   per-user intent to split out. It stays paired with the shared
--   page_snapshots table it tracks freshness for, per spec §5 — splitting
--   it per-user would multiply fetch cost against the same shared pages
--   for no isolation benefit, since there is no per-user data in it to
--   isolate in the first place.

-- ============================================================================
-- 1. user_id columns — nullable for now, FK'd to Supabase Auth's auth.users.
--    NOT NULL deferred to part 2, after the backfill script runs.
-- ============================================================================
alter table profile_snapshots add column user_id uuid references auth.users(id) on delete cascade;

-- user_version: a per-user display ordinal, separate from the global
-- `version` column (which stays global and unique so verdicts.snapshot_version's
-- FK needs no restructuring — see note above). "Profile version 48" on a
-- global counter leaks system-wide usage to any user who sees it; a stored
-- ordinal also stays stable where a computed row_number() would silently
-- rewrite an old verdict's provenance if an earlier snapshot were ever
-- removed. Nullable here — backfilled next, NOT NULL + uniqueness added
-- in part 2.
alter table profile_snapshots add column user_version int;

alter table verdicts           add column user_id uuid references auth.users(id) on delete cascade;
alter table gaps               add column user_id uuid references auth.users(id) on delete cascade;
alter table gap_closures       add column user_id uuid references auth.users(id) on delete cascade;
alter table applications       add column user_id uuid references auth.users(id) on delete cascade;
alter table referees           add column user_id uuid references auth.users(id) on delete cascade;
alter table command_log        add column user_id uuid references auth.users(id) on delete cascade;
alter table outreach_log       add column user_id uuid references auth.users(id) on delete cascade;
alter table inbox_leads        add column user_id uuid references auth.users(id) on delete cascade;

create index profile_snapshots_user_id_idx on profile_snapshots (user_id);
create index verdicts_user_id_idx on verdicts (user_id);
create index gaps_user_id_idx on gaps (user_id);
create index gap_closures_user_id_idx on gap_closures (user_id);
create index applications_user_id_idx on applications (user_id);
create index referees_user_id_idx on referees (user_id);
create index command_log_user_id_idx on command_log (user_id);
create index outreach_log_user_id_idx on outreach_log (user_id);
create index inbox_leads_user_id_idx on inbox_leads (user_id);

-- ============================================================================
-- 2. RLS policies, auth.uid()-keyed. One combined ALL policy per table —
--    read and write share the same ownership condition everywhere here.
--    service_role bypasses RLS by definition regardless of these policies;
--    they only govern the anon/authenticated roles (i.e. a future client
--    holding a real user JWT).
-- ============================================================================
create policy "own rows only" on profile_snapshots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on verdicts           for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on gaps               for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on gap_closures       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on applications       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on referees           for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on command_log        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on outreach_log       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on inbox_leads        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- opportunities stays shared (no user_id) — every authenticated user reads
-- the whole pool. Read-only: writes still go through supabaseAdmin only.
create policy "authenticated users read the shared pool" on opportunities
  for select using (auth.role() = 'authenticated');

-- ============================================================================
-- 3. post_degree_hours(): takes user_id, resolves that user's current
--    snapshot internally, instead of the caller passing a snapshot id.
--    Signature changed (not just REPLACE'd) — the old 2-arg overload is
--    dropped explicitly so .rpc('post_degree_hours', ...) can't resolve
--    to a stale overload.
-- ============================================================================
drop function if exists post_degree_hours(uuid, date);

create or replace function post_degree_hours(p_user_id uuid, p_as_of date default current_date)
returns numeric
language sql
stable
as $$
  select case
    when degree_completed_on is null or degree_completed_on > p_as_of then 0
    else round(
      (extract(epoch from (p_as_of::timestamp - degree_completed_on::timestamp)) / 2629800.0)
      * full_time_hours_per_month
    , 1)
  end
  from profile_snapshots
  where user_id = p_user_id and is_current = true;
$$;

comment on function post_degree_hours is
  'Elapsed full-time-equivalent hours since degree_completed_on, for the given user''s CURRENT profile snapshot, evaluated as of p_as_of (default today). Multi-tenant P1: takes user_id directly rather than a snapshot id the caller already had to look up.';

-- ============================================================================
-- 4. gap_queue view — add user_id to the projection and GROUP BY (gaps now
--    carries it). security_invoker = true is load-bearing (migration 0002,
--    after a verified RLS leak via view-owner privileges) — CREATE OR
--    REPLACE VIEW does not reliably preserve storage options, so it is
--    re-affirmed explicitly every time this view is replaced, including
--    here.
-- ============================================================================
-- Postgres's CREATE OR REPLACE VIEW only allows appending new columns at
-- the end — it cannot reorder or insert a column before existing ones
-- ("cannot drop columns from view"). user_id is appended last rather than
-- first for exactly this reason; it is still part of the projection, which
-- is the load-bearing requirement, not its position.
create or replace view gap_queue as
select
  label,
  type,
  count(distinct opportunity_id) as unblock_count,
  array_agg(distinct opportunity_id) as opportunity_ids,
  min(time_estimate) as time_estimate,
  min(cost_estimate) as cost_estimate,
  user_id
from gaps
group by label, type, user_id
order by unblock_count desc;

alter view gap_queue set (security_invoker = true);

-- ============================================================================
-- 5. user_version trigger — assigns the per-user ordinal at insert time,
--    coalesce(max(user_version), 0) + 1 scoped to NEW.user_id. Guarded on
--    user_id is not null (rows backfilled before part 2's NOT NULL lands
--    still insert fine) and user_version is null (an explicit caller-
--    supplied value, e.g. a future backfill UPDATE, is never overwritten —
--    though backfill here uses UPDATE, not INSERT, so this trigger never
--    fires for it anyway).
-- ============================================================================
create or replace function profile_snapshots_set_user_version()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is not null and new.user_version is null then
    select coalesce(max(user_version), 0) + 1 into new.user_version
    from profile_snapshots
    where user_id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger profile_snapshots_user_version_trigger
  before insert on profile_snapshots
  for each row execute function profile_snapshots_set_user_version();
