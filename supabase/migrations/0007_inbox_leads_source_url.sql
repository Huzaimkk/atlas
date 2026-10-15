-- opportunities.source_url is NOT NULL (0001) — a lead pasted as raw text
-- with no URL genuinely has no source yet, and fabricating one would
-- violate the same "never cite anything but the primary source" rule
-- Channel B follows. Storing it (nullable) on the lead lets the confirm
-- step ask the user for a real source_url before save, instead of either
-- blocking raw-text paste entirely or inventing a URL to satisfy the
-- constraint.
alter table inbox_leads add column source_url text;
