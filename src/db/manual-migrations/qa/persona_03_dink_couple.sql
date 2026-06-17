-- ═══════════════════════════════════════════════════════════════════════════
-- PERSONA 03 — "Rachel & Tom", DINK Couple (29 / 31)
-- ═══════════════════════════════════════════════════════════════════════════
-- Churn lens: "Can't model our shared / joint finances."
-- Profile: dual income (Rachel $6,500 + Tom $7,200, both CPF), no kids, renting
--   while saving for first condo, 1 Investment-Linked policy each, joint + own
--   savings, ETF/stock investments, condo-downpayment + travel goals.
-- Deep-tests: incomes (multi-member), family, goals.
--
-- RUN AFTER _reset_family.sql. IDs prefixed qa_p03_.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\set U       '\'user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set FAM     '\'fam_user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set SELF_FM '\'AfJc5H4SGvgCH7RBO35cH\''

BEGIN;

-- 0. Self = Rachel
UPDATE family_members SET
  name = 'Rachel Koh', first_name = 'Rachel', last_name = 'Koh',
  relationship = 'Self', date_of_birth = '1997-04-09',
  is_contributing = true, updated_at = now()
WHERE id = :SELF_FM;

-- 1. Spouse = Tom
INSERT INTO family_members (id, user_id, family_id, name, first_name, last_name, relationship, date_of_birth, is_contributing, notes, status, created_at, updated_at) VALUES
  ('qa_p03_fm_tom', :U, :FAM, 'Tom Koh', 'Tom', 'Koh', 'Spouse', '1995-11-02', true, 'Product manager', 'informational', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 2. Categories
INSERT INTO expense_categories (id, user_id, family_id, name, icon, is_default, tracked_in_budget, created_at, updated_at) VALUES
  ('qa_p03_cat_food',     :U, :FAM, 'Food',           'utensils',     true, true, now(), now()),
  ('qa_p03_cat_transport',:U, :FAM, 'Transportation', 'car',          true, true, now(), now()),
  ('qa_p03_cat_housing',  :U, :FAM, 'Housing',        'home',         true, true, now(), now()),
  ('qa_p03_cat_utilities',:U, :FAM, 'Utilities',      'plug',         true, true, now(), now()),
  ('qa_p03_cat_travel',   :U, :FAM, 'Travel',         'plane',        true, true, now(), now()),
  ('qa_p03_cat_enter',    :U, :FAM, 'Entertainment',  'clapperboard', true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Dual incomes (both CPF)
INSERT INTO incomes_beta (id, user_id, family_id, family_member_id, name, category, income_category, amount, start_date, subject_to_cpf, employee_cpf_contribution, employer_cpf_contribution, net_take_home, cpf_ordinary_account, cpf_special_account, cpf_medisave_account, is_active, created_at, updated_at) VALUES
  ('qa_p03_inc_rachel', :U, :FAM, :SELF_FM, 'UX Designer Salary', 'salary', 'current', '6500.00', '2020-03-01', true, '1300.00', '1105.00', '5200.00', '72000.00', '41000.00', '31000.00', true, now(), now()),
  ('qa_p03_inc_tom',    :U, :FAM, 'qa_p03_fm_tom', 'Product Manager Salary', 'salary', 'current', '7200.00', '2018-06-01', true, '1440.00', '1224.00', '5760.00', '94000.00', '52000.00', '36000.00', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 4. Holdings — joint + individual
INSERT INTO current_holdings (id, user_id, family_id, family_member_id, bank_name, holding_amount, created_at, updated_at) VALUES
  ('qa_p03_h_joint',  :U, :FAM, NULL,             'OCBC Joint (Condo Fund)', '88000', now(), now()),
  ('qa_p03_h_rachel', :U, :FAM, :SELF_FM,         'DBS Multiplier (Rachel)', '19500', now(), now()),
  ('qa_p03_h_tom',    :U, :FAM, 'qa_p03_fm_tom',  'Citi (Tom)',              '24000', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO holding_amount_history (id, holding_id, user_id, family_id, amount, recorded_at)
SELECT 'qa_p03_hh_' || h.id, h.id, h.user_id, h.family_id, h.holding_amount, now() - interval '30 days'
FROM current_holdings h WHERE h.id LIKE 'qa_p03_h_%' ON CONFLICT (id) DO NOTHING;

-- 5. Recurring expenses (no kids; rent + lifestyle)
INSERT INTO expenses (id, user_id, family_id, name, category, expense_category, amount, frequency, description, is_active, tracked_in_budget, created_at, updated_at) VALUES
  ('qa_p03_e_rent',   :U, :FAM, 'Condo Rental',       'Housing',        'current-recurring', '2800', 'monthly', NULL, true, true, now(), now()),
  ('qa_p03_e_food',   :U, :FAM, 'Groceries + Dining', 'Food',           'current-recurring', '1100', 'monthly', NULL, true, true, now(), now()),
  ('qa_p03_e_transport',:U,:FAM,'Transport (2 pax)',  'Transportation', 'current-recurring', '320',  'monthly', NULL, true, true, now(), now()),
  ('qa_p03_e_util',   :U, :FAM, 'Utilities + Telco',  'Utilities',      'current-recurring', '210',  'monthly', NULL, true, true, now(), now()),
  ('qa_p03_e_gym',    :U, :FAM, 'Gym (2 memberships)','Entertainment',  'current-recurring', '180',  'monthly', NULL, true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 6. Daily expenses — June 2026
INSERT INTO daily_expenses (id, user_id, family_id, category_name, subcategory_name, amount, note, date, created_at, updated_at) VALUES
  ('qa_p03_de_01', :U, :FAM, 'Food',          NULL, '78.00', 'Brunch + groceries', '2026-06-01', now(), now()),
  ('qa_p03_de_02', :U, :FAM, 'Travel',        NULL, '420.00','Bali flights deposit','2026-06-03', now(), now()),
  ('qa_p03_de_03', :U, :FAM, 'Food',          NULL, '96.00', 'Date night',         '2026-06-05', now(), now()),
  ('qa_p03_de_04', :U, :FAM, 'Entertainment', NULL, '64.00', 'Concert tickets',    '2026-06-06', now(), now()),
  ('qa_p03_de_05', :U, :FAM, 'Transportation',NULL, '32.00', 'Grab x2',            '2026-06-07', now(), now()),
  ('qa_p03_de_06', :U, :FAM, 'Food',          NULL, '45.00', 'Groceries',          '2026-06-08', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 7. Investment-Linked policies (1 each)
INSERT INTO policies (id, user_id, family_id, family_member_id, provider, policy_type, status, start_date, premium_amount, premium_frequency, total_premium_duration, description, is_active, created_at, updated_at) VALUES
  ('qa_p03_pol_rachel_ilp', :U, :FAM, :SELF_FM,        'AIA',        'Investment-Linked', 'Active', '2021-05-01', '300', 'Monthly', 20, 'ILP — Rachel', true, now(), now()),
  ('qa_p03_pol_tom_ilp',    :U, :FAM, 'qa_p03_fm_tom', 'Prudential', 'Investment-Linked', 'Active', '2020-09-01', '350', 'Monthly', 20, 'ILP — Tom',    true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 8. Investments
INSERT INTO investment_policies (id, user_id, family_id, name, type, current_capital, projected_yield, contribution_amount, contribution_frequency, is_active, created_at, updated_at) VALUES
  ('qa_p03_iv_etf',   :U, :FAM, 'IWDA World ETF',     'etf',   '48000', '8.0', '1000', 'monthly', true, now(), now()),
  ('qa_p03_iv_stock', :U, :FAM, 'SG Bank Stocks',     'stock', '22000', '5.2', '300',  'monthly', true, now(), now()),
  ('qa_p03_iv_crypto',:U, :FAM, 'BTC (DCA)',          'crypto','9000',  '0',   '200',  'monthly', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 9. Goals — condo down payment + travel
INSERT INTO goals (id, user_id, family_id, goal_name, goal_type, target_amount, target_date, current_amount_saved, monthly_contribution, description, is_achieved, is_active, created_at, updated_at) VALUES
  ('qa_p03_g_condo',  :U, :FAM, 'Condo Down Payment', 'primary',   '280000', '2029-06-30', '88000', '3500', NULL, false, true, now(), now()),
  ('qa_p03_g_travel', :U, :FAM, 'Japan Trip',         'secondary', '12000',  '2027-03-31', '4500',  '600',  NULL, false, true, now(), now())
ON CONFLICT (id) DO NOTHING;

\echo
\echo === Persona 03 seeded row counts ===
SELECT 'family_members' AS tbl, count(*) FROM family_members WHERE family_id = :FAM
UNION ALL SELECT 'incomes_beta', count(*) FROM incomes_beta WHERE family_id = :FAM
UNION ALL SELECT 'expenses', count(*) FROM expenses WHERE family_id = :FAM
UNION ALL SELECT 'daily_expenses', count(*) FROM daily_expenses WHERE family_id = :FAM
UNION ALL SELECT 'policies', count(*) FROM policies WHERE family_id = :FAM
UNION ALL SELECT 'investment_policies', count(*) FROM investment_policies WHERE family_id = :FAM
UNION ALL SELECT 'current_holdings', count(*) FROM current_holdings WHERE family_id = :FAM
UNION ALL SELECT 'goals', count(*) FROM goals WHERE family_id = :FAM
ORDER BY tbl;

COMMIT;
