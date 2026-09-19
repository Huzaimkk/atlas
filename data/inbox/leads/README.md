# Leads inbox

Drop anything that might be an opportunity here — this is the manual ingest channel described in `atlas-v2-spec1.md` §9e.

**Accepted formats:** PNG, JPEG, PDF, TXT, or a plain-text file containing a pasted URL.

Every drop enters the pool as a **lead**, never a fact — `source_type: social|manual`, `verification_level: unverified` — and gets resolved against a primary source before it's shown as actionable. If a drop duplicates an existing row it merges into it; if it contradicts an existing row, that row is flagged `conflicting` for your review rather than silently overwritten. Third-party personal data (someone else's offer letter, a certificate number, a private email) is stripped at ingest and never stored.

Nothing in this folder is committed to git (see the root `.gitignore`) — once a drop is parsed into the pool, the source file itself isn't the record of truth; the database row is.
