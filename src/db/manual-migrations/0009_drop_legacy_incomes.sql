-- Retire the legacy `incomes` table now that all application code reads/writes
-- `incomes_beta` exclusively (the "delink" — see lib/actions/income.ts which is
-- now a thin adapter over incomes_beta, plus cpf.ts / user.ts / family.ts /
-- onboarding.ts / ai/tools/executors.ts all repointed).
--
-- ⚠️  DESTRUCTIVE — DO NOT RUN WITHOUT EXPLICIT SIGN-OFF.
-- The legacy `incomes` table still holds real rows (e.g. the demo Tan family's
-- $41,000 figures) that are NOT in incomes_beta. Dropping it is irreversible.
--
-- This file defaults to the REVERSIBLE path (rename-to-archive). The hard DROP
-- is provided commented-out below. Run via:
--     psql "$DATABASE_URL" -f db/manual-migrations/0008_drop_legacy_incomes.sql
--
-- IMPORTANT — keep schema in sync, or `db:push` will recreate the table:
-- When you apply this, ALSO remove the `incomes` table + its relations from
-- db/schema.ts and drizzle/relations.ts in the same change. Lines to delete:
--   db/schema.ts:        export const incomes = pgTable("incomes", {...})       (~line 97-126)
--                        export const incomesRelations = relations(incomes, ...) (~line 522)
--                        `incomes: many(incomes),` in familyMembersRelations + usersRelations
--   drizzle/relations.ts: export const incomesRelations + the two `incomes: many(incomes)`
--                         + the `incomes` import on line 2
-- Leaving the symbol in schema while the table is gone is harmless at runtime
-- (nothing queries it); removing it keeps `db:push` from trying to re-add it.

DO $$
DECLARE
  legacy_count   integer := 0;
  beta_count     integer := 0;
BEGIN
  IF to_regclass('public.incomes') IS NULL THEN
    RAISE NOTICE 'incomes table already absent — nothing to do.';
    RETURN;
  END IF;

  SELECT count(*) INTO legacy_count FROM incomes;
  SELECT count(*) INTO beta_count   FROM incomes_beta;
  RAISE NOTICE 'Pre-flight: incomes=% rows, incomes_beta=% rows. Archiving legacy table.',
    legacy_count, beta_count;

  -- Reversible: keep the data under a clearly-dead name. Roll back with
  --   ALTER TABLE incomes_legacy_archived RENAME TO incomes;
  ALTER TABLE incomes RENAME TO incomes_legacy_archived;
END $$;

-- ----------------------------------------------------------------------------
-- HARD DROP (irreversible) — uncomment ONLY after the archive has lived in
-- production long enough that you are certain no legacy-only data is needed.
-- ----------------------------------------------------------------------------
-- DROP TABLE IF EXISTS incomes_legacy_archived;
