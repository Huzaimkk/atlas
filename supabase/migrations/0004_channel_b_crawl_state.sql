-- Atlas v2 — Channel B ingest crawl state (atlas-v2-spec1.md §9b, §9d)
--
-- Per-source run state so an ingest run only processes items it hasn't
-- seen before, rather than re-fetching and re-filtering an aggregator's
-- entire post history every time. `seen_external_ids` is a capped tail
-- (most recent N ids) rather than an ever-growing set — aggregator post
-- ids/guids are monotonic enough within one feed that this is sufficient
-- to catch re-runs without the table growing unbounded.
--
-- No `source_key` registry table: the list of Channel B targets (and
-- which fetch method each one uses) is static config, not data — it
-- lives in lib/channel-b/sources.ts, not the database. This table only
-- tracks runtime state for whatever source_keys are actually run.

create table crawl_state (
  source_key text primary key,
  last_seen_at timestamptz,
  seen_external_ids text[] not null default '{}',

  last_run_at timestamptz,
  last_run_status text check (last_run_status in ('ok', 'error', 'unresolved')),
  last_run_error text,
  last_run_items_found int,
  last_run_items_inserted int,
  last_run_items_skipped_irrelevant int,
  last_run_items_skipped_duplicate int,
  last_run_items_skipped_no_official_link int,

  updated_at timestamptz not null default now()
);

alter table crawl_state enable row level security;
