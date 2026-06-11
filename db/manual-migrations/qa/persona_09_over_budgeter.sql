-- ═══════════════════════════════════════════════════════════════════════════
-- PERSONA 09 — "Aisha", Over-Budgeter (35)
-- ═══════════════════════════════════════════════════════════════════════════
-- Churn lens: "Budget math is off / it nags me."
-- Profile: single mum, 1 child, moderate salary but spends OVER budget every
--   month — car + personal loan, childcare, many daily expenses across every
--   category, and MULTIPLE budget shifts (the P2 shift-correctness area).
--   Small savings, behind-schedule debt-payoff goal.
-- Deep-tests: budget (deep mutations), expenses, daily expenses. STRESSES the
--   budget-shift double-count guard + over-pace ("danger") states.
--
-- RUN AFTER _reset_family.sql. IDs prefixed qa_p09_.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\set U       '\'user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set FAM     '\'fam_user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set SELF_FM '\'AfJc5H4SGvgCH7RBO35cH\''

BEGIN;

-- 0. Self = Aisha
UPDATE family_members SET
  name = 'Aisha Rahman', first_name = 'Aisha', last_name = 'Rahman',
  relationship = 'Self', date_of_birth = '1991-07-19',
  is_contributing = true, updated_at = now()
WHERE id = :SELF_FM;

-- 1. Child
INSERT INTO family_members (id, user_id, family_id, name, first_name, last_name, relationship, date_of_birth, is_contributing, notes, status, created_at, updated_at) VALUES
  ('qa_p09_fm_kid', :U, :FAM, 'Zara Rahman', 'Zara', 'Rahman', 'Child', '2018-11-05', false, 'Kindergarten', 'informational', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 2. Categories (many, all tracked)
INSERT INTO expense_categories (id, user_id, family_id, name, icon, is_default, tracked_in_budget, created_at, updated_at) VALUES
  ('qa_p09_cat_food',     :U, :FAM, 'Food',           'utensils',     true, true, now(), now()),
  ('qa_p09_cat_transport',:U, :FAM, 'Transportation', 'car',          true, true, now(), now()),
  ('qa_p09_cat_housing',  :U, :FAM, 'Housing',        'home',         true, true, now(), now()),
  ('qa_p09_cat_utilities',:U, :FAM, 'Utilities',      'plug',         true, true, now(), now()),
  ('qa_p09_cat_children', :U, :FAM, 'Children',       'baby',         true, true, now(), now()),
  ('qa_p09_cat_shopping', :U, :FAM, 'Shopping',       'shopping-bag', true, true, now(), now()),
  ('qa_p09_cat_enter',    :U, :FAM, 'Entertainment',  'clapperboard', true, true, now(), now()),
  ('qa_p09_cat_health',   :U, :FAM, 'Healthcare',     'heart-pulse',  true, true, now(), now()),
  ('qa_p09_cat_debt',     :U, :FAM, 'Debt',           'banknote',     true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Income — single salary, CPF (take-home ~4,400)
INSERT INTO incomes_beta (id, user_id, family_id, family_member_id, name, category, income_category, amount, start_date, subject_to_cpf, employee_cpf_contribution, employer_cpf_contribution, net_take_home, cpf_ordinary_account, cpf_special_account, cpf_medisave_account, is_active, created_at, updated_at) VALUES
  ('qa_p09_inc_salary', :U, :FAM, :SELF_FM, 'Admin Manager Salary', 'salary', 'current', '5500.00', '2016-01-01', true, '1100.00', '935.00', '4400.00', '58000.00', '34000.00', '27000.00', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 4. Small savings
INSERT INTO current_holdings (id, user_id, family_id, family_member_id, bank_name, holding_amount, created_at, updated_at) VALUES
  ('qa_p09_h_save', :U, :FAM, :SELF_FM, 'POSB Savings', '3200', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO holding_amount_history (id, holding_id, user_id, family_id, amount, recorded_at)
SELECT 'qa_p09_hh_' || h.id, h.id, h.user_id, h.family_id, h.holding_amount, now() - interval '30 days'
FROM current_holdings h WHERE h.id LIKE 'qa_p09_h_%' ON CONFLICT (id) DO NOTHING;

-- 5. Recurring expenses — TOTAL EXCEEDS take-home (over-budget by design)
INSERT INTO expenses (id, user_id, family_id, name, category, expense_category, amount, frequency, description, is_active, tracked_in_budget, created_at, updated_at) VALUES
  ('qa_p09_e_rent',     :U, :FAM, 'Flat Rental',        'Housing',        'current-recurring', '2200', 'monthly', NULL, true, true, now(), now()),
  ('qa_p09_e_carloan',  :U, :FAM, 'Car Loan',           'Debt',           'current-recurring', '700',  'monthly', NULL, true, true, now(), now()),
  ('qa_p09_e_persloan', :U, :FAM, 'Personal Loan',      'Debt',           'current-recurring', '450',  'monthly', NULL, true, true, now(), now()),
  ('qa_p09_e_childcare',:U, :FAM, 'Childcare (Zara)',   'Children',       'current-recurring', '900',  'monthly', NULL, true, true, now(), now()),
  ('qa_p09_e_food',     :U, :FAM, 'Groceries',          'Food',           'current-recurring', '650',  'monthly', NULL, true, true, now(), now()),
  ('qa_p09_e_petrol',   :U, :FAM, 'Petrol + Parking',   'Transportation', 'current-recurring', '320',  'monthly', NULL, true, true, now(), now()),
  ('qa_p09_e_util',     :U, :FAM, 'Utilities + Telco',  'Utilities',      'current-recurring', '230',  'monthly', NULL, true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 6. Daily expenses — June 2026 (MANY, exceed category budgets)
INSERT INTO daily_expenses (id, user_id, family_id, category_name, subcategory_name, amount, note, date, created_at, updated_at) VALUES
  ('qa_p09_de_01', :U, :FAM, 'Food',          NULL, '38.00',  'Groceries',          '2026-06-01', now(), now()),
  ('qa_p09_de_02', :U, :FAM, 'Children',      NULL, '120.00', 'School shoes',       '2026-06-01', now(), now()),
  ('qa_p09_de_03', :U, :FAM, 'Shopping',      NULL, '180.00', 'Zalora haul',        '2026-06-02', now(), now()),
  ('qa_p09_de_04', :U, :FAM, 'Food',          NULL, '24.00',  'Lunch + bubble tea', '2026-06-02', now(), now()),
  ('qa_p09_de_05', :U, :FAM, 'Transportation',NULL, '45.00',  'Grab (late)',        '2026-06-03', now(), now()),
  ('qa_p09_de_06', :U, :FAM, 'Entertainment', NULL, '60.00',  'Movie + arcade',     '2026-06-03', now(), now()),
  ('qa_p09_de_07', :U, :FAM, 'Food',          NULL, '88.00',  'Weekend dining',     '2026-06-04', now(), now()),
  ('qa_p09_de_08', :U, :FAM, 'Shopping',      NULL, '240.00', 'Impulse — IKEA',     '2026-06-05', now(), now()),
  ('qa_p09_de_09', :U, :FAM, 'Children',      NULL, '95.00',  'Toys',               '2026-06-05', now(), now()),
  ('qa_p09_de_10', :U, :FAM, 'Healthcare',    NULL, '140.00', 'Kid fever — GP',     '2026-06-06', now(), now()),
  ('qa_p09_de_11', :U, :FAM, 'Food',          NULL, '32.00',  'Takeout',            '2026-06-06', now(), now()),
  ('qa_p09_de_12', :U, :FAM, 'Transportation',NULL, '52.00',  'Grab x2',            '2026-06-07', now(), now()),
  ('qa_p09_de_13', :U, :FAM, 'Shopping',      NULL, '95.00',  'Cosmetics',          '2026-06-07', now(), now()),
  ('qa_p09_de_14', :U, :FAM, 'Food',          NULL, '46.00',  'Hawker dinner x3',   '2026-06-08', now(), now()),
  ('qa_p09_de_15', :U, :FAM, 'Entertainment', NULL, '38.00',  'Netflix + Disney',   '2026-06-08', now(), now()),
  ('qa_p09_de_16', :U, :FAM, 'Children',      NULL, '210.00', 'Enrichment deposit', '2026-06-09', now(), now()),
  ('qa_p09_de_17', :U, :FAM, 'Food',          NULL, '18.50',  'Breakfast',          '2026-06-09', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 7. MULTIPLE budget shifts — June 2026 (exercises shift double-count guard)
INSERT INTO budget_shifts (id, user_id, family_id, year, month, from_category_name, to_category_name, amount, note, created_at) VALUES
  ('qa_p09_bs_01', :U, :FAM, 2026, 6, 'Entertainment',  'Food',     '50',  'Ran over on food',        now()),
  ('qa_p09_bs_02', :U, :FAM, 2026, 6, 'Transportation', 'Shopping', '80',  'Sale temptation',         now()),
  ('qa_p09_bs_03', :U, :FAM, 2026, 6, 'Utilities',      'Children', '100', 'Kid medical + school',    now()),
  ('qa_p09_bs_04', :U, :FAM, 2026, 6, 'Food',           'Healthcare','40', 'GP visit',                now()),
  ('qa_p09_bs_05', :U, :FAM, 2026, 6, 'Shopping',       'Children', '60',  'More school stuff',       now())
ON CONFLICT (id) DO NOTHING;

-- 8. One behind-schedule debt-payoff goal
INSERT INTO goals (id, user_id, family_id, goal_name, goal_type, target_amount, target_date, current_amount_saved, monthly_contribution, description, is_achieved, is_active, created_at, updated_at) VALUES
  ('qa_p09_g_debt', :U, :FAM, 'Clear Personal Loan', 'primary', '18000', '2026-09-30', '2400', '300', NULL, false, true, now(), now())
ON CONFLICT (id) DO NOTHING;

\echo
\echo === Persona 09 seeded row counts ===
SELECT 'family_members' AS tbl, count(*) FROM family_members WHERE family_id = :FAM
UNION ALL SELECT 'incomes_beta', count(*) FROM incomes_beta WHERE family_id = :FAM
UNION ALL SELECT 'expenses', count(*) FROM expenses WHERE family_id = :FAM
UNION ALL SELECT 'daily_expenses', count(*) FROM daily_expenses WHERE family_id = :FAM
UNION ALL SELECT 'budget_shifts', count(*) FROM budget_shifts WHERE family_id = :FAM
UNION ALL SELECT 'goals', count(*) FROM goals WHERE family_id = :FAM
UNION ALL SELECT 'current_holdings', count(*) FROM current_holdings WHERE family_id = :FAM
ORDER BY tbl;

COMMIT;
