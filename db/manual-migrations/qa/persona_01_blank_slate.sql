-- ═══════════════════════════════════════════════════════════════════════════
-- PERSONA 01 — "Maya", Blank Slate (23)
-- ═══════════════════════════════════════════════════════════════════════════
-- Churn lens: "I signed up but see nothing useful — why bother?"
-- Profile: just onboarded, ZERO financial data. Tests every empty state across
--   all 17 pages: empty CTAs, no-data charts, graceful zero-states, no crashes.
-- Deep-tests: empty states on every page.
--
-- RUN AFTER _reset_family.sql. After reset the family holds ONLY the Self row;
-- this script just gives Self the persona identity and inserts NOTHING else.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\set SELF_FM '\'AfJc5H4SGvgCH7RBO35cH\''
\set FAM     '\'fam_user_37saN3qoomjrkSRkqix5DaIPEdg\''

BEGIN;

UPDATE family_members SET
  name = 'Maya Rahman', first_name = 'Maya', last_name = 'Rahman',
  relationship = 'Self', date_of_birth = '2003-05-20',
  is_contributing = true, updated_at = now()
WHERE id = :SELF_FM;

\echo
\echo === Persona 01 (blank slate) — everything should be 0 except family_members = 1 ===
SELECT 'family_members' AS tbl, count(*) FROM family_members WHERE family_id = :FAM
UNION ALL SELECT 'incomes_beta', count(*) FROM incomes_beta WHERE family_id = :FAM
UNION ALL SELECT 'expenses', count(*) FROM expenses WHERE family_id = :FAM
UNION ALL SELECT 'daily_expenses', count(*) FROM daily_expenses WHERE family_id = :FAM
UNION ALL SELECT 'policies', count(*) FROM policies WHERE family_id = :FAM
UNION ALL SELECT 'goals', count(*) FROM goals WHERE family_id = :FAM
UNION ALL SELECT 'investment_policies', count(*) FROM investment_policies WHERE family_id = :FAM
UNION ALL SELECT 'current_holdings', count(*) FROM current_holdings WHERE family_id = :FAM
UNION ALL SELECT 'property_assets', count(*) FROM property_assets WHERE family_id = :FAM
UNION ALL SELECT 'vehicle_assets', count(*) FROM vehicle_assets WHERE family_id = :FAM
ORDER BY tbl;

COMMIT;
