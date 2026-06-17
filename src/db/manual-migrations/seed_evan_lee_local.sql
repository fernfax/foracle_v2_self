-- ─── Local seed: Evan Lee ─────────────────────────────────────────────────────
--
-- Seeds testing data across every major tab for user_37saN3qoomjrkSRkqix5DaIPEdg
-- (family fam_user_37saN3qoomjrkSRkqix5DaIPEdg).
--
-- Idempotent — every insert is ON CONFLICT DO NOTHING. All seeded rows use the
-- `seed_*` ID prefix so they're easy to identify and roll back.
--
-- Run:
--   $PSQL "$LOCAL_DB" -f db/manual-migrations/seed_evan_lee_local.sql
--
-- Roll back: uncomment the DELETEs at the bottom and re-run, or run them
-- individually in a psql session.

\set ON_ERROR_STOP on
\set EVAN_USER   '\'user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set EVAN_FAMILY '\'fam_user_37saN3qoomjrkSRkqix5DaIPEdg\''

BEGIN;

\echo
\echo === Pre-flight: existing family_members in Evans family ===
SELECT id, name, relationship, clerk_user_id IS NOT NULL AS clerk_linked
FROM family_members
WHERE family_id = :EVAN_FAMILY
ORDER BY relationship, name;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Family — spouse, children, parent (all informational placeholders so the
--    Family tab + dependents data have something to render)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO family_members (
  id, user_id, family_id, name, first_name, last_name, relationship,
  date_of_birth, is_contributing, notes, status, created_at, updated_at
) VALUES
  ('seed_fm_bei',   :EVAN_USER, :EVAN_FAMILY, 'Bei Yu',    'Bei',   'Yu',  'Spouse',
   '1990-11-22', true,
   'Seed — household partner', 'informational', now(), now()),
  ('seed_fm_elea',  :EVAN_USER, :EVAN_FAMILY, 'Elea Lee',  'Elea',  'Lee', 'Child',
   '2018-04-10', false,
   'Seed', 'informational', now(), now()),
  ('seed_fm_ethel', :EVAN_USER, :EVAN_FAMILY, 'Ethel Lee', 'Ethel', 'Lee', 'Child',
   '2020-09-03', false,
   'Seed', 'informational', now(), now()),
  ('seed_fm_mum',   :EVAN_USER, :EVAN_FAMILY, 'Mrs Lee',   'Mrs',   'Lee', 'Parent',
   '1962-08-14', false,
   'Seed', 'informational', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Incomes — freelance (Evan) + dividend (Bei)
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO incomes (
  id, user_id, family_id, family_member_id, name, category, income_category,
  amount, frequency, subject_to_cpf, account_for_bonus, description,
  start_date, is_active, created_at, updated_at
)
SELECT
  'seed_inc_evan_side',
  :EVAN_USER, :EVAN_FAMILY, fm.id,
  'Consulting Side Income', 'freelance', 'current-recurring',
  '2000.00', 'monthly',
  false, false,
  'Seed',
  '2025-03-01', true,
  now(), now()
FROM family_members fm
WHERE fm.family_id = :EVAN_FAMILY
  AND fm.relationship = 'Self'
  AND fm.clerk_user_id = :EVAN_USER
ON CONFLICT (id) DO NOTHING;

INSERT INTO incomes (
  id, user_id, family_id, family_member_id, name, category, income_category,
  amount, frequency, custom_months, subject_to_cpf, description,
  start_date, is_active, created_at, updated_at
)
SELECT
  'seed_inc_bei_dividend',
  :EVAN_USER, :EVAN_FAMILY, fm.id,
  'Dividend Payout', 'investment', 'current-recurring',
  '800.00', 'custom',
  '[3,6,9,12]',
  false,
  'Seed — quarterly dividend',
  '2024-01-01', true,
  now(), now()
FROM family_members fm
WHERE fm.family_id = :EVAN_FAMILY
  AND fm.name = 'Bei Yu'
  AND fm.relationship = 'Spouse'
ON CONFLICT (id) DO NOTHING;

-- Past income (Bei Yu's previous role, ended 2023-12). Tests past-income
-- handling in the timeline + beta view.
INSERT INTO incomes (
  id, user_id, family_id, family_member_id, name, category, income_category,
  amount, frequency, subject_to_cpf, description,
  start_date, end_date, is_active, created_at, updated_at
)
SELECT
  'seed_inc_bei_prev_job',
  :EVAN_USER, :EVAN_FAMILY, fm.id,
  'Previous Job (Bei Yu)', 'salary', 'past-recurring',
  '4500.00', 'monthly',
  true,
  'Seed — historical salary, ended Dec 2023',
  '2022-01-01', '2023-12-31', false,
  now(), now()
FROM family_members fm
WHERE fm.family_id = :EVAN_FAMILY
  AND fm.name = 'Bei Yu'
  AND fm.relationship = 'Spouse'
ON CONFLICT (id) DO NOTHING;

-- Yearly bonus (Evan). Tests yearly-frequency normalisation to monthly in
-- the beta copy below.
INSERT INTO incomes (
  id, user_id, family_id, family_member_id, name, category, income_category,
  amount, frequency, subject_to_cpf, description,
  start_date, is_active, created_at, updated_at
)
SELECT
  'seed_inc_evan_bonus',
  :EVAN_USER, :EVAN_FAMILY, fm.id,
  'Year-End Bonus', 'salary', 'current-recurring',
  '30000.00', 'yearly',
  false,
  'Seed — annual bonus, paid Dec',
  '2024-12-01', true,
  now(), now()
FROM family_members fm
WHERE fm.family_id = :EVAN_FAMILY
  AND fm.relationship = 'Self'
  AND fm.clerk_user_id = :EVAN_USER
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. Current Holdings + initial history snapshot
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO current_holdings (
  id, user_id, family_id, family_member_id, bank_name, holding_amount,
  created_at, updated_at
) VALUES
  ('seed_h_dbs_multi', :EVAN_USER, :EVAN_FAMILY, NULL, 'DBS Multiplier (Evan)', '32000', now(), now()),
  ('seed_h_posb_save', :EVAN_USER, :EVAN_FAMILY, NULL, 'POSB eSavings (Bei Yu)','18500', now(), now()),
  ('seed_h_joint',     :EVAN_USER, :EVAN_FAMILY, NULL, 'DBS Joint Savings',      '45000', now(), now()),
  ('seed_h_hsbc_usd',  :EVAN_USER, :EVAN_FAMILY, NULL, 'HSBC USD (Evan)',         '6200', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Link Evan's holdings to his Self row, Bei's to hers
UPDATE current_holdings SET family_member_id = (
  SELECT id FROM family_members
  WHERE family_id = :EVAN_FAMILY
    AND relationship = 'Self'
    AND clerk_user_id = :EVAN_USER
  LIMIT 1
) WHERE id IN ('seed_h_dbs_multi', 'seed_h_hsbc_usd');

UPDATE current_holdings SET family_member_id = (
  SELECT id FROM family_members
  WHERE family_id = :EVAN_FAMILY
    AND name = 'Bei Yu'
    AND relationship = 'Spouse'
  LIMIT 1
) WHERE id = 'seed_h_posb_save';

INSERT INTO holding_amount_history (id, holding_id, user_id, family_id, amount, recorded_at)
SELECT
  'seed_hh_' || h.id,
  h.id, h.user_id, h.family_id, h.holding_amount,
  now() - interval '7 days'
FROM current_holdings h
WHERE h.id LIKE 'seed_h_%'
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. Expense Categories — ensure Investments + Retirement exist
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO expense_categories (
  id, user_id, family_id, name, icon, is_default, tracked_in_budget,
  created_at, updated_at
) VALUES
  ('seed_cat_invest', :EVAN_USER, :EVAN_FAMILY, 'Investments', 'trending-up', false, true, now(), now()),
  ('seed_cat_retire', :EVAN_USER, :EVAN_FAMILY, 'Retirement',  'piggy-bank',  false, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. Recurring Expenses
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO expenses (
  id, user_id, family_id, name, category, expense_category, amount, frequency,
  description, is_active, tracked_in_budget, created_at, updated_at
) VALUES
  ('seed_e_groceries',   :EVAN_USER, :EVAN_FAMILY, 'Groceries (FairPrice)',    'Food',           'current-recurring', '850', 'monthly', 'Seed', true, true, now(), now()),
  ('seed_e_dining',      :EVAN_USER, :EVAN_FAMILY, 'Restaurants & Cafés',      'Food',           'current-recurring', '420', 'monthly', 'Seed', true, true, now(), now()),
  ('seed_e_mrt',         :EVAN_USER, :EVAN_FAMILY, 'MRT/Bus',                  'Transportation', 'current-recurring', '180', 'monthly', 'Seed', true, true, now(), now()),
  ('seed_e_fuel',        :EVAN_USER, :EVAN_FAMILY, 'Fuel (Esso)',              'Transportation', 'current-recurring', '250', 'monthly', 'Seed', true, true, now(), now()),
  ('seed_e_netflix',     :EVAN_USER, :EVAN_FAMILY, 'Netflix',                  'Entertainment',  'current-recurring', '24',  'monthly', 'Seed', true, true, now(), now()),
  ('seed_e_spotify',     :EVAN_USER, :EVAN_FAMILY, 'Spotify Family',           'Entertainment',  'current-recurring', '20',  'monthly', 'Seed', true, true, now(), now()),
  ('seed_e_gym',         :EVAN_USER, :EVAN_FAMILY, 'Anytime Fitness',          'Healthcare',     'current-recurring', '90',  'monthly', 'Seed', true, true, now(), now()),
  ('seed_e_phone',       :EVAN_USER, :EVAN_FAMILY, 'StarHub Mobile (2 lines)', 'Utilities',      'current-recurring', '115', 'monthly', 'Seed', true, true, now(), now()),
  ('seed_e_inet',        :EVAN_USER, :EVAN_FAMILY, 'StarHub Broadband',        'Utilities',      'current-recurring', '69',  'monthly', 'Seed', true, true, now(), now()),
  ('seed_e_childcare',   :EVAN_USER, :EVAN_FAMILY, 'Childcare',                'Children',       'current-recurring', '850', 'monthly', 'Seed', true, true, now(), now()),
  ('seed_e_invest_dca',  :EVAN_USER, :EVAN_FAMILY, 'Stocks DCA — Endowus',     'Investments',    'current-recurring', '500', 'monthly', 'Seed', true, true, now(), now()),
  ('seed_e_retirement',  :EVAN_USER, :EVAN_FAMILY, 'SRS Contribution',         'Retirement',     'current-recurring', '300', 'monthly', 'Seed', true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 6. Daily Expenses — ~20 entries spread across May 2026
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO daily_expenses (
  id, user_id, family_id, category_name, subcategory_name, amount, note,
  date, created_at, updated_at
) VALUES
  ('seed_de_01', :EVAN_USER, :EVAN_FAMILY, 'Food',           NULL, '65.40', 'FairPrice weekly',   '2026-05-03', now(), now()),
  ('seed_de_02', :EVAN_USER, :EVAN_FAMILY, 'Food',           NULL, '42.50', 'Pho dinner',         '2026-05-04', now(), now()),
  ('seed_de_03', :EVAN_USER, :EVAN_FAMILY, 'Transportation', NULL, '12.50', 'MRT top-up',         '2026-05-05', now(), now()),
  ('seed_de_04', :EVAN_USER, :EVAN_FAMILY, 'Entertainment',  NULL, '28.00', 'Cinema',             '2026-05-07', now(), now()),
  ('seed_de_05', :EVAN_USER, :EVAN_FAMILY, 'Food',           NULL, '85.20', 'Groceries',          '2026-05-10', now(), now()),
  ('seed_de_06', :EVAN_USER, :EVAN_FAMILY, 'Food',           NULL, '38.00', 'Bak kut teh',        '2026-05-11', now(), now()),
  ('seed_de_07', :EVAN_USER, :EVAN_FAMILY, 'Healthcare',     NULL, '15.00', 'Pharmacy',           '2026-05-12', now(), now()),
  ('seed_de_08', :EVAN_USER, :EVAN_FAMILY, 'Transportation', NULL, '25.00', 'Grab',               '2026-05-13', now(), now()),
  ('seed_de_09', :EVAN_USER, :EVAN_FAMILY, 'Children',       NULL, '45.00', 'School supplies',    '2026-05-14', now(), now()),
  ('seed_de_10', :EVAN_USER, :EVAN_FAMILY, 'Food',           NULL, '78.30', 'Groceries',          '2026-05-17', now(), now()),
  ('seed_de_11', :EVAN_USER, :EVAN_FAMILY, 'Food',           NULL, '56.00', 'Chinatown dinner',   '2026-05-18', now(), now()),
  ('seed_de_12', :EVAN_USER, :EVAN_FAMILY, 'Entertainment',  NULL, '18.50', 'Movie night',        '2026-05-20', now(), now()),
  ('seed_de_13', :EVAN_USER, :EVAN_FAMILY, 'Transportation', NULL, '14.30', 'Bus card top-up',    '2026-05-21', now(), now()),
  ('seed_de_14', :EVAN_USER, :EVAN_FAMILY, 'Food',           NULL, '92.00', 'Big grocery run',    '2026-05-24', now(), now()),
  ('seed_de_15', :EVAN_USER, :EVAN_FAMILY, 'Food',           NULL, '48.50', 'Lunch with team',    '2026-05-26', now(), now()),
  ('seed_de_16', :EVAN_USER, :EVAN_FAMILY, 'Shopping',       NULL, '35.00', 'Kids clothes',       '2026-05-27', now(), now()),
  ('seed_de_17', :EVAN_USER, :EVAN_FAMILY, 'Healthcare',     NULL, '95.00', 'GP visit',           '2026-05-28', now(), now()),
  ('seed_de_18', :EVAN_USER, :EVAN_FAMILY, 'Transportation', NULL, '8.50',  'MRT',                '2026-05-29', now(), now()),
  ('seed_de_19', :EVAN_USER, :EVAN_FAMILY, 'Food',           NULL, '32.00', 'Hawker dinner',      '2026-05-29', now(), now()),
  ('seed_de_20', :EVAN_USER, :EVAN_FAMILY, 'Entertainment',  NULL, '22.00', 'Coffee w/ friends',  '2026-05-30', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 7. Property Asset
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO property_assets (
  id, user_id, family_id, property_name, purchase_date,
  original_purchase_price, loan_amount_taken, outstanding_loan,
  monthly_loan_payment, interest_rate, paid_by_cpf,
  is_active, created_at, updated_at
) VALUES (
  'seed_p_hdb',
  :EVAN_USER, :EVAN_FAMILY,
  'Punggol HDB 4-Room',
  '2021-03-15',
  '520000', '400000', '310000',
  '1540', '2.6', true,
  true, now(), now()
)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 8. Vehicle Asset
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO vehicle_assets (
  id, user_id, family_id, vehicle_name, purchase_date, coe_expiry_date,
  original_purchase_price, loan_amount_taken, loan_amount_repaid,
  monthly_loan_payment, is_active, created_at, updated_at
) VALUES (
  'seed_v_corolla',
  :EVAN_USER, :EVAN_FAMILY,
  'Toyota Corolla Hybrid',
  '2020-04-20', '2030-04-15',
  '120000', '80000', '32000',
  '890', true, now(), now()
)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 9. Insurance Policies — 5 covering the household
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO policies (
  id, user_id, family_id, family_member_id, provider, policy_type, status,
  start_date, premium_amount, premium_frequency, total_premium_duration,
  description, is_active, created_at, updated_at
)
SELECT
  'seed_pol_evan_life',
  :EVAN_USER, :EVAN_FAMILY, fm.id,
  'Manulife', 'Whole Life', 'Active',
  '2020-01-01', '245', 'Monthly', 25,
  'Seed — whole life', true, now(), now()
FROM family_members fm
WHERE fm.family_id = :EVAN_FAMILY
  AND fm.relationship = 'Self'
  AND fm.clerk_user_id = :EVAN_USER
ON CONFLICT (id) DO NOTHING;

INSERT INTO policies (
  id, user_id, family_id, family_member_id, provider, policy_type, status,
  start_date, premium_amount, premium_frequency, total_premium_duration,
  description, is_active, created_at, updated_at
)
SELECT
  'seed_pol_evan_ci',
  :EVAN_USER, :EVAN_FAMILY, fm.id,
  'AIA', 'Critical Illness', 'Active',
  '2021-06-01', '120', 'Monthly', 30,
  'Seed — critical illness', true, now(), now()
FROM family_members fm
WHERE fm.family_id = :EVAN_FAMILY
  AND fm.relationship = 'Self'
  AND fm.clerk_user_id = :EVAN_USER
ON CONFLICT (id) DO NOTHING;

INSERT INTO policies (
  id, user_id, family_id, family_member_id, provider, policy_type, status,
  start_date, premium_amount, premium_frequency, total_premium_duration,
  description, is_active, created_at, updated_at
)
SELECT
  'seed_pol_bei_life',
  :EVAN_USER, :EVAN_FAMILY, fm.id,
  'Prudential', 'Whole Life', 'Active',
  '2022-04-01', '180', 'Monthly', 25,
  'Seed — whole life Bei Yu', true, now(), now()
FROM family_members fm
WHERE fm.family_id = :EVAN_FAMILY
  AND fm.name = 'Bei Yu'
  AND fm.relationship = 'Spouse'
ON CONFLICT (id) DO NOTHING;

INSERT INTO policies (
  id, user_id, family_id, family_member_id, provider, policy_type, status,
  start_date, premium_amount, premium_frequency, total_premium_duration,
  description, is_active, created_at, updated_at
)
SELECT
  'seed_pol_elea_health',
  :EVAN_USER, :EVAN_FAMILY, fm.id,
  'Great Eastern', 'Hospitalisation Plan', 'Active',
  '2023-01-15', '65', 'Monthly', 18,
  'Seed — child hospital plan', true, now(), now()
FROM family_members fm
WHERE fm.family_id = :EVAN_FAMILY
  AND fm.name = 'Elea Lee'
ON CONFLICT (id) DO NOTHING;

INSERT INTO policies (
  id, user_id, family_id, family_member_id, provider, policy_type, status,
  start_date, premium_amount, premium_frequency, total_premium_duration,
  description, is_active, created_at, updated_at
)
SELECT
  'seed_pol_ethel_health',
  :EVAN_USER, :EVAN_FAMILY, fm.id,
  'Great Eastern', 'Hospitalisation Plan', 'Active',
  '2023-01-15', '65', 'Monthly', 18,
  'Seed — child hospital plan', true, now(), now()
FROM family_members fm
WHERE fm.family_id = :EVAN_FAMILY
  AND fm.name = 'Ethel Lee'
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 10. Investments
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO investment_policies (
  id, user_id, family_id, name, type, current_capital, projected_yield,
  contribution_amount, contribution_frequency, is_active, created_at, updated_at
) VALUES
  ('seed_iv_stocks_sg', :EVAN_USER, :EVAN_FAMILY, 'SGX Blue Chip Portfolio', 'stock',  '42000', '5.5', '300', 'monthly', true, now(), now()),
  ('seed_iv_etf_us',    :EVAN_USER, :EVAN_FAMILY, 'S&P 500 ETF (CSPX)',      'etf',    '28000', '8.2', '400', 'monthly', true, now(), now()),
  ('seed_iv_bonds',     :EVAN_USER, :EVAN_FAMILY, 'Singapore Savings Bonds', 'bonds',  '20000', '3.1', '0',   'monthly', true, now(), now()),
  ('seed_iv_crypto',    :EVAN_USER, :EVAN_FAMILY, 'BTC/ETH Cold Storage',    'crypto',  '8500', '0',   '0',   'monthly', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 11. Goals
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO goals (
  id, user_id, family_id, goal_name, goal_type, target_amount, target_date,
  current_amount_saved, monthly_contribution, description, is_achieved,
  is_active, created_at, updated_at
) VALUES
  ('seed_g_emergency',    :EVAN_USER, :EVAN_FAMILY, 'Emergency Fund',             'primary',   '50000',   '2027-06-30', '32000', '1500', 'Seed', false, true, now(), now()),
  ('seed_g_home_upgrade', :EVAN_USER, :EVAN_FAMILY, 'Condo Upgrade Down Payment', 'primary',   '250000',  '2030-12-31', '45000', '2000', 'Seed', false, true, now(), now()),
  ('seed_g_kids_edu',     :EVAN_USER, :EVAN_FAMILY, 'Children Education Fund',    'primary',   '200000',  '2040-06-30', '18000', '800',  'Seed', false, true, now(), now()),
  ('seed_g_retirement',   :EVAN_USER, :EVAN_FAMILY, 'Retirement Nest Egg',        'secondary', '1500000', '2055-01-01', '90000', '1800', 'Seed', false, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 12. Budget Shifts — illustrative shifts in May 2026
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO budget_shifts (
  id, user_id, family_id, year, month, from_category_name, to_category_name,
  amount, note, created_at
) VALUES
  ('seed_bs_dine',  :EVAN_USER, :EVAN_FAMILY, 2026, 5, 'Entertainment',  'Food',      '80', 'Anniversary dinner', now()),
  ('seed_bs_trans', :EVAN_USER, :EVAN_FAMILY, 2026, 5, 'Transportation', 'Utilities', '50', 'Extra aircon use',   now())
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- 13. Fix-up & policy↔expense linking (idempotent)
-- ────────────────────────────────────────────────────────────────────────────
-- An earlier version of this seed used lowercase enums (`'life'`, `'active'`,
-- `'monthly'`). The UI dropdowns expect canonical title-case strings, so any
-- row seeded under the old values needs its policy_type / status /
-- premium_frequency rewritten. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

UPDATE policies SET policy_type = 'Whole Life',          status = 'Active', premium_frequency = 'Monthly', updated_at = now() WHERE id = 'seed_pol_evan_life';
UPDATE policies SET policy_type = 'Critical Illness',    status = 'Active', premium_frequency = 'Monthly', updated_at = now() WHERE id = 'seed_pol_evan_ci';
UPDATE policies SET policy_type = 'Whole Life',          status = 'Active', premium_frequency = 'Monthly', updated_at = now() WHERE id = 'seed_pol_bei_life';
UPDATE policies SET policy_type = 'Hospitalisation Plan', status = 'Active', premium_frequency = 'Monthly', updated_at = now() WHERE id = 'seed_pol_elea_health';
UPDATE policies SET policy_type = 'Hospitalisation Plan', status = 'Active', premium_frequency = 'Monthly', updated_at = now() WHERE id = 'seed_pol_ethel_health';

-- Auto-generated Insurance expenses, one per policy. The expense.frequency
-- value stays lowercase per the expense form's contract (UI shows "Monthly"
-- via a label, stores "monthly" in the value).
INSERT INTO expenses (
  id, user_id, family_id, linked_policy_id, name, category, expense_category,
  amount, frequency, description, is_active, tracked_in_budget,
  created_at, updated_at
) VALUES
  ('seed_pol_exp_evan_life',    :EVAN_USER, :EVAN_FAMILY, 'seed_pol_evan_life',    'Whole Life - Manulife',        'Insurance', 'current-recurring', '245', 'monthly', 'Auto-generated from policy', true, true, now(), now()),
  ('seed_pol_exp_evan_ci',      :EVAN_USER, :EVAN_FAMILY, 'seed_pol_evan_ci',      'Critical Illness - AIA',       'Insurance', 'current-recurring', '120', 'monthly', 'Auto-generated from policy', true, true, now(), now()),
  ('seed_pol_exp_bei_life',     :EVAN_USER, :EVAN_FAMILY, 'seed_pol_bei_life',     'Whole Life - Prudential',      'Insurance', 'current-recurring', '180', 'monthly', 'Auto-generated from policy', true, true, now(), now()),
  ('seed_pol_exp_elea_health',  :EVAN_USER, :EVAN_FAMILY, 'seed_pol_elea_health',  'Hospitalisation Plan - Great Eastern (Elea)',  'Insurance', 'current-recurring', '65', 'monthly', 'Auto-generated from policy', true, true, now(), now()),
  ('seed_pol_exp_ethel_health', :EVAN_USER, :EVAN_FAMILY, 'seed_pol_ethel_health', 'Hospitalisation Plan - Great Eastern (Ethel)', 'Insurance', 'current-recurring', '65', 'monthly', 'Auto-generated from policy', true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Close the other side of the link.
UPDATE policies SET linked_expense_id = 'seed_pol_exp_evan_life',    updated_at = now() WHERE id = 'seed_pol_evan_life'    AND (linked_expense_id IS NULL OR linked_expense_id <> 'seed_pol_exp_evan_life');
UPDATE policies SET linked_expense_id = 'seed_pol_exp_evan_ci',      updated_at = now() WHERE id = 'seed_pol_evan_ci'      AND (linked_expense_id IS NULL OR linked_expense_id <> 'seed_pol_exp_evan_ci');
UPDATE policies SET linked_expense_id = 'seed_pol_exp_bei_life',     updated_at = now() WHERE id = 'seed_pol_bei_life'     AND (linked_expense_id IS NULL OR linked_expense_id <> 'seed_pol_exp_bei_life');
UPDATE policies SET linked_expense_id = 'seed_pol_exp_elea_health',  updated_at = now() WHERE id = 'seed_pol_elea_health'  AND (linked_expense_id IS NULL OR linked_expense_id <> 'seed_pol_exp_elea_health');
UPDATE policies SET linked_expense_id = 'seed_pol_exp_ethel_health', updated_at = now() WHERE id = 'seed_pol_ethel_health' AND (linked_expense_id IS NULL OR linked_expense_id <> 'seed_pol_exp_ethel_health');

-- ════════════════════════════════════════════════════════════════════════════
-- 14. Replicate incomes → incomes_beta
-- ────────────────────────────────────────────────────────────────────────────
-- incomes_beta drops the `frequency` + `custom_months` columns (beta assumes
-- monthly-only) and uses a simpler 3-value income_category (past|current|
-- future). For every row in Evan's family's `incomes`, copy across with
-- amount + CPF fields scaled to their monthly-equivalent value, and the
-- income_category collapsed to the beta enum.
--
-- Mapping ratios:
--   monthly        ×1
--   yearly         ÷12
--   quarterly      ÷3
--   weekly         ×52/12
--   bi-weekly      ×26/12
--   custom         × (count of selected months) / 12
--   one-time       skipped (ratio = 0)
--
-- Beta row IDs are `beta_<original_id>` so the replication is idempotent and
-- easy to spot. Re-runs use ON CONFLICT DO NOTHING (first replication wins;
-- to re-sync after editing incomes, DELETE FROM incomes_beta WHERE id LIKE
-- 'beta_%' first).
-- ════════════════════════════════════════════════════════════════════════════

INSERT INTO incomes_beta (
  id, user_id, family_id, family_member_id, name, category, income_category,
  amount, start_date, end_date,
  subject_to_cpf, account_for_bonus, bonus_groups,
  employee_cpf_contribution, employer_cpf_contribution, net_take_home,
  cpf_ordinary_account, cpf_special_account, cpf_medisave_account,
  description, past_income_history, future_milestones,
  account_for_future_change, is_active, created_at, updated_at
)
SELECT
  'beta_' || i.id,
  i.user_id, i.family_id, i.family_member_id, i.name, i.category,
  CASE
    WHEN i.income_category LIKE 'past%'   THEN 'past'
    WHEN i.income_category LIKE 'future%' THEN 'future'
    ELSE 'current'
  END,
  ROUND((i.amount * ratio.r)::numeric, 2),
  i.start_date, i.end_date,
  i.subject_to_cpf, i.account_for_bonus, i.bonus_groups,
  CASE WHEN i.employee_cpf_contribution IS NULL THEN NULL ELSE ROUND((i.employee_cpf_contribution * ratio.r)::numeric, 2) END,
  CASE WHEN i.employer_cpf_contribution IS NULL THEN NULL ELSE ROUND((i.employer_cpf_contribution * ratio.r)::numeric, 2) END,
  CASE WHEN i.net_take_home              IS NULL THEN NULL ELSE ROUND((i.net_take_home * ratio.r)::numeric, 2) END,
  CASE WHEN i.cpf_ordinary_account       IS NULL THEN NULL ELSE ROUND((i.cpf_ordinary_account * ratio.r)::numeric, 2) END,
  CASE WHEN i.cpf_special_account        IS NULL THEN NULL ELSE ROUND((i.cpf_special_account * ratio.r)::numeric, 2) END,
  CASE WHEN i.cpf_medisave_account       IS NULL THEN NULL ELSE ROUND((i.cpf_medisave_account * ratio.r)::numeric, 2) END,
  COALESCE(i.description, '') || ' (replicated from incomes ' || i.id || ')',
  i.past_income_history, i.future_milestones,
  i.account_for_future_change, i.is_active,
  now(), now()
FROM incomes i
CROSS JOIN LATERAL (
  SELECT CASE LOWER(COALESCE(i.frequency, 'monthly'))
    WHEN 'monthly'    THEN 1.0
    WHEN 'yearly'     THEN 1.0/12.0
    WHEN 'annual'     THEN 1.0/12.0
    WHEN 'quarterly'  THEN 1.0/3.0
    WHEN 'weekly'     THEN 52.0/12.0
    WHEN 'bi-weekly'  THEN 26.0/12.0
    WHEN 'biweekly'   THEN 26.0/12.0
    WHEN 'custom'     THEN
      CASE WHEN i.custom_months IS NOT NULL
        THEN jsonb_array_length(i.custom_months::jsonb)::numeric / 12.0
        ELSE 1.0
      END
    WHEN 'one-time'   THEN 0
    ELSE 1.0
  END AS r
) AS ratio
WHERE i.family_id = :EVAN_FAMILY
  AND ratio.r > 0
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- Post-flight: row counts of seeded data
-- ════════════════════════════════════════════════════════════════════════════
\echo
\echo === Post-flight: seeded row counts ===
SELECT 'family_members'         AS tbl, count(*) FROM family_members         WHERE id LIKE 'seed_%'
UNION ALL SELECT 'policies w/ linked expense', count(*) FROM policies         WHERE id LIKE 'seed_pol_%' AND linked_expense_id IS NOT NULL
UNION ALL SELECT 'incomes',               count(*) FROM incomes              WHERE id LIKE 'seed_%'
UNION ALL SELECT 'incomes_beta (replicated)', count(*) FROM incomes_beta      WHERE id LIKE 'beta_%' AND family_id = :EVAN_FAMILY
UNION ALL SELECT 'current_holdings',      count(*) FROM current_holdings     WHERE id LIKE 'seed_%'
UNION ALL SELECT 'holding_amount_history', count(*) FROM holding_amount_history WHERE id LIKE 'seed_%'
UNION ALL SELECT 'expense_categories',    count(*) FROM expense_categories   WHERE id LIKE 'seed_%'
UNION ALL SELECT 'expenses',              count(*) FROM expenses             WHERE id LIKE 'seed_%'
UNION ALL SELECT 'daily_expenses',        count(*) FROM daily_expenses       WHERE id LIKE 'seed_%'
UNION ALL SELECT 'property_assets',       count(*) FROM property_assets      WHERE id LIKE 'seed_%'
UNION ALL SELECT 'vehicle_assets',        count(*) FROM vehicle_assets       WHERE id LIKE 'seed_%'
UNION ALL SELECT 'policies',              count(*) FROM policies             WHERE id LIKE 'seed_%'
UNION ALL SELECT 'investment_policies',   count(*) FROM investment_policies  WHERE id LIKE 'seed_%'
UNION ALL SELECT 'goals',                 count(*) FROM goals                WHERE id LIKE 'seed_%'
UNION ALL SELECT 'budget_shifts',         count(*) FROM budget_shifts        WHERE id LIKE 'seed_%';

COMMIT;

-- ────────────────────────────────────────────────────────────────────────────
-- ROLLBACK: uncomment the block below and re-run the file to wipe seed data
-- (or run these statements individually in psql).
--
-- BEGIN;
-- DELETE FROM holding_amount_history WHERE id LIKE 'seed_%';
-- DELETE FROM current_holdings       WHERE id LIKE 'seed_%';
-- DELETE FROM expenses               WHERE id LIKE 'seed_%';
-- DELETE FROM daily_expenses         WHERE id LIKE 'seed_%';
-- DELETE FROM property_assets        WHERE id LIKE 'seed_%';
-- DELETE FROM vehicle_assets         WHERE id LIKE 'seed_%';
-- DELETE FROM policies               WHERE id LIKE 'seed_%';
-- DELETE FROM investment_policies    WHERE id LIKE 'seed_%';
-- DELETE FROM goals                  WHERE id LIKE 'seed_%';
-- DELETE FROM budget_shifts          WHERE id LIKE 'seed_%';
-- DELETE FROM expense_categories     WHERE id LIKE 'seed_%';
-- DELETE FROM incomes                WHERE id LIKE 'seed_%';
-- DELETE FROM family_members         WHERE id LIKE 'seed_%';
-- DELETE FROM incomes_beta           WHERE id LIKE 'beta_%';
-- COMMIT;
