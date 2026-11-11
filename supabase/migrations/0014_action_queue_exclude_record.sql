-- Atlas — exclude record-type gaps from the enhancer's action ranking.
--
-- "Confirm this programme accepts bachelor's-only applicants" was ranking
-- #1 with 182 rows: 182 separate per-programme page-checks that happen to
-- share one label string, not one action a person can go do. More
-- generally, every record-type gap is either that kind of unconfirmed
-- page-silence check (already counted once in verdicts.verification_
-- required — counting it again here double-counts it) or a discretionary
-- rule's own verbatim text (a soft stated preference, not a concrete
-- action). Neither belongs in a ranking of "things to go close."
--
-- Fixed at the view, not with an application-level filter: a filter in
-- diagnoseOne or in a query can regress the next time someone touches
-- that code path. This way a record-type gap has no code path into
-- action_queue at all. gap_queue (the Gap Queue page) is untouched — it
-- still shows every gap, record-type included; only the enhancer's
-- ranking changes.
create or replace view action_queue as
select
  action_label,
  min(type) as type,
  count(distinct opportunity_id) as unblock_count,
  array_agg(distinct opportunity_id) as opportunity_ids,
  min(time_estimate) as time_estimate,
  min(cost_estimate) as cost_estimate,
  user_id
from gaps
where type <> 'record'
group by action_label, user_id
order by unblock_count desc;

alter view action_queue set (security_invoker = true);
