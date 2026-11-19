-- Atlas — UNEXAMINED verdict.
--
-- A row with zero requirements and zero eligibility rules was diagnosed
-- READY, because nothing recorded meant nothing could be missing. On
-- 19 Nov 2026 that was true of all 41 READY rows. READY claims every rule
-- passes; for these rows no rule was ever recorded, so nothing was
-- checked. UNEXAMINED says that instead (lib/diagnostic-engine.ts).

alter table verdicts drop constraint if exists verdicts_type_check;
alter table verdicts add constraint verdicts_type_check
  check (type in ('READY', 'GAP', 'BLOCKED', 'IRRELEVANT', 'LATE_WINDOW', 'EXPIRED', 'NOT_YET_OPEN', 'UNEXAMINED'));
