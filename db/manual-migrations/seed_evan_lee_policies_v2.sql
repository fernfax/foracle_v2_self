-- ─── Policy seed v2: demo new fields ─────────────────────────────────────────
--
-- Patches existing seed policies with planName / coverageOptions / cashValue /
-- premiumAmountCPF, then inserts 5 new policies to exercise every UI feature:
--
--   • plan name on card chips and coverage-matrix cells
--   • CPF premium split in summary bar and card footer
--   • cash / surrender value in card footer + detail modal
--   • CRITICAL expiry badge  (<  90 days → red)  — Elea H&S maturing 2026-07-15
--   • WARNING  expiry badge  (< 365 days → amber) — Evan Term maturing 2026-12-31
--   • Benefit matrix columns: death, TPD, CI, ECI, disability, H&S
--   • Mrs Lee has zero policies → warning triangle in benefit/coverage matrix
--
-- Idempotent: UPDATEs are safe to re-run; INSERTs use ON CONFLICT DO NOTHING.
--
-- Run:
--   /Applications/Postgres.app/Contents/Versions/latest/bin/psql \
--     postgresql://evanlee@localhost:5432/foracle_v2_self \
--     -f db/manual-migrations/seed_evan_lee_policies_v2.sql

\set ON_ERROR_STOP on
\set EVAN_USER   '\'user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set EVAN_FAMILY '\'fam_user_37saN3qoomjrkSRkqix5DaIPEdg\''

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- A. Patch existing seed policies with new columns
-- ════════════════════════════════════════════════════════════════════════════

-- Evan — Manulife Whole Life (LifeReady Plus II)
--   CPF OA pays part of the premium; has cash value after 6 years
UPDATE policies SET
  plan_name           = 'LifeReady Plus II',
  coverage_until_age  = 99,
  premium_amount_cpf  = '100.00',
  cash_value          = '18500.00',
  cash_value_date     = '2026-01-01',
  coverage_options    = '{"death":500000,"tpd":500000,"criticalIllness":100000,"earlyCriticalIllness":0,"disabilityIncome":0,"personalAccident":0,"hospitalisationSurgical":0}',
  updated_at          = now()
WHERE id = 'seed_pol_evan_life';

-- Evan — AIA Critical Illness (Power Critical Cover)
UPDATE policies SET
  plan_name          = 'Power Critical Cover',
  coverage_until_age = 85,
  coverage_options   = '{"death":0,"tpd":0,"criticalIllness":300000,"earlyCriticalIllness":100000,"disabilityIncome":0,"personalAccident":0,"hospitalisationSurgical":0}',
  updated_at         = now()
WHERE id = 'seed_pol_evan_ci';

-- Bei Yu — Prudential Whole Life (PRUlife Multiplier)
--   CPF OA contributes; modest cash value after 4 years
UPDATE policies SET
  plan_name          = 'PRUlife Multiplier',
  coverage_until_age = 99,
  premium_amount_cpf = '80.00',
  cash_value         = '9200.00',
  cash_value_date    = '2026-01-01',
  coverage_options   = '{"death":300000,"tpd":300000,"criticalIllness":75000,"earlyCriticalIllness":0,"disabilityIncome":0,"personalAccident":0,"hospitalisationSurgical":0}',
  updated_at         = now()
WHERE id = 'seed_pol_bei_life';

-- Elea Lee — Great Eastern H&S (SupremeHealth P Plus)
--   CRITICAL ALERT: maturity_date = 2026-07-15 → 38 days from 2026-06-07
UPDATE policies SET
  plan_name     = 'SupremeHealth P Plus',
  maturity_date = '2026-07-15',
  coverage_options = '{"death":0,"tpd":0,"criticalIllness":0,"earlyCriticalIllness":0,"disabilityIncome":0,"personalAccident":0,"hospitalisationSurgical":-1}',
  updated_at    = now()
WHERE id = 'seed_pol_elea_health';

-- Ethel Lee — Great Eastern H&S (SupremeHealth P Plus) — no alert, keep simple
UPDATE policies SET
  plan_name        = 'SupremeHealth P Plus',
  coverage_options = '{"death":0,"tpd":0,"criticalIllness":0,"earlyCriticalIllness":0,"disabilityIncome":0,"personalAccident":0,"hospitalisationSurgical":-1}',
  updated_at       = now()
WHERE id = 'seed_pol_ethel_health';

-- ════════════════════════════════════════════════════════════════════════════
-- B. New policies
-- ════════════════════════════════════════════════════════════════════════════

-- B1. Evan — Term Life (AIA)
--   WARNING ALERT: maturity_date = 2026-12-31 → ~207 days from 2026-06-07
INSERT INTO policies (
  id, user_id, family_id, family_member_id,
  provider, plan_name, policy_type, status,
  start_date, maturity_date, coverage_until_age,
  premium_amount, premium_frequency,
  coverage_options,
  description, is_active, created_at, updated_at
)
SELECT
  'seed_pol_evan_term',
  :EVAN_USER, :EVAN_FAMILY, fm.id,
  'AIA', 'Term Protect Advantage', 'Term Life', 'Active',
  '2016-07-01', '2026-12-31', NULL,
  '85.00', 'Monthly',
  '{"death":1000000,"tpd":1000000,"criticalIllness":0,"earlyCriticalIllness":0,"disabilityIncome":0,"personalAccident":0,"hospitalisationSurgical":0}',
  'Seed — 10-year term expiring end-2026 (renewal due)', true, now(), now()
FROM family_members fm
WHERE fm.family_id = :EVAN_FAMILY
  AND fm.relationship = 'Self'
  AND fm.clerk_user_id = :EVAN_USER
ON CONFLICT (id) DO NOTHING;

-- B2. Evan — Disability Income (NTUC Income)
INSERT INTO policies (
  id, user_id, family_id, family_member_id,
  provider, plan_name, policy_type, status,
  start_date, coverage_until_age,
  premium_amount, premium_frequency, total_premium_duration,
  coverage_options,
  description, is_active, created_at, updated_at
)
SELECT
  'seed_pol_evan_dis',
  :EVAN_USER, :EVAN_FAMILY, fm.id,
  'NTUC Income', 'DIRECT Disability Income', 'Disability Insurance', 'Active',
  '2022-03-01', 65,
  '72.00', 'Monthly', NULL,
  '{"death":0,"tpd":0,"criticalIllness":0,"earlyCriticalIllness":0,"disabilityIncome":5000,"personalAccident":0,"hospitalisationSurgical":0}',
  'Seed — $5k/month disability income benefit to age 65', true, now(), now()
FROM family_members fm
WHERE fm.family_id = :EVAN_FAMILY
  AND fm.relationship = 'Self'
  AND fm.clerk_user_id = :EVAN_USER
ON CONFLICT (id) DO NOTHING;

-- B3. Bei Yu — Critical Illness (Tokio Marine)
INSERT INTO policies (
  id, user_id, family_id, family_member_id,
  provider, plan_name, policy_type, status,
  start_date, coverage_until_age,
  premium_amount, premium_frequency, total_premium_duration,
  coverage_options,
  description, is_active, created_at, updated_at
)
SELECT
  'seed_pol_bei_ci',
  :EVAN_USER, :EVAN_FAMILY, fm.id,
  'Tokio Marine', 'TM MultiCare', 'Critical Illness', 'Active',
  '2023-08-01', 85,
  '98.00', 'Monthly', 30,
  '{"death":0,"tpd":0,"criticalIllness":200000,"earlyCriticalIllness":100000,"disabilityIncome":0,"personalAccident":0,"hospitalisationSurgical":0}',
  'Seed — Bei Yu CI multi-pay plan', true, now(), now()
FROM family_members fm
WHERE fm.family_id = :EVAN_FAMILY
  AND fm.name = 'Bei Yu'
  AND fm.relationship = 'Spouse'
ON CONFLICT (id) DO NOTHING;

-- B4. Bei Yu — Hospitalisation Plan (AIA, fully CPF-funded)
INSERT INTO policies (
  id, user_id, family_id, family_member_id,
  provider, plan_name, policy_type, status,
  start_date,
  premium_amount, premium_amount_cpf, premium_frequency,
  coverage_options,
  description, is_active, created_at, updated_at
)
SELECT
  'seed_pol_bei_health',
  :EVAN_USER, :EVAN_FAMILY, fm.id,
  'AIA', 'HealthShield Gold Max B', 'Hospitalisation Plan', 'Active',
  '2022-04-01',
  '0.00', '42.00', 'Monthly',
  '{"death":0,"tpd":0,"criticalIllness":0,"earlyCriticalIllness":0,"disabilityIncome":0,"personalAccident":0,"hospitalisationSurgical":-1}',
  'Seed — fully CPF Medisave-funded; cash premium $0', true, now(), now()
FROM family_members fm
WHERE fm.family_id = :EVAN_FAMILY
  AND fm.name = 'Bei Yu'
  AND fm.relationship = 'Spouse'
ON CONFLICT (id) DO NOTHING;

-- B5. Evan — Personal Accident (Sompo)
INSERT INTO policies (
  id, user_id, family_id, family_member_id,
  provider, plan_name, policy_type, status,
  start_date,
  premium_amount, premium_frequency,
  coverage_options,
  description, is_active, created_at, updated_at
)
SELECT
  'seed_pol_evan_pa',
  :EVAN_USER, :EVAN_FAMILY, fm.id,
  'Sompo', 'Personal Accident Superior', 'Other', 'Active',
  '2024-01-01',
  '18.00', 'Monthly',
  '{"death":0,"tpd":0,"criticalIllness":0,"earlyCriticalIllness":0,"disabilityIncome":0,"personalAccident":200000,"hospitalisationSurgical":0}',
  'Seed — $200k personal accident coverage', true, now(), now()
FROM family_members fm
WHERE fm.family_id = :EVAN_FAMILY
  AND fm.relationship = 'Self'
  AND fm.clerk_user_id = :EVAN_USER
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- C. Post-flight summary
-- ════════════════════════════════════════════════════════════════════════════
\echo
\echo === Seeded policies (all seed_pol_*) ===
SELECT
  p.id,
  COALESCE(fm.name, '(no member)') AS member,
  p.provider,
  p.plan_name,
  p.policy_type,
  p.status,
  p.maturity_date,
  p.premium_amount,
  p.premium_amount_cpf,
  p.cash_value,
  CASE WHEN p.coverage_options IS NOT NULL THEN 'yes' ELSE 'no' END AS has_coverage
FROM policies p
LEFT JOIN family_members fm ON fm.id = p.family_member_id
WHERE p.id LIKE 'seed_pol_%'
ORDER BY fm.name, p.policy_type;

COMMIT;
