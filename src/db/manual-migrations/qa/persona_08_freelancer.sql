-- ═══════════════════════════════════════════════════════════════════════════
-- PERSONA 08 — "Marcus", Freelancer (34)
-- ═══════════════════════════════════════════════════════════════════════════
-- Churn lens: "Doesn't handle variable/irregular income."
-- Profile: single, no fixed salary — freelance design + dividends (NOT CPF),
--   plus a PAST full-time salary (ended) to exercise past-income handling.
--   Lumpy expenses, bigger emergency fund (irregular income), self-bought
--   insurance, light DCA investing. CPF tab should be near-empty for him.
-- Deep-tests: incomes (non-salary categories, past income, no-CPF), budget, overview.
--
-- RUN AFTER _reset_family.sql. IDs prefixed qa_p08_.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\set U       '\'user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set FAM     '\'fam_user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set SELF_FM '\'AfJc5H4SGvgCH7RBO35cH\''

BEGIN;

-- 0. Self = Marcus
UPDATE family_members SET
  name = 'Marcus Lee', first_name = 'Marcus', last_name = 'Lee',
  relationship = 'Self', date_of_birth = '1992-10-03',
  is_contributing = true, updated_at = now()
WHERE id = :SELF_FM;

-- 1. Categories
INSERT INTO expense_categories (id, user_id, family_id, name, icon, is_default, tracked_in_budget, created_at, updated_at) VALUES
  ('qa_p08_cat_food',     :U, :FAM, 'Food',           'utensils',     true, true, now(), now()),
  ('qa_p08_cat_transport',:U, :FAM, 'Transportation', 'car',          true, true, now(), now()),
  ('qa_p08_cat_housing',  :U, :FAM, 'Housing',        'home',         true, true, now(), now()),
  ('qa_p08_cat_business', :U, :FAM, 'Business',       'briefcase',    true, true, now(), now()),
  ('qa_p08_cat_utilities',:U, :FAM, 'Utilities',      'plug',         true, true, now(), now()),
  ('qa_p08_cat_enter',    :U, :FAM, 'Entertainment',  'clapperboard', true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 2. Incomes — freelance (current, no CPF) + dividend (current, no CPF) + PAST salary
INSERT INTO incomes_beta (id, user_id, family_id, family_member_id, name, category, income_category, amount, start_date, subject_to_cpf, is_active, created_at, updated_at) VALUES
  ('qa_p08_inc_freelance', :U, :FAM, :SELF_FM, 'Freelance Design (avg)', 'freelance',  'current', '5500.00', '2023-01-01', false, true, now(), now()),
  ('qa_p08_inc_dividend',  :U, :FAM, :SELF_FM, 'Dividend Income',        'investment', 'current', '600.00',  '2021-01-01', false, true, now(), now())
ON CONFLICT (id) DO NOTHING;
-- Past salary (previous full-time role, ended) — exercises past-income timeline
INSERT INTO incomes_beta (id, user_id, family_id, family_member_id, name, category, income_category, amount, start_date, end_date, subject_to_cpf, is_active, created_at, updated_at) VALUES
  ('qa_p08_inc_pastjob', :U, :FAM, :SELF_FM, 'Previous Agency Salary', 'salary', 'past', '4200.00', '2018-01-01', '2022-12-31', true, false, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 3. Holdings — business + personal + emergency buffer
INSERT INTO current_holdings (id, user_id, family_id, family_member_id, bank_name, holding_amount, created_at, updated_at) VALUES
  ('qa_p08_h_biz',  :U, :FAM, :SELF_FM, 'OCBC Business Account', '22000', now(), now()),
  ('qa_p08_h_emer', :U, :FAM, :SELF_FM, 'DBS Emergency Buffer',  '34000', now(), now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO holding_amount_history (id, holding_id, user_id, family_id, amount, recorded_at)
SELECT 'qa_p08_hh_' || h.id, h.id, h.user_id, h.family_id, h.holding_amount, now() - interval '30 days'
FROM current_holdings h WHERE h.id LIKE 'qa_p08_h_%' ON CONFLICT (id) DO NOTHING;

-- 4. Recurring expenses (incl. business)
INSERT INTO expenses (id, user_id, family_id, name, category, expense_category, amount, frequency, description, is_active, tracked_in_budget, created_at, updated_at) VALUES
  ('qa_p08_e_rent',   :U, :FAM, 'Studio Rental',          'Housing',       'current-recurring', '1600', 'monthly', NULL, true, true, now(), now()),
  ('qa_p08_e_food',   :U, :FAM, 'Food & Groceries',       'Food',          'current-recurring', '700',  'monthly', NULL, true, true, now(), now()),
  ('qa_p08_e_cowork', :U, :FAM, 'Co-working Space',       'Business',      'current-recurring', '350',  'monthly', NULL, true, true, now(), now()),
  ('qa_p08_e_saas',   :U, :FAM, 'Adobe + SaaS Tools',     'Business',      'current-recurring', '180',  'monthly', NULL, true, true, now(), now()),
  ('qa_p08_e_util',   :U, :FAM, 'Utilities + Phone',      'Utilities',     'current-recurring', '140',  'monthly', NULL, true, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 5. Daily expenses — June 2026 (lumpy)
INSERT INTO daily_expenses (id, user_id, family_id, category_name, subcategory_name, amount, note, date, created_at, updated_at) VALUES
  ('qa_p08_de_01', :U, :FAM, 'Business',      NULL, '420.00', 'New tablet pen + gear', '2026-06-01', now(), now()),
  ('qa_p08_de_02', :U, :FAM, 'Food',          NULL, '14.50',  'Hawker lunch',          '2026-06-02', now(), now()),
  ('qa_p08_de_03', :U, :FAM, 'Transportation',NULL, '28.00',  'Grab to client',        '2026-06-03', now(), now()),
  ('qa_p08_de_04', :U, :FAM, 'Entertainment', NULL, '85.00',  'Gig night',             '2026-06-05', now(), now()),
  ('qa_p08_de_05', :U, :FAM, 'Food',          NULL, '52.00',  'Client lunch',          '2026-06-06', now(), now()),
  ('qa_p08_de_06', :U, :FAM, 'Business',      NULL, '120.00', 'Stock photos license',  '2026-06-08', now(), now())
ON CONFLICT (id) DO NOTHING;

-- 6. Light DCA investments
INSERT INTO investment_policies (id, user_id, family_id, name, type, current_capital, projected_yield, contribution_amount, contribution_frequency, is_active, created_at, updated_at) VALUES
  ('qa_p08_iv_etf',    :U, :FAM, 'IWDA DCA',     'etf',    '28000', '8.0', '500', 'monthly', true, now(), now()),
  ('qa_p08_iv_crypto', :U, :FAM, 'ETH Holdings', 'crypto', '6000',  '0',   '150', 'monthly', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 7. Goals — bigger emergency fund + voluntary CPF
INSERT INTO goals (id, user_id, family_id, goal_name, goal_type, target_amount, target_date, current_amount_saved, monthly_contribution, description, is_achieved, is_active, created_at, updated_at) VALUES
  ('qa_p08_g_emergency', :U, :FAM, 'Emergency Fund (12mo)', 'primary',   '60000', '2027-12-31', '34000', '800', NULL, false, true, now(), now()),
  ('qa_p08_g_cpf',       :U, :FAM, 'Voluntary CPF Top-up',  'secondary', '15000', '2026-12-31', '5000',  '500', NULL, false, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 8. Self-bought insurance
INSERT INTO policies (id, user_id, family_id, family_member_id, provider, policy_type, status, start_date, premium_amount, premium_frequency, total_premium_duration, description, is_active, created_at, updated_at) VALUES
  ('qa_p08_pol_term', :U, :FAM, :SELF_FM, 'FWD',           'Term Life',            'Active', '2022-01-01', '85',  'Monthly', 20, 'Term cover (self)', true, now(), now()),
  ('qa_p08_pol_ip',   :U, :FAM, :SELF_FM, 'Great Eastern', 'Hospitalisation Plan', 'Active', '2020-01-01', '95',  'Monthly', 30, 'IP (self)',         true, now(), now())
ON CONFLICT (id) DO NOTHING;

\echo
\echo === Persona 08 seeded row counts ===
SELECT 'family_members' AS tbl, count(*) FROM family_members WHERE family_id = :FAM
UNION ALL SELECT 'incomes_beta (incl 1 past, inactive)', count(*) FROM incomes_beta WHERE family_id = :FAM
UNION ALL SELECT 'expenses', count(*) FROM expenses WHERE family_id = :FAM
UNION ALL SELECT 'daily_expenses', count(*) FROM daily_expenses WHERE family_id = :FAM
UNION ALL SELECT 'policies', count(*) FROM policies WHERE family_id = :FAM
UNION ALL SELECT 'investment_policies', count(*) FROM investment_policies WHERE family_id = :FAM
UNION ALL SELECT 'current_holdings', count(*) FROM current_holdings WHERE family_id = :FAM
UNION ALL SELECT 'goals', count(*) FROM goals WHERE family_id = :FAM
ORDER BY tbl;

COMMIT;
