-- ═══════════════════════════════════════════════════════════════════════════
-- PERSONA 02 — "Wei Jie", Fresh Grad (24)
-- ═══════════════════════════════════════════════════════════════════════════
-- Churn lens: "Too complex for my simple finances."
-- Profile: single, 1 salary $3,800 (CPF), rents a room, minimal spend, small
--   savings, 1 emergency-fund goal. No property/vehicle/investments; tests that
--   a simple user isn't overwhelmed and that asset/policy empty states are clean.
-- Deep-tests: incomes, budget, goals.
--
-- RUN AFTER _reset_family.sql. IDs prefixed qa_p02_.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\set U       '\'user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set FAM     '\'fam_user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set SELF_FM '\'AfJc5H4SGvgCH7RBO35cH\''

BEGIN;

-- 0. Self identity
UPDATE family_members SET
  name = 'Wei Jie Tan', first_name = 'Wei Jie', last_name = 'Tan',
  relationship = 'Self', date_of_birth = '2002-01-18',
  is_contributing = true, updated_at = now()
WHERE id = :SELF_FM;

-- 1. Expense categories (a simple set)
INSERT INTO expense_categories (id, user_id, family_id, name, icon, is_default, tracked_in_budget, created_at, updated_at) VALUES
  ('qa_p02_cat_food',     :U, :FAM, 'Food',           'utensils',     true, true, now(), now()),
  ('qa_p02_cat_transport',:U, :FAM, 'Transportation', 'car',          true, true, now(), now()),
  ('qa_p02_cat_housing',  :U, :FAM, 'Housing',        'home',         true, true, now(), now()),
  ('qa_p02_cat_utilities',:U, :FAM, 'Utilities',      'plug',         true, true, now(), now()),
  ('qa_p02_cat_enter',    :U, :FAM, 'Entertainment',  'clapperboard', true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 2. Income — single salary, CPF (young, low accumulated balance)
INSERT INTO incomes_beta (
  id, user_id, family_id, family_member_id, name, category, income_category,
  amount, start_date, subject_to_cpf,
  employee_cpf_contribution, employer_cpf_contribution, net_take_home,
  cpf_ordinary_account, cpf_special_account, cpf_medisave_account,
  is_active, created_at, updated_at
) VALUES (
  'qa_p02_inc_salary', :U, :FAM, :SELF_FM,
  'Graduate Analyst Salary', 'salary', 'current',
  '3800.00', '2025-07-01', true,
  '760.00', '646.00', '3040.00',
  '11200.00', '4200.00', '3600.00',
  true, now(), now()
) ON CONFLICT (id) DO NOTHING;

-- 3. One savings holding
INSERT INTO current_holdings (id, user_id, family_id, family_member_id, bank_name, holding_amount, created_at, updated_at) VALUES
  ('qa_p02_h_dbs', :U, :FAM, :SELF_FM, 'DBS Multiplier', '6800', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO holding_amount_history (id, holding_id, user_id, family_id, amount, recorded_at)
SELECT 'qa_p02_hh_' || h.id, h.id, h.user_id, h.family_id, h.holding_amount, now() - interval '30 days'
FROM current_holdings h WHERE h.id LIKE 'qa_p02_h_%' ON CONFLICT (id) DO NOTHING;

-- 4. Recurring expenses (modest)
INSERT INTO expenses (id, user_id, family_id, name, category, expense_category, amount, frequency, description, is_active, tracked_in_budget, created_at, updated_at) VALUES
  ('qa_p02_e_rent',   :U, :FAM, 'Room Rental',        'Housing',        'current-recurring', '900', 'monthly', NULL, true, true, now(), now()),
  ('qa_p02_e_food',   :U, :FAM, 'Food & Groceries',   'Food',           'current-recurring', '550', 'monthly', NULL, true, true, now(), now()),
  ('qa_p02_e_mrt',    :U, :FAM, 'MRT/Bus',            'Transportation', 'current-recurring', '120', 'monthly', NULL, true, true, now(), now()),
  ('qa_p02_e_phone',  :U, :FAM, 'Mobile Plan',        'Utilities',      'current-recurring', '35',  'monthly', NULL, true, true, now(), now()),
  ('qa_p02_e_subs',   :U, :FAM, 'Spotify + Netflix',  'Entertainment',  'current-recurring', '28',  'monthly', NULL, true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 5. Daily expenses — June 2026 (light)
INSERT INTO daily_expenses (id, user_id, family_id, category_name, subcategory_name, amount, note, date, created_at, updated_at) VALUES
  ('qa_p02_de_01', :U, :FAM, 'Food',           NULL, '12.50', 'Hawker lunch',      '2026-06-02', now(), now()),
  ('qa_p02_de_02', :U, :FAM, 'Transportation', NULL, '4.20',  'MRT',               '2026-06-02', now(), now()),
  ('qa_p02_de_03', :U, :FAM, 'Food',           NULL, '28.00', 'Groceries — NTUC',  '2026-06-04', now(), now()),
  ('qa_p02_de_04', :U, :FAM, 'Entertainment',  NULL, '18.00', 'Movie',             '2026-06-06', now(), now()),
  ('qa_p02_de_05', :U, :FAM, 'Food',           NULL, '15.00', 'Dinner w/ friends', '2026-06-07', now(), now()),
  ('qa_p02_de_06', :U, :FAM, 'Transportation', NULL, '9.50',  'Grab home',         '2026-06-08', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 6. One goal — emergency fund (early progress)
INSERT INTO goals (id, user_id, family_id, goal_name, goal_type, target_amount, target_date, current_amount_saved, monthly_contribution, description, is_achieved, is_active, created_at, updated_at) VALUES
  ('qa_p02_g_emergency', :U, :FAM, 'Emergency Fund (3mo)', 'primary', '12000', '2027-06-30', '6800', '400', NULL, false, true, now(), now())
ON CONFLICT (id) DO NOTHING;

\echo
\echo === Persona 02 seeded row counts ===
SELECT 'family_members' AS tbl, count(*) FROM family_members WHERE family_id = :FAM
UNION ALL SELECT 'incomes_beta', count(*) FROM incomes_beta WHERE family_id = :FAM
UNION ALL SELECT 'expense_categories', count(*) FROM expense_categories WHERE family_id = :FAM
UNION ALL SELECT 'expenses', count(*) FROM expenses WHERE family_id = :FAM
UNION ALL SELECT 'daily_expenses', count(*) FROM daily_expenses WHERE family_id = :FAM
UNION ALL SELECT 'current_holdings', count(*) FROM current_holdings WHERE family_id = :FAM
UNION ALL SELECT 'goals', count(*) FROM goals WHERE family_id = :FAM
ORDER BY tbl;

COMMIT;
