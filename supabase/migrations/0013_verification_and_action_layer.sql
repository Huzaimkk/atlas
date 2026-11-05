-- Atlas — verification_required flag + the enhancer's action layer.
--
-- Two independent additions, both requested together:
--
-- 1. verdicts.verification_required — orthogonal to verdict.type, never
--    folded into it. A row can be both GAP (a real missing credential)
--    AND verification_required (an unconfirmed entry route) at once; it
--    is never promoted to READY just because its only issue is unverified
--    page silence. "38 verified READY · N pending verification" must stay
--    two numbers everywhere a count is shown, never one.
--
-- 2. gaps.action_label + the action_queue view — the enhancer (Home's
--    ProfileEnhancer) must rank by the concrete action that closes a gap
--    ("sit IELTS 7.0"), not by each row's own verbatim requirement label
--    ("TOEFL or IELTS (Duolingo not accepted)" vs "Duolingo English Test
--    120 — profile scores exactly 120" are genuinely different
--    requirements and must stay distinct per-row; both can still map to
--    the same satisfying action). gap_queue (the Gap Queue page) is
--    untouched — it keeps grouping by the verbatim per-row label, which
--    is the "Requirement" layer and must never be merged.
--
-- action_label is NOT NULL: diagnoseOne always supplies one (the
-- requirement/rule's own curated `satisfying_action`, falling back to its
-- own label/rule_text when nothing's been curated yet — see
-- lib/diagnostic-engine.ts). The curated mapping itself lives on each
-- opportunity's own eligibility_rules/requirements JSON (satisfying_action
-- field), not in a separate lookup table — consistent with how every
-- other per-row fact in this schema is already stored inline, and it's
-- what makes the mapping "stored, not recomputed ad hoc": diagnoseOne
-- reads a persisted field, it doesn't pattern-match label text at
-- diagnosis time.

alter table verdicts add column verification_required boolean not null default false;

alter table gaps add column action_label text;
update gaps set action_label = label where action_label is null;
alter table gaps alter column action_label set not null;

-- Named action_queue, not "action-aggregate" or similar — but note this is
-- a different concept from the pre-existing "Action Queue" UI view
-- (components/views/action-queue.tsx, per-opportunity urgency sorting).
-- This view is consumed only by Home's ProfileEnhancer.
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
group by action_label, user_id
order by unblock_count desc;

alter view action_queue set (security_invoker = true);
