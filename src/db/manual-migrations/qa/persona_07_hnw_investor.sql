-- ═══════════════════════════════════════════════════════════════════════════
-- PERSONA 07 — "Priya", HNW Investor (51)
-- ═══════════════════════════════════════════════════════════════════════════
-- Churn lens: "Net worth doesn't add up; can't handle my portfolio."
-- Profile: large diversified portfolio (stocks/ETF/crypto/REIT/mutual fund/
--   bonds), 2 properties (own residence + rental w/ loan), 2 vehicles, many
--   bank holdings, salary + rental + dividend income, spouse also earning.
--   STRESS-TESTS net-worth math across many asset classes + investments page.
-- Deep-tests: investments, assets (all tabs), overview, holdings.
--
-- RUN AFTER _reset_family.sql. IDs prefixed qa_p07_.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\set U       '\'user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set FAM     '\'fam_user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set SELF_FM '\'AfJc5H4SGvgCH7RBO35cH\''

BEGIN;

-- 0. Self = Priya
UPDATE family_members SET
  name = 'Priya Nair', first_name = 'Priya', last_name = 'Nair',
  relationship = 'Self', date_of_birth = '1975-06-08',
  is_contributing = true, updated_at = now()
WHERE id = :SELF_FM;

-- 1. Spouse (earning)
INSERT INTO family_members (id, user_id, family_id, name, first_name, last_name, relationship, date_of_birth, is_contributing, notes, status, created_at, updated_at) VALUES
  ('qa_p07_fm_raj', :U, :FAM, 'Raj Nair', 'Raj', 'Nair', 'Spouse', '1973-02-14', true, 'Business owner', 'informational', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 2. Categories
INSERT INTO expense_categories (id, user_id, family_id, name, icon, is_default, tracked_in_budget, created_at, updated_at) VALUES
  ('qa_p07_cat_food',     :U, :FAM, 'Food',           'utensils',     true, true, now(), now()),
  ('qa_p07_cat_transport',:U, :FAM, 'Transportation', 'car',          true, true, now(), now()),
  ('qa_p07_cat_housing',  :U, :FAM, 'Housing',        'home',         true, true, now(), now()),
  ('qa_p07_cat_travel',   :U, :FAM, 'Travel',         'plane',        true, true, now(), now()),
  ('qa_p07_cat_lifestyle',:U, :FAM, 'Lifestyle',      'sparkles',     true, true, now(), now()),
  ('qa_p07_cat_utilities',:U, :FAM, 'Utilities',      'plug',         true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Incomes — salary (CPF) + rental + dividend + spouse salary
INSERT INTO incomes_beta (id, user_id, family_id, family_member_id, name, category, income_category, amount, start_date, subject_to_cpf, employee_cpf_contribution, employer_cpf_contribution, net_take_home, cpf_ordinary_account, cpf_special_account, cpf_medisave_account, is_active, created_at, updated_at) VALUES
  ('qa_p07_inc_priya_sal', :U, :FAM, :SELF_FM, 'Managing Director Salary', 'salary', 'current', '18000.00', '2002-01-01', true, '1600.00', '1360.00', '16400.00', '215000.00', '198000.00', '71500.00', true, now(), now()),
  ('qa_p07_inc_raj_sal',   :U, :FAM, 'qa_p07_fm_raj', 'Business Income', 'salary', 'current', '9000.00', '2005-01-01', true, '1600.00', '1360.00', '7400.00', '160000.00', '142000.00', '68000.00', true, now(), now())
ON CONFLICT (id) DO NOTHING;
-- Non-CPF income streams (rental + dividend)
INSERT INTO incomes_beta (id, user_id, family_id, family_member_id, name, category, income_category, amount, start_date, subject_to_cpf, is_active, created_at, updated_at) VALUES
  ('qa_p07_inc_rental',  :U, :FAM, :SELF_FM, 'Rental Income (Investment Condo)', 'rental',     'current', '4500.00', '2018-06-01', false, true, now(), now()),
  ('qa_p07_inc_divid',   :U, :FAM, :SELF_FM, 'Dividend & Coupon Income',         'investment', 'current', '2000.00', '2015-01-01', false, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 4. Holdings — many, multi-currency
INSERT INTO current_holdings (id, user_id, family_id, family_member_id, bank_name, holding_amount, created_at, updated_at) VALUES
  ('qa_p07_h_dbs',   :U, :FAM, :SELF_FM,        'DBS Treasures',          '185000', now(), now()),
  ('qa_p07_h_citi',  :U, :FAM, 'qa_p07_fm_raj', 'Citigold (Raj)',         '142000', now(), now()),
  ('qa_p07_h_sc_usd',:U, :FAM, :SELF_FM,        'StanChart USD',          '96000',  now(), now()),
  ('qa_p07_h_uob',   :U, :FAM, NULL,            'UOB Privilege (Joint)',  '210000', now(), now()),
  ('qa_p07_h_ibkr',  :U, :FAM, :SELF_FM,        'IBKR Cash',              '54000',  now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO holding_amount_history (id, holding_id, user_id, family_id, amount, recorded_at)
SELECT 'qa_p07_hh_' || h.id, h.id, h.user_id, h.family_id, h.holding_amount, now() - interval '45 days'
FROM current_holdings h WHERE h.id LIKE 'qa_p07_h_%' ON CONFLICT (id) DO NOTHING;

-- 5. Recurring expenses (affluent lifestyle)
INSERT INTO expenses (id, user_id, family_id, name, category, expense_category, amount, frequency, description, is_active, tracked_in_budget, created_at, updated_at) VALUES
  ('qa_p07_e_mortgage', :U, :FAM, 'Investment Condo Mortgage', 'Housing',        'current-recurring', '4200', 'monthly', NULL, true, true, now(), now()),
  ('qa_p07_e_food',     :U, :FAM, 'Dining & Groceries',        'Food',           'current-recurring', '2200', 'monthly', NULL, true, true, now(), now()),
  ('qa_p07_e_cars',     :U, :FAM, 'Cars (loan + petrol x2)',   'Transportation', 'current-recurring', '3100', 'monthly', NULL, true, true, now(), now()),
  ('qa_p07_e_helper',   :U, :FAM, 'Domestic Helper',           'Lifestyle',      'current-recurring', '950',  'monthly', NULL, true, true, now(), now()),
  ('qa_p07_e_util',     :U, :FAM, 'Utilities + Telco',         'Utilities',      'current-recurring', '520',  'monthly', NULL, true, true, now(), now()),
  ('qa_p07_e_club',     :U, :FAM, 'Country Club Membership',   'Lifestyle',      'current-recurring', '680',  'monthly', NULL, true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 6. Daily expenses — June 2026 (higher)
INSERT INTO daily_expenses (id, user_id, family_id, category_name, subcategory_name, amount, note, date, created_at, updated_at) VALUES
  ('qa_p07_de_01', :U, :FAM, 'Food',      NULL, '320.00', 'Fine dining',          '2026-06-01', now(), now()),
  ('qa_p07_de_02', :U, :FAM, 'Travel',    NULL, '4800.00','Business class to LDN', '2026-06-02', now(), now()),
  ('qa_p07_de_03', :U, :FAM, 'Lifestyle', NULL, '650.00', 'Spa + wellness',       '2026-06-04', now(), now()),
  ('qa_p07_de_04', :U, :FAM, 'Food',      NULL, '180.00', 'Groceries — premium',  '2026-06-05', now(), now()),
  ('qa_p07_de_05', :U, :FAM, 'Transportation', NULL, '220.00','Petrol x2',        '2026-06-06', now(), now()),
  ('qa_p07_de_06', :U, :FAM, 'Lifestyle', NULL, '1200.00','Watch servicing',      '2026-06-08', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 7. Two properties (residence + investment/rental)
INSERT INTO property_assets (id, user_id, family_id, property_name, purchase_date, original_purchase_price, loan_amount_taken, outstanding_loan, monthly_loan_payment, interest_rate, paid_by_cpf, is_active, created_at, updated_at) VALUES
  ('qa_p07_prop_home',   :U, :FAM, 'Bukit Timah Bungalow', '2010-03-01', '3800000', '2200000', '980000',  '8200', '2.9', false, true, now(), now()),
  ('qa_p07_prop_rental', :U, :FAM, 'Orchard Investment Condo', '2018-06-01', '1850000', '1300000', '760000', '4200', '3.1', false, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 8. Two vehicles
INSERT INTO vehicle_assets (id, user_id, family_id, vehicle_name, purchase_date, coe_expiry_date, original_purchase_price, loan_amount_taken, loan_amount_repaid, monthly_loan_payment, is_active, created_at, updated_at) VALUES
  ('qa_p07_veh_porsche', :U, :FAM, 'Porsche Cayenne', '2023-01-01', '2033-01-01', '420000', '250000', '60000', '2400', true, now(), now()),
  ('qa_p07_veh_bmw',     :U, :FAM, 'BMW 5 Series',    '2021-08-01', '2031-08-01', '280000', '180000', '70000', '1700', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 9. Large diversified investment portfolio (all types)
INSERT INTO investment_policies (id, user_id, family_id, name, type, current_capital, projected_yield, contribution_amount, contribution_frequency, is_active, created_at, updated_at) VALUES
  ('qa_p07_iv_sgstock', :U, :FAM, 'SGX Blue Chips',        'stock',       '320000', '5.0', '2000', 'monthly', true, now(), now()),
  ('qa_p07_iv_usetf',   :U, :FAM, 'US Tech ETF (QQQ)',     'etf',         '480000', '9.5', '3000', 'monthly', true, now(), now()),
  ('qa_p07_iv_reit',    :U, :FAM, 'SG REIT Portfolio',     'reit',        '210000', '6.2', '500',  'monthly', true, now(), now()),
  ('qa_p07_iv_crypto',  :U, :FAM, 'BTC/ETH Holdings',      'crypto',      '95000',  '0',   '1000', 'monthly', true, now(), now()),
  ('qa_p07_iv_mf',      :U, :FAM, 'Global Mutual Fund',    'mutual_fund', '160000', '7.0', '1500', 'monthly', true, now(), now()),
  ('qa_p07_iv_bonds',   :U, :FAM, 'Corporate Bonds',       'bonds',       '140000', '4.2', '0',    'monthly', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 10. Goals — large
INSERT INTO goals (id, user_id, family_id, goal_name, goal_type, target_amount, target_date, current_amount_saved, monthly_contribution, description, is_achieved, is_active, created_at, updated_at) VALUES
  ('qa_p07_g_legacy',  :U, :FAM, 'Estate / Legacy',     'primary',   '5000000', '2040-06-08', '2800000', '8000', NULL, false, true, now(), now()),
  ('qa_p07_g_retire',  :U, :FAM, 'Early Retirement Fund','secondary','3000000', '2032-06-08', '1900000', '6000', NULL, false, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 11. Comprehensive policies
INSERT INTO policies (id, user_id, family_id, family_member_id, provider, policy_type, status, start_date, premium_amount, premium_frequency, total_premium_duration, description, is_active, created_at, updated_at) VALUES
  ('qa_p07_pol_priya_life', :U, :FAM, :SELF_FM,        'Manulife',      'Whole Life',           'Active', '2005-01-01', '1200', 'Monthly', 30, 'High-cover life',  true, now(), now()),
  ('qa_p07_pol_priya_ci',   :U, :FAM, :SELF_FM,        'AIA',           'Critical Illness',     'Active', '2008-01-01', '450',  'Monthly', 30, 'CI cover',         true, now(), now()),
  ('qa_p07_pol_raj_life',   :U, :FAM, 'qa_p07_fm_raj', 'Prudential',    'Whole Life',           'Active', '2007-01-01', '950',  'Monthly', 30, 'High-cover life',  true, now(), now()),
  ('qa_p07_pol_priya_ip',   :U, :FAM, :SELF_FM,        'Great Eastern', 'Hospitalisation Plan', 'Active', '2006-01-01', '420',  'Monthly', 40, 'Private IP',       true, now(), now()),
  ('qa_p07_pol_raj_ip',     :U, :FAM, 'qa_p07_fm_raj', 'Great Eastern', 'Hospitalisation Plan', 'Active', '2006-01-01', '420',  'Monthly', 40, 'Private IP',       true, now(), now())
ON CONFLICT (id) DO NOTHING;

\echo
\echo === Persona 07 seeded row counts ===
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
