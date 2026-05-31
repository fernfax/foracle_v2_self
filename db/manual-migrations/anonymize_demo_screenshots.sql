-- ─── Anonymize demo data for public landing-page screenshots ──────────────────
--
-- Renames every personally-identifying display field in the local demo family
-- (fam_user_37saN3qoomjrkSRkqix5DaIPEdg) to a fictional "Tan" household and
-- swaps real insurer names for fictional ones, so screenshots captured for the
-- public landing page contain no real personal data.
--
-- Persona map:
--   Evan Lee (Self)  → Alex Tan        Bei Yu (Spouse) → Jamie Tan
--   Elea Lee (Child) → Mia Tan         Ethel Lee (Child) → Kai Tan
--   Mrs Lee (Parent) → Mdm Tan
--   Manulife → Lionheart Life     AIA → Merlion Assurance
--   Prudential → Sunrise Mutual   Great Eastern → Harbourview Health
--
-- Idempotent: re-running is safe (matches by stable id, sets fixed values).
-- Run:
--   psql "$LOCAL_DB" -f db/manual-migrations/anonymize_demo_screenshots.sql

\set FAMILY '\'fam_user_37saN3qoomjrkSRkqix5DaIPEdg\''

BEGIN;

-- 1. Family members
UPDATE family_members SET name='Alex Tan',  first_name='Alex',  last_name='Tan' WHERE family_id=:FAMILY AND relationship='Self';
UPDATE family_members SET name='Jamie Tan', first_name='Jamie', last_name='Tan' WHERE id='seed_fm_bei';
UPDATE family_members SET name='Mia Tan',   first_name='Mia',   last_name='Tan' WHERE id='seed_fm_elea';
UPDATE family_members SET name='Kai Tan',   first_name='Kai',   last_name='Tan' WHERE id='seed_fm_ethel';
UPDATE family_members SET name='Mdm Tan',   first_name='Mdm',   last_name='Tan' WHERE id='seed_fm_mum';

-- 2. Income names (Evan's/Bei Yu's salaries come from onboarding, not the seed)
UPDATE incomes SET name='Alex''s Salary'        WHERE family_id=:FAMILY AND name='Evan''s Salary';
UPDATE incomes SET name='Jamie''s Salary'       WHERE family_id=:FAMILY AND name='Bei Yu''s Salary';
UPDATE incomes SET name='Previous Job (Jamie)'  WHERE id='seed_inc_bei_prev_job';

-- Beta-view replicas (keep them consistent even though screenshots don't use them)
UPDATE incomes_beta SET name='Alex''s Salary'       WHERE family_id=:FAMILY AND name='Evan''s Salary';
UPDATE incomes_beta SET name='Jamie''s Salary'      WHERE family_id=:FAMILY AND name='Bei Yu''s Salary';
UPDATE incomes_beta SET name='Previous Job (Jamie)' WHERE family_id=:FAMILY AND name='Previous Job (Bei Yu)';

-- 3. Insurance providers → fictional
UPDATE policies SET provider='Lionheart Life'     WHERE id='seed_pol_evan_life';
UPDATE policies SET provider='Merlion Assurance'  WHERE id='seed_pol_evan_ci';
UPDATE policies SET provider='Sunrise Mutual'     WHERE id='seed_pol_bei_life';
UPDATE policies SET provider='Harbourview Health' WHERE id IN ('seed_pol_elea_health','seed_pol_ethel_health');

-- 4. Auto-generated insurance expense labels (provider + child name appear here)
UPDATE expenses SET name='Whole Life - Lionheart Life'                    WHERE id='seed_pol_exp_evan_life';
UPDATE expenses SET name='Critical Illness - Merlion Assurance'           WHERE id='seed_pol_exp_evan_ci';
UPDATE expenses SET name='Whole Life - Sunrise Mutual'                    WHERE id='seed_pol_exp_bei_life';
UPDATE expenses SET name='Hospitalisation Plan - Harbourview Health (Mia)' WHERE id='seed_pol_exp_elea_health';
UPDATE expenses SET name='Hospitalisation Plan - Harbourview Health (Kai)' WHERE id='seed_pol_exp_ethel_health';

-- 5. Cash-holding labels that embed a first name
UPDATE current_holdings SET bank_name='DBS Multiplier (Alex)' WHERE id='seed_h_dbs_multi';
UPDATE current_holdings SET bank_name='HSBC USD (Alex)'       WHERE id='seed_h_hsbc_usd';
UPDATE current_holdings SET bank_name='POSB eSavings (Jamie)' WHERE id='seed_h_posb_save';

COMMIT;

\echo
\echo === After anonymization ===
SELECT relationship, name FROM family_members WHERE family_id=:FAMILY ORDER BY relationship;
SELECT name FROM incomes WHERE family_id=:FAMILY ORDER BY name;
SELECT provider FROM policies WHERE family_id=:FAMILY ORDER BY provider;
