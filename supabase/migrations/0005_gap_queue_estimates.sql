-- Atlas v2 — restore time_estimate/cost_estimate on the Gap Queue.
--
-- gaps (per-opportunity rows) has always carried time_estimate/cost_estimate
-- (set from GAP_TYPE_DEFAULTS at diagnosis time) — the gap_queue view just
-- never selected them, so fetch-atlas-data.ts had to paper over the gap
-- with hardcoded empty strings. Every row sharing one (label, type) group
-- gets the same type-level default, so min() is a safe, arbitrary-but-
-- consistent way to pick one value per group rather than needing a new
-- aggregate.
--
-- CREATE OR REPLACE VIEW doesn't reliably carry forward a view's storage
-- options, so security_invoker (0002 — RLS enforcement for this view) is
-- re-affirmed explicitly rather than assumed to survive the replace.

create or replace view gap_queue as
select
  label,
  type,
  count(distinct opportunity_id) as unblock_count,
  array_agg(distinct opportunity_id) as opportunity_ids,
  min(time_estimate) as time_estimate,
  min(cost_estimate) as cost_estimate
from gaps
group by label, type
order by unblock_count desc;

alter view gap_queue set (security_invoker = true);
