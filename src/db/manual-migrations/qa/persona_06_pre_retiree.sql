-- ═══════════════════════════════════════════════════════════════════════════
-- PERSONA 06 — "Robert Tan", Pre-Retiree (58)
-- ═══════════════════════════════════════════════════════════════════════════
-- Churn lens: "CPF projection wrong/unclear; app feels built for young people."
-- Profile: winding-down income (part-time consulting), CPF-HEAVY (high OA/SA/MA
--   near FRS/BHS — the focus), fully paid-off HDB, paid-off car, conservative
--   bonds/cash/dividend investments, legacy + retirement-income goals.
-- Deep-tests: cpf, overview (net worth), investments, holdings.
--
-- RUN AFTER _reset_family.sql. IDs prefixed qa_p06_.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\set U       '\'user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set FAM     '\'fam_user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set SELF_FM '\'AfJc5H4SGvgCH7RBO35cH\''

BEGIN;

-- 0. Self = Robert
UPDATE family_members SET
  name = 'Robert Tan', first_name = 'Robert', last_name = 'Tan',
  relationship = 'Self', date_of_birth = '1968-03-12',
  is_contributing = true, updated_at = now()
WHERE id = :SELF_FM;

-- 1. Spouse (homemaker)
INSERT INTO family_members (id, user_id, family_id, name, first_name, last_name, relationship, date_of_birth, is_contributing, notes, status, created_at, updated_at) VALUES
  ('qa_p06_fm_spouse', :U, :FAM, 'Mdm Tan', 'Lily', 'Tan', 'Spouse', '1970-09-25', false, 'Homemaker, retired', 'informational', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 2. Categories (retiree set)
INSERT INTO expense_categories (id, user_id, family_id, name, icon, is_default, tracked_in_budget, created_at, updated_at) VALUES
  ('qa_p06_cat_food',     :U, :FAM, 'Food',          'utensils',    true, true, now(), now()),
  ('qa_p06_cat_health',   :U, :FAM, 'Healthcare',    'heart-pulse', true, true, now(), now()),
  ('qa_p06_cat_utilities',:U, :FAM, 'Utilities',     'plug',        true, true, now(), now()),
  ('qa_p06_cat_transport',:U, :FAM, 'Transportation','car',         true, true, now(), now()),
  ('qa_p06_cat_leisure',  :U, :FAM, 'Leisure',       'palmtree',    true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Income — part-time consulting, CPF; HIGH accumulated balances near FRS/BHS
INSERT INTO incomes_beta (id, user_id, family_id, family_member_id, name, category, income_category, amount, start_date, subject_to_cpf, employee_cpf_contribution, employer_cpf_contribution, net_take_home, cpf_ordinary_account, cpf_special_account, cpf_medisave_account, is_active, created_at, updated_at) VALUES
  ('qa_p06_inc_consult', :U, :FAM, :SELF_FM, 'Consulting (part-time)', 'salary', 'current', '4000.00', '2023-01-01', true, '520.00', '300.00', '3480.00', '185000.00', '290000.00', '71500.00', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 4. Holdings — large cash / fixed deposit
INSERT INTO current_holdings (id, user_id, family_id, family_member_id, bank_name, holding_amount, created_at, updated_at) VALUES
  ('qa_p06_h_fd',    :U, :FAM, :SELF_FM,           'UOB Fixed Deposit',   '180000', now(), now()),
  ('qa_p06_h_save',  :U, :FAM, :SELF_FM,           'DBS Savings',         '45000',  now(), now()),
  ('qa_p06_h_joint', :U, :FAM, NULL,               'OCBC Joint',          '62000',  now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO holding_amount_history (id, holding_id, user_id, family_id, amount, recorded_at)
SELECT 'qa_p06_hh_' || h.id, h.id, h.user_id, h.family_id, h.holding_amount, now() - interval '60 days'
FROM current_holdings h WHERE h.id LIKE 'qa_p06_h_%' ON CONFLICT (id) DO NOTHING;

-- 5. Recurring expenses (lower, retiree)
INSERT INTO expenses (id, user_id, family_id, name, category, expense_category, amount, frequency, description, is_active, tracked_in_budget, created_at, updated_at) VALUES
  ('qa_p06_e_food',   :U, :FAM, 'Groceries + Dining', 'Food',          'current-recurring', '700', 'monthly', NULL, true, true, now(), now()),
  ('qa_p06_e_health', :U, :FAM, 'Medical + Supplements','Healthcare',  'current-recurring', '380', 'monthly', NULL, true, true, now(), now()),
  ('qa_p06_e_util',   :U, :FAM, 'Utilities + Telco',  'Utilities',     'current-recurring', '220', 'monthly', NULL, true, true, now(), now()),
  ('qa_p06_e_transport',:U,:FAM,'Transport',          'Transportation','current-recurring', '150', 'monthly', NULL, true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 6. Daily expenses — June 2026 (modest)
INSERT INTO daily_expenses (id, user_id, family_id, category_name, subcategory_name, amount, note, date, created_at, updated_at) VALUES
  ('qa_p06_de_01', :U, :FAM, 'Food',       NULL, '32.00',  'Market + lunch',     '2026-06-02', now(), now()),
  ('qa_p06_de_02', :U, :FAM, 'Healthcare', NULL, '180.00', 'Cardiologist review','2026-06-03', now(), now()),
  ('qa_p06_de_03', :U, :FAM, 'Leisure',    NULL, '95.00',  'Mahjong + kopi',     '2026-06-05', now(), now()),
  ('qa_p06_de_04', :U, :FAM, 'Food',       NULL, '48.00',  'Family dinner',      '2026-06-07', now(), now()),
  ('qa_p06_de_05', :U, :FAM, 'Transportation', NULL, '24.00','Grab to clinic',   '2026-06-08', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 7. Paid-off property (owned outright — no loan) + paid-off car
INSERT INTO property_assets (id, user_id, family_id, property_name, purchase_date, original_purchase_price, loan_amount_taken, outstanding_loan, monthly_loan_payment, interest_rate, paid_by_cpf, is_active, created_at, updated_at) VALUES
  ('qa_p06_prop', :U, :FAM, 'Serangoon HDB 5-Room (paid off)', '2002-04-01', '420000', '0', '0', '0', '0', true, true, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO vehicle_assets (id, user_id, family_id, vehicle_name, purchase_date, coe_expiry_date, original_purchase_price, loan_amount_taken, loan_amount_repaid, monthly_loan_payment, is_active, created_at, updated_at) VALUES
  ('qa_p06_veh', :U, :FAM, 'Mercedes E-Class (paid off)', '2019-06-01', '2029-05-31', '230000', '0', '0', '0', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 8. Conservative investments
INSERT INTO investment_policies (id, user_id, family_id, name, type, current_capital, projected_yield, contribution_amount, contribution_frequency, is_active, created_at, updated_at) VALUES
  ('qa_p06_iv_ssb',   :U, :FAM, 'Singapore Savings Bonds', 'bonds', '200000', '3.3', '0', 'monthly', true, now(), now()),
  ('qa_p06_iv_divid', :U, :FAM, 'STI Dividend Stocks',     'stock', '150000', '4.8', '0', 'monthly', true, now(), now()),
  ('qa_p06_iv_cash',  :U, :FAM, 'Money Market Fund',       'cash',  '80000',  '3.6', '0', 'monthly', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 9. Goals — legacy + retirement income
INSERT INTO goals (id, user_id, family_id, goal_name, goal_type, target_amount, target_date, current_amount_saved, monthly_contribution, description, is_achieved, is_active, created_at, updated_at) VALUES
  ('qa_p06_g_retire', :U, :FAM, 'Retirement Income Pot', 'primary',   '1200000', '2027-03-12', '1100000', '0', NULL, false, true, now(), now()),
  ('qa_p06_g_legacy', :U, :FAM, 'Legacy for Children',   'secondary', '500000',  '2040-01-01', '320000',  '0', NULL, false, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 10. Policies — paid-up whole life + integrated shield
INSERT INTO policies (id, user_id, family_id, family_member_id, provider, policy_type, status, start_date, premium_amount, premium_frequency, total_premium_duration, description, is_active, created_at, updated_at) VALUES
  ('qa_p06_pol_life', :U, :FAM, :SELF_FM, 'Great Eastern', 'Whole Life',           'Active', '1995-01-01', '0',   'Monthly', 25, 'Paid-up whole life', true, now(), now()),
  ('qa_p06_pol_ip',   :U, :FAM, :SELF_FM, 'AIA',           'Hospitalisation Plan', 'Active', '2005-01-01', '380', 'Monthly', 40, 'Integrated Shield',  true, now(), now())
ON CONFLICT (id) DO NOTHING;

\echo
\echo === Persona 06 seeded row counts ===
SELECT 'family_members' AS tbl, count(*) FROM family_members WHERE family_id = :FAM
UNION ALL SELECT 'incomes_beta', count(*) FROM incomes_beta WHERE family_id = :FAM
UNION ALL SELECT 'expenses', count(*) FROM expenses WHERE family_id = :FAM
UNION ALL SELECT 'daily_expenses', count(*) FROM daily_expenses WHERE family_id = :FAM
UNION ALL SELECT 'policies', count(*) FROM policies WHERE family_id = :FAM
UNION ALL SELECT 'investment_policies', count(*) FROM investment_policies WHERE family_id = :FAM
UNION ALL SELECT 'current_holdings', count(*) FROM current_holdings WHERE family_id = :FAM
UNION ALL SELECT 'property_assets', count(*) FROM property_assets WHERE family_id = :FAM
UNION ALL SELECT 'vehicle_assets', count(*) FROM vehicle_assets WHERE family_id = :FAM
UNION ALL SELECT 'goals', count(*) FROM goals WHERE family_id = :FAM
ORDER BY tbl;

COMMIT;
