-- Backfill legacy `incomes` → `incomes_beta`.
--
-- WHY: `incomes_beta` was created EMPTY (migration 0007). The app has been
-- delinked to read/write ONLY `incomes_beta`. If you deploy that code while
-- production users' income still lives in the legacy `incomes` table, their
-- income disappears from the UI. This migration copies the legacy data across,
-- normalized to the beta model, and MUST run on prod BEFORE the delink code
-- deploys (and before 0009_drop_legacy_incomes).
--
-- ⚠️  TEST ON A STAGING CLONE FIRST. Review the pre-flight NOTICE counts.
-- Run:  psql "$DATABASE_URL" -f db/manual-migrations/0008_backfill_incomes_to_beta.sql
--
-- DESIGN DECISIONS (review these against your data):
--   • Amount is normalized to MONTHLY (beta is monthly-only):
--       monthly→×1, yearly/annual→÷12, weekly→×52/12, bi-weekly→×26/12,
--       one-time→×1 (modeled as a one-off: end_date = start_date).
--   • `custom` frequency is SKIPPED — beta cannot represent custom-month income.
--     Those rows are reported at the end for manual handling.
--   • income_category maps to beta's 3-value enum:
--       current-recurring→current, future-recurring→future, past-recurring→past,
--       temporary/one-off/anything-else→current.
--   • DEDUP: a legacy row is skipped if the SAME (family_id, family_member_id)
--     already has ANY beta income — so members already migrated by hand are left
--     on their beta data and never double-counted. (Members with a partial mix
--     are left fully on beta; review them manually — see the report at the end.)
--   • Computed CPF columns (employee/employer/net/OA/SA/MA) are set to NULL, not
--     copied: the legacy values were computed by the old engine (no low-wage
--     rules, possibly on a non-monthly amount). The app recomputes CPF live, so
--     NULL is more correct than carrying stale numbers forward.
--   • Backfilled rows get id = 'bf_' || <legacy id> so they are identifiable.
--     ROLLBACK with:  DELETE FROM incomes_beta WHERE id LIKE 'bf_%';
--   • Idempotent: ON CONFLICT (id) DO NOTHING — safe to re-run.
--
-- WRITE-WINDOW NOTE: between running this and deploying the delink code, any
-- income edited through the OLD UI writes to `incomes` and won't be re-copied.
-- Keep the window short, or run this as the last step before the deploy.

BEGIN;

DO $$
DECLARE
  legacy_total   int;
  beta_before    int;
  custom_skipped int;
  overlap_skip   int;
BEGIN
  SELECT count(*) INTO legacy_total FROM incomes;
  SELECT count(*) INTO beta_before  FROM incomes_beta;
  SELECT count(*) INTO custom_skipped
    FROM incomes WHERE lower(coalesce(frequency,'monthly')) = 'custom';
  SELECT count(*) INTO overlap_skip
    FROM incomes l
    WHERE EXISTS (
      SELECT 1 FROM incomes_beta b
      WHERE b.family_id = l.family_id
        AND b.family_member_id IS NOT DISTINCT FROM l.family_member_id
    );
  RAISE NOTICE 'Pre-flight: legacy=% , beta(before)=% , custom-skipped=% , dedup-skipped(member already on beta)=%',
    legacy_total, beta_before, custom_skipped, overlap_skip;
END $$;

INSERT INTO incomes_beta (
  id, user_id, family_id, family_member_id, name, category,
  income_category, amount, start_date, end_date,
  subject_to_cpf, account_for_bonus, bonus_groups,
  employee_cpf_contribution, employer_cpf_contribution, net_take_home,
  cpf_ordinary_account, cpf_special_account, cpf_medisave_account,
  description, past_income_history, future_milestones, account_for_future_change,
  is_active, created_at, updated_at
)
SELECT
  'bf_' || l.id,
  l.user_id,
  l.family_id,
  l.family_member_id,
  l.name,
  l.category,
  CASE lower(coalesce(l.income_category, 'current-recurring'))
    WHEN 'future-recurring' THEN 'future'
    WHEN 'future'           THEN 'future'
    WHEN 'past-recurring'   THEN 'past'
    WHEN 'past'             THEN 'past'
    ELSE 'current'
  END,
  round(
    l.amount * CASE lower(coalesce(l.frequency, 'monthly'))
      WHEN 'monthly'   THEN 1.0
      WHEN 'yearly'    THEN 1.0/12
      WHEN 'annual'    THEN 1.0/12
      WHEN 'weekly'    THEN 52.0/12
      WHEN 'bi-weekly' THEN 26.0/12
      WHEN 'biweekly'  THEN 26.0/12
      WHEN 'one-time'  THEN 1.0
      ELSE 1.0
    END
  , 2),
  l.start_date,
  CASE WHEN lower(coalesce(l.frequency,'monthly')) = 'one-time'
       THEN l.start_date ELSE l.end_date END,
  l.subject_to_cpf, l.account_for_bonus, l.bonus_groups,
  NULL, NULL, NULL,            -- CPF computed columns: recomputed live by the app
  NULL, NULL, NULL,            -- OA/SA/MA: same
  l.description, l.past_income_history, l.future_milestones, l.account_for_future_change,
  l.is_active, l.created_at, now()
FROM incomes l
WHERE l.family_id IS NOT NULL
  AND lower(coalesce(l.frequency, 'monthly')) <> 'custom'
  AND NOT EXISTS (
    SELECT 1 FROM incomes_beta b
    WHERE b.family_id = l.family_id
      AND b.family_member_id IS NOT DISTINCT FROM l.family_member_id
  )
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  migrated int;
  beta_after int;
BEGIN
  SELECT count(*) INTO migrated   FROM incomes_beta WHERE id LIKE 'bf_%';
  SELECT count(*) INTO beta_after FROM incomes_beta;
  RAISE NOTICE 'Post-flight: backfilled rows=% , beta(after)=%', migrated, beta_after;
END $$;

-- Rows that need MANUAL attention (skipped by the backfill):
--   custom-frequency legacy incomes (cannot be modeled as monthly):
--     SELECT id, name, frequency, custom_months FROM incomes
--      WHERE lower(coalesce(frequency,'monthly')) = 'custom';
--   members left on beta despite having legacy-only rows (verify nothing lost):
--     SELECT DISTINCT l.family_member_id FROM incomes l
--      WHERE EXISTS (SELECT 1 FROM incomes_beta b
--                    WHERE b.family_id = l.family_id
--                      AND b.family_member_id IS NOT DISTINCT FROM l.family_member_id);

COMMIT;
