-- Persists the verdict computed at extraction time, so a lead the user
-- hasn't confirmed yet (across a page reload, or days later) still shows
-- the exact verdict/reasoning they'd be confirming — not a value
-- recomputed against whatever the profile looks like now, which could
-- silently disagree with what was actually reviewed.
alter table inbox_leads add column verdict_preview jsonb;
