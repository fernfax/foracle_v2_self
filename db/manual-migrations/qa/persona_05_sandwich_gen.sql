-- ═══════════════════════════════════════════════════════════════════════════
-- PERSONA 05 — "Daniel", Sandwich Generation (46)
-- ═══════════════════════════════════════════════════════════════════════════
-- Churn lens: "Can't track who I'm financially responsible for."
-- Profile: sole high earner ($13k, CPF) supporting a homemaker spouse, 2 teens
--   AND 2 elderly parents. Eldercare + tuition spend, health policies on parents
--   and kids, owns home + MPV. Tests the Family tab with parents+kids, policies
--   assigned to each member, expense attribution.
-- Deep-tests: family, policies, cpf, expenses.
--
-- RUN AFTER _reset_family.sql. IDs prefixed qa_p05_.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\set U       '\'user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set FAM     '\'fam_user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set SELF_FM '\'AfJc5H4SGvgCH7RBO35cH\''

BEGIN;

-- 0. Self = Daniel
UPDATE family_members SET
  name = 'Daniel Wong', first_name = 'Daniel', last_name = 'Wong',
  relationship = 'Self', date_of_birth = '1980-02-25',
  is_contributing = true, updated_at = now()
WHERE id = :SELF_FM;

-- 1. Dependents: spouse (homemaker), 2 teens, 2 parents
INSERT INTO family_members (id, user_id, family_id, name, first_name, last_name, relationship, date_of_birth, is_contributing, notes, status, created_at, updated_at) VALUES
  ('qa_p05_fm_spouse', :U, :FAM, 'Mary Wong',   'Mary',   'Wong', 'Spouse', '1982-07-15', false, 'Homemaker',           'informational', now(), now()),
  ('qa_p05_fm_teen1',  :U, :FAM, 'Jordan Wong', 'Jordan', 'Wong', 'Child',  '2009-03-10', false, 'Secondary school',    'informational', now(), now()),
  ('qa_p05_fm_teen2',  :U, :FAM, 'Chloe Wong',  'Chloe',  'Wong', 'Child',  '2011-08-22', false, 'Secondary school',    'informational', now(), now()),
  ('qa_p05_fm_dad',    :U, :FAM, 'Peter Wong',  'Peter',  'Wong', 'Parent', '1952-01-30', false, 'Retired, diabetes',   'informational', now(), now()),
  ('qa_p05_fm_mum',    :U, :FAM, 'Susan Wong',  'Susan',  'Wong', 'Parent', '1955-05-18', false, 'Retired',             'informational', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 2. Categories
INSERT INTO expense_categories (id, user_id, family_id, name, icon, is_default, tracked_in_budget, created_at, updated_at) VALUES
  ('qa_p05_cat_food',     :U, :FAM, 'Food',           'utensils',     true, true, now(), now()),
  ('qa_p05_cat_transport',:U, :FAM, 'Transportation', 'car',          true, true, now(), now()),
  ('qa_p05_cat_housing',  :U, :FAM, 'Housing',        'home',         true, true, now(), now()),
  ('qa_p05_cat_utilities',:U, :FAM, 'Utilities',      'plug',         true, true, now(), now()),
  ('qa_p05_cat_children', :U, :FAM, 'Children',       'baby',         true, true, now(), now()),
  ('qa_p05_cat_eldercare',:U, :FAM, 'Eldercare',      'heart-handshake', true, true, now(), now()),
  ('qa_p05_cat_health',   :U, :FAM, 'Healthcare',     'heart-pulse',  true, true, now(), now()),
  ('qa_p05_cat_insurance',:U, :FAM, 'Insurance',      'shield',       true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Income — sole earner, high salary, CPF (22 yrs accumulated)
INSERT INTO incomes_beta (id, user_id, family_id, family_member_id, name, category, income_category, amount, start_date, subject_to_cpf, employee_cpf_contribution, employer_cpf_contribution, net_take_home, cpf_ordinary_account, cpf_special_account, cpf_medisave_account, is_active, created_at, updated_at) VALUES
  ('qa_p05_inc_salary', :U, :FAM, :SELF_FM, 'Director Salary', 'salary', 'current', '13000.00', '2004-01-01', true, '1600.00', '1360.00', '11400.00', '198000.00', '171000.00', '66000.00', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 4. Holdings
INSERT INTO current_holdings (id, user_id, family_id, family_member_id, bank_name, holding_amount, created_at, updated_at) VALUES
  ('qa_p05_h_dbs',    :U, :FAM, :SELF_FM, 'DBS Multiplier',      '62000', now(), now()),
  ('qa_p05_h_eldercare',:U,:FAM, NULL,    'UOB Parents Care Fund','28000', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO holding_amount_history (id, holding_id, user_id, family_id, amount, recorded_at)
SELECT 'qa_p05_hh_' || h.id, h.id, h.user_id, h.family_id, h.holding_amount, now() - interval '30 days'
FROM current_holdings h WHERE h.id LIKE 'qa_p05_h_%' ON CONFLICT (id) DO NOTHING;

-- 5. Recurring expenses — household + eldercare + tuition
INSERT INTO expenses (id, user_id, family_id, name, category, expense_category, amount, frequency, description, is_active, tracked_in_budget, created_at, updated_at) VALUES
  ('qa_p05_e_mortgage', :U, :FAM, 'Condo Mortgage',        'Housing',        'current-recurring', '2400', 'monthly', NULL, true, true, now(), now()),
  ('qa_p05_e_groceries',:U, :FAM, 'Groceries (6 pax)',     'Food',           'current-recurring', '1500', 'monthly', NULL, true, true, now(), now()),
  ('qa_p05_e_helper',   :U, :FAM, 'Domestic Helper',       'Eldercare',      'current-recurring', '900',  'monthly', NULL, true, true, now(), now()),
  ('qa_p05_e_parentmed',:U, :FAM, 'Parents Medication',    'Eldercare',      'current-recurring', '650',  'monthly', NULL, true, true, now(), now()),
  ('qa_p05_e_tuition',  :U, :FAM, 'Tuition (2 teens)',     'Children',       'current-recurring', '1200', 'monthly', NULL, true, true, now(), now()),
  ('qa_p05_e_car',      :U, :FAM, 'MPV Loan + Petrol',     'Transportation', 'current-recurring', '1350', 'monthly', NULL, true, true, now(), now()),
  ('qa_p05_e_util',     :U, :FAM, 'Utilities + Telco',     'Utilities',      'current-recurring', '380',  'monthly', NULL, true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 6. Daily expenses — June 2026
INSERT INTO daily_expenses (id, user_id, family_id, category_name, subcategory_name, amount, note, date, created_at, updated_at) VALUES
  ('qa_p05_de_01', :U, :FAM, 'Food',       NULL, '142.00', 'Weekend groceries',   '2026-06-01', now(), now()),
  ('qa_p05_de_02', :U, :FAM, 'Eldercare',  NULL, '320.00', 'Dad specialist visit','2026-06-02', now(), now()),
  ('qa_p05_de_03', :U, :FAM, 'Children',   NULL, '180.00', 'School books',        '2026-06-03', now(), now()),
  ('qa_p05_de_04', :U, :FAM, 'Healthcare', NULL, '95.00',  'Mum physiotherapy',   '2026-06-04', now(), now()),
  ('qa_p05_de_05', :U, :FAM, 'Food',       NULL, '88.00',  'Family dinner',       '2026-06-06', now(), now()),
  ('qa_p05_de_06', :U, :FAM, 'Transportation', NULL, '70.00','Petrol',            '2026-06-07', now(), now()),
  ('qa_p05_de_07', :U, :FAM, 'Eldercare',  NULL, '450.00', 'TCM + supplements',   '2026-06-08', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 7. Property + vehicle
INSERT INTO property_assets (id, user_id, family_id, property_name, purchase_date, original_purchase_price, loan_amount_taken, outstanding_loan, monthly_loan_payment, interest_rate, paid_by_cpf, is_active, created_at, updated_at) VALUES
  ('qa_p05_prop', :U, :FAM, 'Bishan Executive Condo', '2012-06-01', '880000', '650000', '290000', '2400', '2.8', true, true, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO vehicle_assets (id, user_id, family_id, vehicle_name, purchase_date, coe_expiry_date, original_purchase_price, loan_amount_taken, loan_amount_repaid, monthly_loan_payment, is_active, created_at, updated_at) VALUES
  ('qa_p05_veh', :U, :FAM, 'Toyota Alphard (7-seat)', '2022-02-01', '2032-01-31', '230000', '160000', '52000', '1100', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 8. Policies — across the whole household (note family_member assignment)
INSERT INTO policies (id, user_id, family_id, family_member_id, provider, policy_type, status, start_date, premium_amount, premium_frequency, total_premium_duration, description, is_active, created_at, updated_at) VALUES
  ('qa_p05_pol_dan_life', :U, :FAM, :SELF_FM,            'Manulife',      'Whole Life',           'Active', '2008-01-01', '480', 'Monthly', 30, 'Breadwinner cover',     true, now(), now()),
  ('qa_p05_pol_dan_ci',   :U, :FAM, :SELF_FM,            'AIA',           'Critical Illness',     'Active', '2010-06-01', '220', 'Monthly', 30, 'CI cover',              true, now(), now()),
  ('qa_p05_pol_mary_hosp',:U, :FAM, 'qa_p05_fm_spouse',  'Great Eastern', 'Hospitalisation Plan', 'Active', '2012-01-01', '110', 'Monthly', 25, 'IP — spouse',           true, now(), now()),
  ('qa_p05_pol_teen1',    :U, :FAM, 'qa_p05_fm_teen1',   'Great Eastern', 'Hospitalisation Plan', 'Active', '2010-04-01', '60',  'Monthly', 20, 'IP — Jordan',           true, now(), now()),
  ('qa_p05_pol_teen2',    :U, :FAM, 'qa_p05_fm_teen2',   'Great Eastern', 'Hospitalisation Plan', 'Active', '2012-09-01', '60',  'Monthly', 20, 'IP — Chloe',            true, now(), now()),
  ('qa_p05_pol_dad',      :U, :FAM, 'qa_p05_fm_dad',     'Prudential',    'Hospitalisation Plan', 'Active', '2015-01-01', '240', 'Monthly', 15, 'Elderly IP — Dad',      true, now(), now()),
  ('qa_p05_pol_mum',      :U, :FAM, 'qa_p05_fm_mum',     'Prudential',    'Hospitalisation Plan', 'Active', '2015-01-01', '210', 'Monthly', 15, 'Elderly IP — Mum',      true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 9. Investments (conservative, has dependents)
INSERT INTO investment_policies (id, user_id, family_id, name, type, current_capital, projected_yield, contribution_amount, contribution_frequency, is_active, created_at, updated_at) VALUES
  ('qa_p05_iv_etf',  :U, :FAM, 'Global ETF Portfolio', 'etf',   '95000', '6.5', '800', 'monthly', true, now(), now()),
  ('qa_p05_iv_ssb',  :U, :FAM, 'SSB + T-bills',        'bonds', '120000','3.2', '0',   'monthly', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 10. Goals
INSERT INTO goals (id, user_id, family_id, goal_name, goal_type, target_amount, target_date, current_amount_saved, monthly_contribution, description, is_achieved, is_active, created_at, updated_at) VALUES
  ('qa_p05_g_retire',    :U, :FAM, 'Retirement at 62',     'primary',   '2000000', '2042-02-25', '620000', '2500', NULL, false, true, now(), now()),
  ('qa_p05_g_parentsmed',:U, :FAM, 'Parents Medical Fund', 'primary',   '150000',  '2030-01-01', '48000',  '1000', NULL, false, true, now(), now()),
  ('qa_p05_g_education',  :U, :FAM, 'Kids University',      'secondary', '320000',  '2028-06-30', '140000', '1800', NULL, false, true, now(), now())
ON CONFLICT (id) DO NOTHING;

\echo
\echo === Persona 05 seeded row counts ===
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
