-- ─── CPF balance seed (local) ─────────────────────────────────────────────────
--
-- Populates the cpf_ordinary_account / cpf_special_account /
-- cpf_medisave_account balance fields on the two CPF-eligible income rows that
-- already exist for Alex Tan (Self) and Jamie Tan (Spouse).
--
-- Also writes the derived monthly contribution fields so the income row is
-- internally consistent:
--   employee_cpf_contribution  = gross × employee rate (capped at OW ceiling)
--   employer_cpf_contribution  = gross × employer rate
--   net_take_home              = gross − employee CPF
--
-- CPF rates used (both members are ≤ 35, Singapore citizens):
--   Employee 20 %, Employer 17 %
--   OA 62.17 %, SA 16.22 %, MA 21.62 % (allocation by age-bracket)
--
-- Idempotent — uses UPDATE, safe to re-run.
--
-- Run:
--   /Applications/Postgres.app/Contents/Versions/latest/bin/psql \
--     postgresql://evanlee@localhost:5432/foracle_v2_self \
--     -f db/manual-migrations/seed_cpf_balances_local.sql

\set ON_ERROR_STOP on

BEGIN;

-- ─── Alex Tan (Self, age ~30, $7,500 / month) ────────────────────────────────
-- CPF cap = min(7500, 8000) = 7500
-- Employee CPF  = 7500 × 20 % = 1500
-- Employer CPF  = 7500 × 17 % = 1275
-- Net take-home = 7500 − 1500 = 6000
--
-- Accumulated balance (working ~8 yrs; OA partially drawn for HDB mortgage):
--   OA  $68,000  |  SA  $36,000  |  MA  $28,500
UPDATE incomes_beta SET
  subject_to_cpf             = true,
  employee_cpf_contribution  = 1500.00,
  employer_cpf_contribution  = 1275.00,
  net_take_home              = 6000.00,
  cpf_ordinary_account       = 68000.00,
  cpf_special_account        = 36000.00,
  cpf_medisave_account       = 28500.00,
  updated_at                 = now()
WHERE id = 'beta_R04IYHv_ueZArJ2bzGjoR';   -- Alex's Salary

-- ─── Jamie Tan (Spouse, age ~35, $7,000 / month) ─────────────────────────────
-- CPF cap = min(7000, 8000) = 7000
-- Employee CPF  = 7000 × 20 % = 1400
-- Employer CPF  = 7000 × 17 % = 1190
-- Net take-home = 7000 − 1400 = 5600
--
-- Accumulated balance (working ~13 yrs; career break mid-period;
-- OA partially drawn for same HDB mortgage):
--   OA  $89,000  |  SA  $48,000  |  MA  $32,500
UPDATE incomes_beta SET
  subject_to_cpf             = true,
  employee_cpf_contribution  = 1400.00,
  employer_cpf_contribution  = 1190.00,
  net_take_home              = 5600.00,
  cpf_ordinary_account       = 89000.00,
  cpf_special_account        = 48000.00,
  cpf_medisave_account       = 32500.00,
  updated_at                 = now()
WHERE id = '5ciWvHbuhoZxV9hQMP1jc';        -- Jamie Tan's income

-- ─── Post-flight: verify ─────────────────────────────────────────────────────
\echo
\echo === CPF balance seed result ===
SELECT
  ib.id,
  fm.name,
  fm.relationship,
  ib.amount::numeric            AS gross_monthly,
  ib.net_take_home::numeric     AS nett,
  ib.employee_cpf_contribution::numeric AS emp_cpf,
  ib.employer_cpf_contribution::numeric AS er_cpf,
  ib.cpf_ordinary_account::numeric      AS oa_bal,
  ib.cpf_special_account::numeric       AS sa_bal,
  ib.cpf_medisave_account::numeric      AS ma_bal,
  (ib.cpf_ordinary_account::numeric
   + ib.cpf_special_account::numeric
   + ib.cpf_medisave_account::numeric)  AS total_bal
FROM incomes_beta ib
JOIN family_members fm ON fm.id = ib.family_member_id
WHERE ib.id IN (
  'beta_R04IYHv_ueZArJ2bzGjoR',
  '5ciWvHbuhoZxV9hQMP1jc'
)
ORDER BY fm.relationship;

COMMIT;
