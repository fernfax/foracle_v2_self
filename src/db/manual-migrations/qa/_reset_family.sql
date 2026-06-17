-- ═══════════════════════════════════════════════════════════════════════════
-- QA RESET — wipe ALL financial data for the one QA test household.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Used by the pre-Vercel-migration functional QA pass. Between personas we wipe
-- this family's data and re-seed a fresh persona dataset, reusing one Clerk
-- login (evanleeyz@gmail.com). See QA_FUNCTIONAL_TEST_PLAN.md.
--
-- PRESERVES (never deleted):
--   • users     row  (the Clerk login binding — user_37saN3qoomjrkSRkqix5DaIPEdg)
--   • families  row  (fam_user_37saN3qoomjrkSRkqix5DaIPEdg)
--   • the clerk-linked "Self" family_member row (AfJc5H4SGvgCH7RBO35cH) — every
--     income/policy/holding "Self" JOIN depends on it and it is NOT auto-recreated.
--
-- Deletes every row in every family_id-scoped table for this family (authoritative
-- list pulled from information_schema — all 21 family_id tables, minus users).
--
-- Run:
--   /Applications/Postgres.app/Contents/Versions/17/bin/psql \
--     postgresql://evanlee@localhost:5432/foracle_v2_self \
--     -f db/manual-migrations/qa/_reset_family.sql
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\set FAM     '\'fam_user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set SELF_FM '\'AfJc5H4SGvgCH7RBO35cH\''

BEGIN;

-- 1. Leaf / history tables first
DELETE FROM holding_amount_history WHERE family_id = :FAM;
DELETE FROM daily_expenses         WHERE family_id = :FAM;
DELETE FROM expense_subcategories  WHERE family_id = :FAM;

-- 2. Tables that FK into family_members (clear before the family_members delete)
DELETE FROM policies               WHERE family_id = :FAM;
DELETE FROM current_holdings       WHERE family_id = :FAM;
DELETE FROM incomes_beta           WHERE family_id = :FAM;

-- 3. Remaining flat family_id-scoped tables (no inter-FK ordering needed)
DELETE FROM expenses               WHERE family_id = :FAM;
DELETE FROM expense_categories     WHERE family_id = :FAM;
DELETE FROM property_assets        WHERE family_id = :FAM;
DELETE FROM vehicle_assets         WHERE family_id = :FAM;
DELETE FROM assets                 WHERE family_id = :FAM;
DELETE FROM investment_policies    WHERE family_id = :FAM;
DELETE FROM goals                  WHERE family_id = :FAM;
DELETE FROM budget_shifts          WHERE family_id = :FAM;
DELETE FROM quick_links            WHERE family_id = :FAM;
DELETE FROM user_chunks            WHERE family_id = :FAM;
DELETE FROM insurance_providers    WHERE family_id = :FAM;
DELETE FROM incomes_legacy_archived WHERE family_id = :FAM;
DELETE FROM push_tokens            WHERE family_id = :FAM;

-- 4. family_members LAST — keep ONLY the clerk-linked Self row
DELETE FROM family_members WHERE family_id = :FAM AND id <> :SELF_FM;

-- Post-flight: confirm everything is clear except the Self row
\echo
\echo === Reset result (should all be 0 except family_members = 1) ===
SELECT 'incomes_beta'    AS tbl, count(*) FROM incomes_beta    WHERE family_id = :FAM
UNION ALL SELECT 'expenses',        count(*) FROM expenses        WHERE family_id = :FAM
UNION ALL SELECT 'daily_expenses',  count(*) FROM daily_expenses  WHERE family_id = :FAM
UNION ALL SELECT 'policies',        count(*) FROM policies        WHERE family_id = :FAM
UNION ALL SELECT 'goals',           count(*) FROM goals           WHERE family_id = :FAM
UNION ALL SELECT 'investment_policies', count(*) FROM investment_policies WHERE family_id = :FAM
UNION ALL SELECT 'current_holdings', count(*) FROM current_holdings WHERE family_id = :FAM
UNION ALL SELECT 'property_assets', count(*) FROM property_assets WHERE family_id = :FAM
UNION ALL SELECT 'vehicle_assets',  count(*) FROM vehicle_assets  WHERE family_id = :FAM
UNION ALL SELECT 'expense_categories', count(*) FROM expense_categories WHERE family_id = :FAM
UNION ALL SELECT 'budget_shifts',   count(*) FROM budget_shifts   WHERE family_id = :FAM
UNION ALL SELECT 'family_members (keep Self=1)', count(*) FROM family_members WHERE family_id = :FAM
ORDER BY tbl;

COMMIT;
