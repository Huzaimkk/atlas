-- Atlas v2 — Phase 1 schema (atlas-v2-spec1.md §7)
--
-- Design notes, read before running:
--
-- 1. RLS MODEL. Every table below gets `enable row level security` and
--    ZERO policies for the `anon` / `authenticated` roles. A table with RLS
--    on and no matching policy denies all access to those roles by default
--    — that is the fix for the old `create policy "Allow all" using (true)`
--    bug (anyone holding the public anon key had full read/write). This is
--    a single-operator system with no browser-facing auth yet, so the
--    correct "real RLS" here is: the anon key, if it ever leaks, grants
--    nothing. All application reads/writes go through Next.js API routes /
--    Server Components using `supabaseAdmin` (the service-role client in
--    lib/supabase.ts), which bypasses RLS by design — that's the only
--    route in, and it never runs in the browser.
--
-- 2. post_degree_hours IS COMPUTED, NOT STORED. Profile v5 §1.1/§5.5: any
--    opportunity gating on "N hours/years after your bachelor's" must
--    evaluate against elapsed time since degree completion, which changes
--    every day. Storing a number would go stale immediately, so it's a
--    stable SQL function evaluated at read time (see below), not a column
--    the diagnostic engine has to remember to recompute.
--
-- 3. BLOCKED VERDICTS ARE CONSTRAINED AT THE DATABASE LEVEL, not just in
--    application code. Profile v5 §5.6 (standard of proof) and §5.7
--    (mechanical vs discretionary) are both load-bearing rules the spec
--    is explicit about never wanting silently violated. Two CHECK
--    constraints on `verdicts` make a violation impossible to insert:
--      - a BLOCKED verdict must carry a quoted rule + its source URL
--      - a BLOCKED verdict must be backed by a `mechanical` rule_type —
--        a discretionary rule can never produce BLOCKED, full stop.
--
-- 4. `gaps` stores per-opportunity gap line items; the Gap Queue (ranked
--    by unblock-count, spec §5.3) is a view aggregating across them, not
--    a separately maintained table that can drift out of sync.

-- ============================================================================
-- profile_snapshots
-- ============================================================================
create table profile_snapshots (
  id uuid primary key default gen_random_uuid(),
  version int not null unique,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),

  identity jsonb not null,
  credentials jsonb not null,
  research_fingerprint text[] not null default '{}',
  evidence jsonb not null,
  teaching_service jsonb not null,
  document_inventory jsonb not null,
  network jsonb not null default '[]',

  -- Papers, IELTS, GRE etc. as pending items with expected completion dates
  -- (profile v5 Phase-2 requirement 3) — not marked achieved until they are.
  pending_items jsonb not null default '[]',

  -- Backing fields for the post_degree_hours() function below.
  degree_completed_on date,
  full_time_hours_per_month numeric not null default 173.33
);

-- Only one snapshot may be "current" at a time — the diagnostic engine
-- always diagnoses against exactly one active profile.
create unique index profile_snapshots_one_current
  on profile_snapshots ((is_current))
  where is_current;

create or replace function post_degree_hours(p_snapshot_id uuid, p_as_of date default current_date)
returns numeric
language sql
stable
as $$
  select case
    when degree_completed_on is null or degree_completed_on > p_as_of then 0
    else round(
      (extract(epoch from (p_as_of::timestamp - degree_completed_on::timestamp)) / 2629800.0) -- avg seconds/month
      * full_time_hours_per_month
    , 1)
  end
  from profile_snapshots
  where id = p_snapshot_id;
$$;

comment on function post_degree_hours is
  'Elapsed full-time-equivalent hours since degree_completed_on, evaluated as of p_as_of (default today). Used to check any opportunity eligibility_rules entry that gates on post-degree hours/years — e.g. Chevening''s 2,800-hour rule (profile v5 §5.4). Never hand-computed per row.';

-- ============================================================================
-- opportunities
-- ============================================================================
create table opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,

  track text not null check (track in (
    'phd_funded','gta','ra','postdoc','scholarship','fellowship',
    'conference','internship','accelerator'
  )),
  category smallint not null check (category between 1 and 9),

  -- Cross-cutting tag, independent of `category` — profile v5 §7 asks for
  -- integrated/fast-track doctoral routes (UK CDTs, Max Planck Schools,
  -- IMPRS, OIST 5-year integrated PhD, Canadian direct-entry) to be
  -- identifiable as a group regardless of which of the 9 categories a
  -- given programme otherwise falls under.
  integrated_phd_fast_track boolean not null default false,

  institution text not null,
  country text,
  region text,
  supervisor jsonb, -- { name, email, lab_url }
  field_tags text[] not null default '{}',
  funding jsonb,

  -- Per-row, per spec §5.1 correction: never filter by country. Empty
  -- array means "unstated/ambiguous on the programme's own page" — the
  -- diagnostic engine must treat that as GAP (verify entry route), never
  -- BLOCKED.
  degree_levels_accepted text[] not null default '{}',

  -- Structured eligibility rules, each independently classified so the
  -- engine (and the verdicts.rule_type constraint below) can tell mechanical
  -- from discretionary requirements. Shape per rule:
  --   { rule_text, rule_type: 'mechanical'|'discretionary',
  --     source_quote, source_url }
  eligibility_rules jsonb not null default '[]',

  requirements jsonb not null default '[]',

  opens date,
  deadline date,
  rolling boolean not null default false,

  status text not null check (status in (
    'not_yet_open','open','closing_soon','expired','rolling'
  )),
  tier text not null check (tier in ('T1','T2','T3')),

  apply_url text,
  source_url text not null,
  verified_on date,
  source_type text not null check (source_type in ('official','aggregator','social','manual')),
  verification_level text not null check (verification_level in ('verified','pattern','conflicting')),
  scam_risk boolean not null default false,
  origin text not null check (origin in ('screenshot','pdf','txt','search','manual')),

  -- True for rows carried over from the pre-v2 localStorage trackers.
  -- Never trusted as verified — always re-checked before it can leave GAP.
  migrated_legacy boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index opportunities_status_idx on opportunities (status);
create index opportunities_deadline_idx on opportunities (deadline);
create index opportunities_tier_idx on opportunities (tier);
create index opportunities_category_idx on opportunities (category);

-- ============================================================================
-- verdicts
-- ============================================================================
create table verdicts (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  snapshot_version int not null references profile_snapshots(version),

  type text not null check (type in (
    'READY','GAP','BLOCKED','IRRELEVANT','LATE_WINDOW','EXPIRED','NOT_YET_OPEN'
  )),

  -- Which specific eligibility_rules entry drove a BLOCKED or GAP verdict.
  rule_type text check (rule_type in ('mechanical','discretionary')),

  reason text,                    -- narrative explanation, any verdict type
  blocking_rule_quote text,       -- required for BLOCKED — spec §5.6
  blocking_rule_source_url text,  -- required for BLOCKED — spec §5.6

  fit_score smallint check (fit_score between 0 and 100),
  computed_at timestamptz not null default now(),

  -- §5.6 standard of proof: a BLOCKED verdict must quote a specific rule
  -- from the programme's own page. No quote, no BLOCKED — not even as a
  -- placeholder while someone goes to verify it later.
  constraint blocked_requires_quote check (
    type <> 'BLOCKED'
    or (blocking_rule_quote is not null and blocking_rule_source_url is not null)
  ),

  -- §5.7: only a mechanical rule may ever produce BLOCKED. A discretionary
  -- rule ("normally requires...", "preferred", "strong candidates will
  -- have...") can at most produce GAP. This constraint makes that
  -- structurally impossible to violate, not just a code-review convention.
  constraint blocked_requires_mechanical_rule check (
    type <> 'BLOCKED' or rule_type = 'mechanical'
  )
);

create index verdicts_opportunity_idx on verdicts (opportunity_id);
create index verdicts_snapshot_version_idx on verdicts (snapshot_version);
create index verdicts_type_idx on verdicts (type);

-- ============================================================================
-- gaps — per-opportunity gap line items; Gap Queue is the aggregate view
-- ============================================================================
create table gaps (
  id uuid primary key default gen_random_uuid(),
  verdict_id uuid not null references verdicts(id) on delete cascade,
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  type text not null check (type in (
    'credential','document','endorsement','record','experience','contact'
  )),
  label text not null,
  time_estimate text,
  cost_estimate text,
  created_at timestamptz not null default now()
);

create index gaps_opportunity_idx on gaps (opportunity_id);
create index gaps_label_idx on gaps (label);

-- Gap Queue, spec §5.3: every distinct gap, aggregated across the pool,
-- ranked by how many opportunities it unblocks. A view rather than a
-- maintained table — it can never drift out of sync with `gaps`.
create view gap_queue as
select
  label,
  type,
  count(distinct opportunity_id) as unblock_count,
  array_agg(distinct opportunity_id) as opportunity_ids
from gaps
group by label, type
order by unblock_count desc;

-- ============================================================================
-- applications
-- ============================================================================
create table applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  stage text not null default 'identified' check (stage in (
    'identified','preparing','submitted','interview','decision'
  )),
  submitted_at timestamptz,
  decision text check (decision in ('pending','accepted','rejected','withdrawn')),
  notes text,
  migrated_legacy boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_opportunity_idx on applications (opportunity_id);
create index applications_stage_idx on applications (stage);

-- ============================================================================
-- outreach_log
-- ============================================================================
create table outreach_log (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id) on delete set null,
  contact_name text,
  contact_email text,
  channel text not null default 'email' check (channel in ('email','linkedin','other')),
  subject text,
  body text,
  sent_at timestamptz,
  status text not null default 'draft' check (status in ('draft','sent','replied')),
  migrated_legacy boolean not null default false,
  created_at timestamptz not null default now()
);

create index outreach_log_opportunity_idx on outreach_log (opportunity_id);

-- ============================================================================
-- sources — verification/freshness tracking (spec §6 freshness rules)
-- ============================================================================
create table sources (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  source_type text not null check (source_type in ('official','aggregator','social','manual')),
  last_checked_at timestamptz,
  last_result text check (last_result in ('ok','error','changed')),
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- page_snapshots — Channel C lab-page diff base (spec §7, §9b C2)
-- ============================================================================
create table page_snapshots (
  id uuid primary key default gen_random_uuid(),
  lab_url text not null,
  fetched_at timestamptz not null default now(),
  content_hash text not null,
  content_excerpt text,
  changed_from_previous boolean,
  created_at timestamptz not null default now(),
  unique (lab_url, fetched_at)
);

create index page_snapshots_lab_url_idx on page_snapshots (lab_url, fetched_at desc);

-- ============================================================================
-- Row Level Security — enable on every table, no policies (default deny
-- for anon/authenticated; service-role key bypasses RLS and is the only
-- way in). See design note 1 at the top of this file.
-- ============================================================================
alter table profile_snapshots enable row level security;
alter table opportunities     enable row level security;
alter table verdicts          enable row level security;
alter table gaps              enable row level security;
alter table applications      enable row level security;
alter table outreach_log      enable row level security;
alter table sources           enable row level security;
alter table page_snapshots    enable row level security;
