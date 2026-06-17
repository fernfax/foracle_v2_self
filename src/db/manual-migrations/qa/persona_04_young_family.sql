-- ═══════════════════════════════════════════════════════════════════════════
-- PERSONA 04 — "The Lims", Young Family (38 / 36)
-- ═══════════════════════════════════════════════════════════════════════════
-- Churn lens: "Doesn't capture my whole household."
-- Profile: 1.5 incomes (Mr Lim full salary + Mrs Lim part-time), 2 young kids,
--   HDB + mortgage, 1 car, 4 policies, childcare/household spend, retirement +
--   education goals, joint + individual savings, light investments.
-- Deep-tests: family, assets, policies, budget, overview.
--
-- RUN AFTER _reset_family.sql. Self row (AfJc5H4SGvgCH7RBO35cH) is preserved by
-- the reset; this script renames it to the persona and hangs data off it.
-- Idempotent (ON CONFLICT DO NOTHING). IDs prefixed qa_p04_.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\set U       '\'user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set FAM     '\'fam_user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set SELF_FM '\'AfJc5H4SGvgCH7RBO35cH\''

BEGIN;

-- ── 0. Rename the preserved Self row to the persona's primary earner ──────────
UPDATE family_members SET
  name = 'Wei Lim', first_name = 'Wei', last_name = 'Lim',
  relationship = 'Self', date_of_birth = '1988-02-14',
  is_contributing = true, updated_at = now()
WHERE id = :SELF_FM;

-- ── 1. Household members (spouse + 2 kids, informational) ─────────────────────
INSERT INTO family_members (
  id, user_id, family_id, name, first_name, last_name, relationship,
  date_of_birth, is_contributing, notes, status, created_at, updated_at
) VALUES
  ('qa_p04_fm_spouse', :U, :FAM, 'Hui Lim',  'Hui',  'Lim', 'Spouse',
   '1990-06-30', true,  'Part-time marketing exec', 'informational', now(), now()),
  ('qa_p04_fm_kai',    :U, :FAM, 'Kai Lim',  'Kai',  'Lim', 'Child',
   '2016-03-12', false, 'Primary school',           'informational', now(), now()),
  ('qa_p04_fm_mei',    :U, :FAM, 'Mei Lim',  'Mei',  'Lim', 'Child',
   '2019-09-08', false, 'Childcare',                'informational', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── 2. Expense categories ─────────────────────────────────────────────────────
INSERT INTO expense_categories (
  id, user_id, family_id, name, icon, is_default, tracked_in_budget, created_at, updated_at
) VALUES
  ('qa_p04_cat_food',     :U, :FAM, 'Food',           'utensils',     true,  true, now(), now()),
  ('qa_p04_cat_transport',:U, :FAM, 'Transportation', 'car',          true,  true, now(), now()),
  ('qa_p04_cat_housing',  :U, :FAM, 'Housing',        'home',         true,  true, now(), now()),
  ('qa_p04_cat_utilities',:U, :FAM, 'Utilities',      'plug',         true,  true, now(), now()),
  ('qa_p04_cat_children', :U, :FAM, 'Children',       'baby',         true,  true, now(), now()),
  ('qa_p04_cat_health',   :U, :FAM, 'Healthcare',     'heart-pulse',  true,  true, now(), now()),
  ('qa_p04_cat_enter',    :U, :FAM, 'Entertainment',  'clapperboard', true,  true, now(), now()),
  ('qa_p04_cat_insurance',:U, :FAM, 'Insurance',      'shield',       true,  true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── 3. Incomes (direct to incomes_beta) ───────────────────────────────────────
-- Mr Lim — $8,500/mo salary, CPF. Accumulated OA/SA/MA from ~15 working yrs.
INSERT INTO incomes_beta (
  id, user_id, family_id, family_member_id, name, category, income_category,
  amount, start_date, subject_to_cpf,
  employee_cpf_contribution, employer_cpf_contribution, net_take_home,
  cpf_ordinary_account, cpf_special_account, cpf_medisave_account,
  is_active, created_at, updated_at
) VALUES (
  'qa_p04_inc_wei_salary', :U, :FAM, :SELF_FM,
  'Senior Engineer Salary', 'salary', 'current',
  '8500.00', '2012-07-01', true,
  '1600.00', '1360.00', '6900.00',
  '142000.00', '78000.00', '52000.00',
  true, now(), now()
) ON CONFLICT (id) DO NOTHING;

-- Mrs Lim — $2,800/mo part-time, CPF.
INSERT INTO incomes_beta (
  id, user_id, family_id, family_member_id, name, category, income_category,
  amount, start_date, subject_to_cpf,
  employee_cpf_contribution, employer_cpf_contribution, net_take_home,
  cpf_ordinary_account, cpf_special_account, cpf_medisave_account,
  is_active, created_at, updated_at
) VALUES (
  'qa_p04_inc_hui_salary', :U, :FAM, 'qa_p04_fm_spouse',
  'Marketing (Part-time)', 'salary', 'current',
  '2800.00', '2018-01-01', true,
  '560.00', '476.00', '2240.00',
  '38000.00', '21000.00', '17500.00',
  true, now(), now()
) ON CONFLICT (id) DO NOTHING;

-- ── 4. Current holdings + history snapshot ────────────────────────────────────
INSERT INTO current_holdings (
  id, user_id, family_id, family_member_id, bank_name, holding_amount, created_at, updated_at
) VALUES
  ('qa_p04_h_dbs',   :U, :FAM, :SELF_FM,            'DBS Multiplier (Wei)',  '28500', now(), now()),
  ('qa_p04_h_ocbc',  :U, :FAM, 'qa_p04_fm_spouse',  'OCBC 360 (Hui)',        '15200', now(), now()),
  ('qa_p04_h_joint', :U, :FAM, NULL,                'UOB Joint Savings',     '41000', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO holding_amount_history (id, holding_id, user_id, family_id, amount, recorded_at)
SELECT 'qa_p04_hh_' || h.id, h.id, h.user_id, h.family_id, h.holding_amount, now() - interval '30 days'
FROM current_holdings h WHERE h.id LIKE 'qa_p04_h_%'
ON CONFLICT (id) DO NOTHING;

-- ── 5. Recurring expenses ─────────────────────────────────────────────────────
INSERT INTO expenses (
  id, user_id, family_id, name, category, expense_category, amount, frequency,
  description, is_active, tracked_in_budget, created_at, updated_at
) VALUES
  ('qa_p04_e_groceries', :U, :FAM, 'Groceries (FairPrice)', 'Food',           'current-recurring', '950', 'monthly', NULL, true, true, now(), now()),
  ('qa_p04_e_dining',    :U, :FAM, 'Family Dining',          'Food',           'current-recurring', '480', 'monthly', NULL, true, true, now(), now()),
  ('qa_p04_e_mrt',       :U, :FAM, 'MRT/Bus',                'Transportation', 'current-recurring', '160', 'monthly', NULL, true, true, now(), now()),
  ('qa_p04_e_carloan',   :U, :FAM, 'Car Loan + Petrol',      'Transportation', 'current-recurring', '1180','monthly', NULL, true, true, now(), now()),
  ('qa_p04_e_mortgage',  :U, :FAM, 'HDB Mortgage',           'Housing',        'current-recurring', '1620','monthly', NULL, true, true, now(), now()),
  ('qa_p04_e_utilities', :U, :FAM, 'SP Utilities',           'Utilities',      'current-recurring', '240', 'monthly', NULL, true, true, now(), now()),
  ('qa_p04_e_telco',     :U, :FAM, 'Singtel (family plan)',  'Utilities',      'current-recurring', '135', 'monthly', NULL, true, true, now(), now()),
  ('qa_p04_e_childcare', :U, :FAM, 'Childcare (Mei)',        'Children',       'current-recurring', '780', 'monthly', NULL, true, true, now(), now()),
  ('qa_p04_e_enrich',    :U, :FAM, 'Enrichment (Kai)',       'Children',       'current-recurring', '420', 'monthly', NULL, true, true, now(), now()),
  ('qa_p04_e_stream',    :U, :FAM, 'Netflix + Disney+',      'Entertainment',  'current-recurring', '38',  'monthly', NULL, true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── 6. Property asset (HDB + mortgage) ────────────────────────────────────────
INSERT INTO property_assets (
  id, user_id, family_id, property_name, purchase_date,
  original_purchase_price, loan_amount_taken, outstanding_loan,
  monthly_loan_payment, interest_rate, paid_by_cpf, is_active, created_at, updated_at
) VALUES (
  'qa_p04_prop_hdb', :U, :FAM, 'Tampines HDB 5-Room', '2019-08-20',
  '560000', '440000', '352000', '1620', '2.6', true, true, now(), now()
) ON CONFLICT (id) DO NOTHING;

-- ── 7. Vehicle asset ──────────────────────────────────────────────────────────
INSERT INTO vehicle_assets (
  id, user_id, family_id, vehicle_name, purchase_date, coe_expiry_date,
  original_purchase_price, loan_amount_taken, loan_amount_repaid,
  monthly_loan_payment, is_active, created_at, updated_at
) VALUES (
  'qa_p04_veh_honda', :U, :FAM, 'Honda Vezel Hybrid', '2021-05-10', '2031-05-09',
  '128000', '90000', '38000', '980', true, now(), now()
) ON CONFLICT (id) DO NOTHING;

-- ── 8. Insurance policies (title-case enums) ──────────────────────────────────
INSERT INTO policies (
  id, user_id, family_id, family_member_id, provider, policy_type, status,
  start_date, premium_amount, premium_frequency, total_premium_duration,
  description, is_active, created_at, updated_at
) VALUES
  ('qa_p04_pol_wei_life',  :U, :FAM, :SELF_FM,           'Manulife',      'Whole Life',          'Active', '2014-03-01', '320', 'Monthly', 25, 'Breadwinner cover', true, now(), now()),
  ('qa_p04_pol_wei_ci',    :U, :FAM, :SELF_FM,           'AIA',           'Critical Illness',    'Active', '2016-09-01', '145', 'Monthly', 30, 'CI rider',          true, now(), now()),
  ('qa_p04_pol_hui_life',  :U, :FAM, 'qa_p04_fm_spouse', 'Prudential',    'Term Life',           'Active', '2018-02-01', '95',  'Monthly', 20, 'Term cover',        true, now(), now()),
  ('qa_p04_pol_kids_hosp', :U, :FAM, 'qa_p04_fm_kai',    'Great Eastern', 'Hospitalisation Plan','Active', '2017-01-15', '72',  'Monthly', 18, 'IP + rider (Kai)',  true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── 9. Investments ────────────────────────────────────────────────────────────
INSERT INTO investment_policies (
  id, user_id, family_id, name, type, current_capital, projected_yield,
  contribution_amount, contribution_frequency, is_active, created_at, updated_at
) VALUES
  ('qa_p04_iv_etf',   :U, :FAM, 'S&P 500 ETF (Endowus)', 'etf',   '34000', '7.8', '600', 'monthly', true, now(), now()),
  ('qa_p04_iv_ssb',   :U, :FAM, 'Singapore Savings Bonds','bonds', '25000', '3.0', '0',   'monthly', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── 10. Goals ─────────────────────────────────────────────────────────────────
INSERT INTO goals (
  id, user_id, family_id, goal_name, goal_type, target_amount, target_date,
  current_amount_saved, monthly_contribution, description, is_achieved, is_active, created_at, updated_at
) VALUES
  ('qa_p04_g_emergency', :U, :FAM, 'Emergency Fund (6mo)',    'primary',   '60000',  '2027-12-31', '38000', '1500', NULL, false, true, now(), now()),
  ('qa_p04_g_education',  :U, :FAM, 'Kids University Fund',   'primary',   '300000', '2034-06-30', '52000', '1200', NULL, false, true, now(), now()),
  ('qa_p04_g_retire',     :U, :FAM, 'Retirement at 60',       'secondary', '1800000','2048-02-14', '210000','2000', NULL, false, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── 11. Daily expenses — June 2026 (current month, for budget page) ───────────
INSERT INTO daily_expenses (
  id, user_id, family_id, category_name, subcategory_name, amount, note, date, created_at, updated_at
) VALUES
  ('qa_p04_de_01', :U, :FAM, 'Food',           NULL, '92.40',  'FairPrice weekly',        '2026-06-01', now(), now()),
  ('qa_p04_de_02', :U, :FAM, 'Housing',        NULL, '1620.00','HDB mortgage June',       '2026-06-01', now(), now()),
  ('qa_p04_de_03', :U, :FAM, 'Utilities',      NULL, '238.00', 'SP electricity+water',    '2026-06-02', now(), now()),
  ('qa_p04_de_04', :U, :FAM, 'Children',       NULL, '780.00', 'Childcare (Mei)',         '2026-06-02', now(), now()),
  ('qa_p04_de_05', :U, :FAM, 'Transportation', NULL, '85.00',  'Petrol — Shell',          '2026-06-03', now(), now()),
  ('qa_p04_de_06', :U, :FAM, 'Food',           NULL, '46.50',  'Family dinner',           '2026-06-04', now(), now()),
  ('qa_p04_de_07', :U, :FAM, 'Children',       NULL, '420.00', 'Enrichment (Kai)',        '2026-06-04', now(), now()),
  ('qa_p04_de_08', :U, :FAM, 'Healthcare',     NULL, '120.00', 'Paediatrician (Mei)',     '2026-06-05', now(), now()),
  ('qa_p04_de_09', :U, :FAM, 'Food',           NULL, '68.00',  'Groceries — Sheng Siong', '2026-06-06', now(), now()),
  ('qa_p04_de_10', :U, :FAM, 'Entertainment',  NULL, '54.00',  'Cinema + snacks',         '2026-06-06', now(), now()),
  ('qa_p04_de_11', :U, :FAM, 'Transportation', NULL, '22.00',  'Grab',                    '2026-06-07', now(), now()),
  ('qa_p04_de_12', :U, :FAM, 'Food',           NULL, '38.00',  'Hawker lunch',            '2026-06-08', now(), now()),
  ('qa_p04_de_13', :U, :FAM, 'Insurance',      NULL, '320.00', 'Whole life premium',      '2026-06-08', now(), now()),
  ('qa_p04_de_14', :U, :FAM, 'Food',           NULL, '24.50',  'Breakfast + kopi',        '2026-06-09', now(), now())
ON CONFLICT (id) DO NOTHING;

-- ── 12. Budget shifts (June 2026) ─────────────────────────────────────────────
INSERT INTO budget_shifts (
  id, user_id, family_id, year, month, from_category_name, to_category_name, amount, note, created_at
) VALUES
  ('qa_p04_bs_01', :U, :FAM, 2026, 6, 'Entertainment',  'Children',  '120', 'Kai enrichment top-up', now()),
  ('qa_p04_bs_02', :U, :FAM, 2026, 6, 'Transportation', 'Healthcare','60',  'Mei doctor visit',      now())
ON CONFLICT (id) DO NOTHING;

-- ── Post-flight: seeded row counts ────────────────────────────────────────────
\echo
\echo === Persona 04 seeded row counts ===
SELECT 'family_members'      AS tbl, count(*) FROM family_members      WHERE family_id = :FAM
UNION ALL SELECT 'incomes_beta',        count(*) FROM incomes_beta        WHERE family_id = :FAM
UNION ALL SELECT 'expense_categories',  count(*) FROM expense_categories  WHERE family_id = :FAM
UNION ALL SELECT 'expenses',            count(*) FROM expenses            WHERE family_id = :FAM
UNION ALL SELECT 'daily_expenses',      count(*) FROM daily_expenses      WHERE family_id = :FAM
UNION ALL SELECT 'current_holdings',    count(*) FROM current_holdings    WHERE family_id = :FAM
UNION ALL SELECT 'holding_amount_history', count(*) FROM holding_amount_history WHERE family_id = :FAM
UNION ALL SELECT 'property_assets',     count(*) FROM property_assets     WHERE family_id = :FAM
UNION ALL SELECT 'vehicle_assets',      count(*) FROM vehicle_assets      WHERE family_id = :FAM
UNION ALL SELECT 'policies',            count(*) FROM policies            WHERE family_id = :FAM
UNION ALL SELECT 'investment_policies', count(*) FROM investment_policies WHERE family_id = :FAM
UNION ALL SELECT 'goals',               count(*) FROM goals               WHERE family_id = :FAM
UNION ALL SELECT 'budget_shifts',       count(*) FROM budget_shifts       WHERE family_id = :FAM
ORDER BY tbl;

COMMIT;
