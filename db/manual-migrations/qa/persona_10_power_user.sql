-- ═══════════════════════════════════════════════════════════════════════════
-- PERSONA 10 — "The Ngs", Power User (42)
-- ═══════════════════════════════════════════════════════════════════════════
-- Churn lens: "App gets slow / inconsistent when I actually use everything."
-- Profile: EVERYTHING populated to the max — all income categories (incl. past
--   + future), 2 properties, 2 vehicles, ALL investment types, ~8 policies across
--   every member + type, 6 holdings with 2 history snapshots each, 5 goals, ~2
--   months of daily expenses, shifts across May+June. Stress rendering +
--   cross-page reconciliation.
-- Deep-tests: ALL pages + cross-page net-worth / household-income reconciliation.
--
-- RUN AFTER _reset_family.sql. IDs prefixed qa_p10_.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\set U       '\'user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set FAM     '\'fam_user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set SELF_FM '\'AfJc5H4SGvgCH7RBO35cH\''

BEGIN;

-- 0. Self = David
UPDATE family_members SET
  name = 'David Ng', first_name = 'David', last_name = 'Ng',
  relationship = 'Self', date_of_birth = '1984-04-02',
  is_contributing = true, updated_at = now()
WHERE id = :SELF_FM;

-- 1. Full household: spouse (earning) + 2 kids + 1 parent
INSERT INTO family_members (id, user_id, family_id, name, first_name, last_name, relationship, date_of_birth, is_contributing, notes, status, created_at, updated_at) VALUES
  ('qa_p10_fm_linda', :U, :FAM, 'Linda Ng', 'Linda', 'Ng', 'Spouse', '1986-08-11', true,  'Finance director', 'informational', now(), now()),
  ('qa_p10_fm_kid1',  :U, :FAM, 'Ethan Ng', 'Ethan', 'Ng', 'Child',  '2014-05-20', false, 'Primary school',   'informational', now(), now()),
  ('qa_p10_fm_kid2',  :U, :FAM, 'Emma Ng',  'Emma',  'Ng', 'Child',  '2017-12-01', false, 'Pre-school',       'informational', now(), now()),
  ('qa_p10_fm_dad',   :U, :FAM, 'Henry Ng', 'Henry', 'Ng', 'Parent', '1956-03-15', false, 'Retired',          'informational', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 2. Categories (broad)
INSERT INTO expense_categories (id, user_id, family_id, name, icon, is_default, tracked_in_budget, created_at, updated_at) VALUES
  ('qa_p10_cat_food',     :U, :FAM, 'Food',           'utensils',     true, true, now(), now()),
  ('qa_p10_cat_transport',:U, :FAM, 'Transportation', 'car',          true, true, now(), now()),
  ('qa_p10_cat_housing',  :U, :FAM, 'Housing',        'home',         true, true, now(), now()),
  ('qa_p10_cat_utilities',:U, :FAM, 'Utilities',      'plug',         true, true, now(), now()),
  ('qa_p10_cat_children', :U, :FAM, 'Children',       'baby',         true, true, now(), now()),
  ('qa_p10_cat_health',   :U, :FAM, 'Healthcare',     'heart-pulse',  true, true, now(), now()),
  ('qa_p10_cat_enter',    :U, :FAM, 'Entertainment',  'clapperboard', true, true, now(), now()),
  ('qa_p10_cat_travel',   :U, :FAM, 'Travel',         'plane',        true, true, now(), now()),
  ('qa_p10_cat_insurance',:U, :FAM, 'Insurance',      'shield',       true, true, now(), now()),
  ('qa_p10_cat_eldercare',:U, :FAM, 'Eldercare',      'heart-handshake', true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Incomes — all categories + past + future + non-CPF rental/dividend
INSERT INTO incomes_beta (id, user_id, family_id, family_member_id, name, category, income_category, amount, start_date, subject_to_cpf, employee_cpf_contribution, employer_cpf_contribution, net_take_home, cpf_ordinary_account, cpf_special_account, cpf_medisave_account, is_active, created_at, updated_at) VALUES
  ('qa_p10_inc_david',  :U, :FAM, :SELF_FM,           'VP Engineering Salary', 'salary', 'current', '11000.00', '2010-01-01', true, '1600.00', '1360.00', '9400.00', '168000.00', '120000.00', '58000.00', true, now(), now()),
  ('qa_p10_inc_linda',  :U, :FAM, 'qa_p10_fm_linda',  'Finance Director Salary','salary', 'current', '8500.00', '2012-01-01', true, '1600.00', '1360.00', '6900.00', '132000.00', '98000.00', '49000.00', true, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO incomes_beta (id, user_id, family_id, family_member_id, name, category, income_category, amount, start_date, end_date, subject_to_cpf, is_active, created_at, updated_at) VALUES
  ('qa_p10_inc_rental', :U, :FAM, :SELF_FM, 'Rental Income',          'rental',     'current', '3200.00', '2019-01-01', NULL, false, true, now(), now()),
  ('qa_p10_inc_divid',  :U, :FAM, :SELF_FM, 'Dividend Income',        'investment', 'current', '1400.00', '2016-01-01', NULL, false, true, now(), now()),
  ('qa_p10_inc_past',   :U, :FAM, :SELF_FM, 'Previous Startup Salary','salary',     'past',    '7000.00', '2006-01-01', '2009-12-31', true, false, now(), now()),
  ('qa_p10_inc_future', :U, :FAM, 'qa_p10_fm_linda', 'Linda Promotion (expected)','salary','future','11000.00','2027-01-01', NULL, true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 4. Holdings (6) with TWO history snapshots each (trend)
INSERT INTO current_holdings (id, user_id, family_id, family_member_id, bank_name, holding_amount, created_at, updated_at) VALUES
  ('qa_p10_h_dbs',   :U, :FAM, :SELF_FM,          'DBS Multiplier (David)', '64000', now(), now()),
  ('qa_p10_h_ocbc',  :U, :FAM, 'qa_p10_fm_linda', 'OCBC 360 (Linda)',       '52000', now(), now()),
  ('qa_p10_h_joint', :U, :FAM, NULL,              'UOB Joint',              '98000', now(), now()),
  ('qa_p10_h_kids',  :U, :FAM, NULL,              'POSB Kids Fund',         '36000', now(), now()),
  ('qa_p10_h_usd',   :U, :FAM, :SELF_FM,          'StanChart USD',          '41000', now(), now()),
  ('qa_p10_h_ibkr',  :U, :FAM, :SELF_FM,          'IBKR Cash',              '28000', now(), now())
ON CONFLICT (id) DO NOTHING;
-- snapshot 1 (60 days ago, ~6% lower) and snapshot 2 (30 days ago, ~3% lower)
INSERT INTO holding_amount_history (id, holding_id, user_id, family_id, amount, recorded_at)
SELECT 'qa_p10_hh1_' || h.id, h.id, h.user_id, h.family_id, ROUND(h.holding_amount::numeric * 0.94, 2), now() - interval '60 days'
FROM current_holdings h WHERE h.id LIKE 'qa_p10_h_%' ON CONFLICT (id) DO NOTHING;
INSERT INTO holding_amount_history (id, holding_id, user_id, family_id, amount, recorded_at)
SELECT 'qa_p10_hh2_' || h.id, h.id, h.user_id, h.family_id, ROUND(h.holding_amount::numeric * 0.97, 2), now() - interval '30 days'
FROM current_holdings h WHERE h.id LIKE 'qa_p10_h_%' ON CONFLICT (id) DO NOTHING;

-- 5. Recurring expenses (~14)
INSERT INTO expenses (id, user_id, family_id, name, category, expense_category, amount, frequency, description, is_active, tracked_in_budget, created_at, updated_at) VALUES
  ('qa_p10_e_mortgage', :U, :FAM, 'Condo Mortgage',     'Housing',        'current-recurring', '3400', 'monthly', NULL, true, true, now(), now()),
  ('qa_p10_e_groceries',:U, :FAM, 'Groceries',          'Food',           'current-recurring', '1300', 'monthly', NULL, true, true, now(), now()),
  ('qa_p10_e_dining',   :U, :FAM, 'Dining Out',         'Food',           'current-recurring', '600',  'monthly', NULL, true, true, now(), now()),
  ('qa_p10_e_cars',     :U, :FAM, 'Car Loans x2',       'Transportation', 'current-recurring', '2100', 'monthly', NULL, true, true, now(), now()),
  ('qa_p10_e_petrol',   :U, :FAM, 'Petrol + Parking',   'Transportation', 'current-recurring', '480',  'monthly', NULL, true, true, now(), now()),
  ('qa_p10_e_util',     :U, :FAM, 'Utilities',          'Utilities',      'current-recurring', '320',  'monthly', NULL, true, true, now(), now()),
  ('qa_p10_e_telco',    :U, :FAM, 'Telco (family)',     'Utilities',      'current-recurring', '180',  'monthly', NULL, true, true, now(), now()),
  ('qa_p10_e_childcare',:U, :FAM, 'Childcare + Tuition','Children',       'current-recurring', '1600', 'monthly', NULL, true, true, now(), now()),
  ('qa_p10_e_helper',   :U, :FAM, 'Domestic Helper',    'Eldercare',      'current-recurring', '900',  'monthly', NULL, true, true, now(), now()),
  ('qa_p10_e_dadmed',   :U, :FAM, 'Dad Medical',        'Eldercare',      'current-recurring', '420',  'monthly', NULL, true, true, now(), now()),
  ('qa_p10_e_stream',   :U, :FAM, 'Streaming + Apps',   'Entertainment',  'current-recurring', '64',   'monthly', NULL, true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 6. Daily expenses — May + June 2026 (~28 entries; stress rendering)
INSERT INTO daily_expenses (id, user_id, family_id, category_name, subcategory_name, amount, note, date, created_at, updated_at) VALUES
  ('qa_p10_de_m01', :U, :FAM, 'Food',          NULL, '110.00', 'Groceries',        '2026-05-02', now(), now()),
  ('qa_p10_de_m02', :U, :FAM, 'Children',      NULL, '320.00', 'Tuition May',      '2026-05-03', now(), now()),
  ('qa_p10_de_m03', :U, :FAM, 'Transportation',NULL, '90.00',  'Petrol',           '2026-05-05', now(), now()),
  ('qa_p10_de_m04', :U, :FAM, 'Travel',        NULL, '1800.00','Phuket weekend',   '2026-05-09', now(), now()),
  ('qa_p10_de_m05', :U, :FAM, 'Food',          NULL, '76.00',  'Dining',           '2026-05-12', now(), now()),
  ('qa_p10_de_m06', :U, :FAM, 'Eldercare',     NULL, '260.00', 'Dad physio',       '2026-05-15', now(), now()),
  ('qa_p10_de_m07', :U, :FAM, 'Entertainment', NULL, '120.00', 'Theme park',       '2026-05-18', now(), now()),
  ('qa_p10_de_m08', :U, :FAM, 'Healthcare',    NULL, '180.00', 'Dental',           '2026-05-22', now(), now()),
  ('qa_p10_de_m09', :U, :FAM, 'Food',          NULL, '94.00',  'Groceries',        '2026-05-25', now(), now()),
  ('qa_p10_de_m10', :U, :FAM, 'Shopping',      NULL, '210.00', 'Kids clothes',     '2026-05-28', now(), now()),
  ('qa_p10_de_j01', :U, :FAM, 'Food',          NULL, '128.00', 'Groceries',        '2026-06-01', now(), now()),
  ('qa_p10_de_j02', :U, :FAM, 'Children',      NULL, '320.00', 'Tuition June',     '2026-06-01', now(), now()),
  ('qa_p10_de_j03', :U, :FAM, 'Transportation',NULL, '95.00',  'Petrol',           '2026-06-02', now(), now()),
  ('qa_p10_de_j04', :U, :FAM, 'Eldercare',     NULL, '240.00', 'Dad meds',         '2026-06-03', now(), now()),
  ('qa_p10_de_j05', :U, :FAM, 'Food',          NULL, '82.00',  'Dining out',       '2026-06-04', now(), now()),
  ('qa_p10_de_j06', :U, :FAM, 'Entertainment', NULL, '140.00', 'Concert',          '2026-06-05', now(), now()),
  ('qa_p10_de_j07', :U, :FAM, 'Healthcare',    NULL, '160.00', 'Kid vaccination',  '2026-06-06', now(), now()),
  ('qa_p10_de_j08', :U, :FAM, 'Food',          NULL, '68.00',  'Groceries',        '2026-06-07', now(), now()),
  ('qa_p10_de_j09', :U, :FAM, 'Transportation',NULL, '40.00',  'Grab',             '2026-06-08', now(), now()),
  ('qa_p10_de_j10', :U, :FAM, 'Travel',        NULL, '620.00', 'Flights deposit',  '2026-06-09', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 7. Two properties + two vehicles
INSERT INTO property_assets (id, user_id, family_id, property_name, purchase_date, original_purchase_price, loan_amount_taken, outstanding_loan, monthly_loan_payment, interest_rate, paid_by_cpf, is_active, created_at, updated_at) VALUES
  ('qa_p10_prop_home',   :U, :FAM, 'Holland V Condo',     '2015-06-01', '1850000', '1300000', '720000', '3400', '2.7', true,  true, now(), now()),
  ('qa_p10_prop_invest', :U, :FAM, 'JB Investment Condo', '2020-01-01', '480000',  '340000',  '250000', '1500', '3.4', false, true, now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO vehicle_assets (id, user_id, family_id, vehicle_name, purchase_date, coe_expiry_date, original_purchase_price, loan_amount_taken, loan_amount_repaid, monthly_loan_payment, is_active, created_at, updated_at) VALUES
  ('qa_p10_veh_mpv', :U, :FAM, 'Honda Odyssey', '2021-03-01', '2031-02-28', '180000', '120000', '48000', '1300', true, now(), now()),
  ('qa_p10_veh_sed', :U, :FAM, 'Mazda 3',       '2022-09-01', '2032-08-31', '130000', '90000',  '24000', '800',  true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 8. ALL investment types
INSERT INTO investment_policies (id, user_id, family_id, name, type, current_capital, projected_yield, contribution_amount, contribution_frequency, is_active, created_at, updated_at) VALUES
  ('qa_p10_iv_stock', :U, :FAM, 'SGX Stocks',        'stock',       '88000',  '5.4', '800',  'monthly', true, now(), now()),
  ('qa_p10_iv_etf',   :U, :FAM, 'World ETF (VWRA)',  'etf',         '160000', '8.2', '2000', 'monthly', true, now(), now()),
  ('qa_p10_iv_bonds', :U, :FAM, 'SSB + T-bills',     'bonds',       '60000',  '3.3', '0',    'monthly', true, now(), now()),
  ('qa_p10_iv_crypto',:U, :FAM, 'BTC/ETH',           'crypto',      '34000',  '0',   '500',  'monthly', true, now(), now()),
  ('qa_p10_iv_reit',  :U, :FAM, 'REIT Basket',       'reit',        '72000',  '6.0', '400',  'monthly', true, now(), now()),
  ('qa_p10_iv_mf',    :U, :FAM, 'Endowus Portfolio', 'mutual_fund', '120000', '7.1', '1500', 'monthly', true, now(), now()),
  ('qa_p10_iv_cash',  :U, :FAM, 'Cash Mgmt (MMF)',   'cash',        '45000',  '3.5', '0',    'monthly', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 9. Goals (5)
INSERT INTO goals (id, user_id, family_id, goal_name, goal_type, target_amount, target_date, current_amount_saved, monthly_contribution, description, is_achieved, is_active, created_at, updated_at) VALUES
  ('qa_p10_g_emergency', :U, :FAM, 'Emergency Fund',     'primary',   '90000',   '2027-01-01', '72000',  '1500', NULL, false, true, now(), now()),
  ('qa_p10_g_education',  :U, :FAM, 'Kids Education',    'primary',   '400000',  '2032-06-30', '160000', '2500', NULL, false, true, now(), now()),
  ('qa_p10_g_retire',     :U, :FAM, 'Retirement Pot',    'primary',   '2500000', '2046-04-02', '720000', '3000', NULL, false, true, now(), now()),
  ('qa_p10_g_holiday',    :U, :FAM, 'Annual Holiday',    'secondary', '20000',   '2026-12-31', '8000',   '1000', NULL, false, true, now(), now()),
  ('qa_p10_g_carupg',     :U, :FAM, 'Car Upgrade Fund',  'secondary', '60000',   '2028-06-30', '15000',  '800',  NULL, false, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 10. Policies (~8) — all members, all types
INSERT INTO policies (id, user_id, family_id, family_member_id, provider, policy_type, status, start_date, premium_amount, premium_frequency, total_premium_duration, description, is_active, created_at, updated_at) VALUES
  ('qa_p10_pol_david_life', :U, :FAM, :SELF_FM,           'Manulife',      'Whole Life',           'Active', '2011-01-01', '420', 'Monthly', 30, 'Life — David',    true, now(), now()),
  ('qa_p10_pol_david_ci',   :U, :FAM, :SELF_FM,           'AIA',           'Critical Illness',     'Active', '2013-01-01', '180', 'Monthly', 30, 'CI — David',      true, now(), now()),
  ('qa_p10_pol_linda_life', :U, :FAM, 'qa_p10_fm_linda',  'Prudential',    'Term Life',            'Active', '2012-06-01', '110', 'Monthly', 25, 'Term — Linda',    true, now(), now()),
  ('qa_p10_pol_linda_ilp',  :U, :FAM, 'qa_p10_fm_linda',  'AIA',           'Investment-Linked',    'Active', '2015-01-01', '300', 'Monthly', 20, 'ILP — Linda',     true, now(), now()),
  ('qa_p10_pol_kid1',       :U, :FAM, 'qa_p10_fm_kid1',   'Great Eastern', 'Hospitalisation Plan', 'Active', '2014-06-01', '60',  'Monthly', 20, 'IP — Ethan',      true, now(), now()),
  ('qa_p10_pol_kid2',       :U, :FAM, 'qa_p10_fm_kid2',   'Great Eastern', 'Hospitalisation Plan', 'Active', '2018-01-01', '58',  'Monthly', 20, 'IP — Emma',       true, now(), now()),
  ('qa_p10_pol_dad',        :U, :FAM, 'qa_p10_fm_dad',    'Prudential',    'Hospitalisation Plan', 'Active', '2016-01-01', '220', 'Monthly', 15, 'Elderly IP — Dad',true, now(), now()),
  ('qa_p10_pol_david_ip',   :U, :FAM, :SELF_FM,           'Great Eastern', 'Hospitalisation Plan', 'Active', '2010-01-01', '95',  'Monthly', 40, 'IP — David',      true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 11. Budget shifts — May + June 2026
INSERT INTO budget_shifts (id, user_id, family_id, year, month, from_category_name, to_category_name, amount, note, created_at) VALUES
  ('qa_p10_bs_may1', :U, :FAM, 2026, 5, 'Entertainment',  'Travel',   '300', 'Phuket trip',       now()),
  ('qa_p10_bs_may2', :U, :FAM, 2026, 5, 'Food',           'Children', '150', 'Tuition top-up',    now()),
  ('qa_p10_bs_jun1', :U, :FAM, 2026, 6, 'Transportation', 'Travel',   '200', 'Flights',           now()),
  ('qa_p10_bs_jun2', :U, :FAM, 2026, 6, 'Entertainment',  'Healthcare','100','Kid vaccination',   now())
ON CONFLICT (id) DO NOTHING;

\echo
\echo === Persona 10 seeded row counts ===
SELECT 'family_members' AS tbl, count(*) FROM family_members WHERE family_id = :FAM
UNION ALL SELECT 'incomes_beta', count(*) FROM incomes_beta WHERE family_id = :FAM
UNION ALL SELECT 'expense_categories', count(*) FROM expense_categories WHERE family_id = :FAM
UNION ALL SELECT 'expenses', count(*) FROM expenses WHERE family_id = :FAM
UNION ALL SELECT 'daily_expenses', count(*) FROM daily_expenses WHERE family_id = :FAM
UNION ALL SELECT 'budget_shifts', count(*) FROM budget_shifts WHERE family_id = :FAM
UNION ALL SELECT 'current_holdings', count(*) FROM current_holdings WHERE family_id = :FAM
UNION ALL SELECT 'holding_amount_history', count(*) FROM holding_amount_history WHERE family_id = :FAM
UNION ALL SELECT 'property_assets', count(*) FROM property_assets WHERE family_id = :FAM
UNION ALL SELECT 'vehicle_assets', count(*) FROM vehicle_assets WHERE family_id = :FAM
UNION ALL SELECT 'investment_policies', count(*) FROM investment_policies WHERE family_id = :FAM
UNION ALL SELECT 'goals', count(*) FROM goals WHERE family_id = :FAM
UNION ALL SELECT 'policies', count(*) FROM policies WHERE family_id = :FAM
ORDER BY tbl;

COMMIT;
