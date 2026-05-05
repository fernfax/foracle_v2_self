-- Family ID — Phase 2 (backfill).
-- Run AFTER 0003 has been deployed and the application is writing both userId
-- and familyId on new rows. This migration:
--   1. Creates a family-of-1 for every existing user.
--   2. Backfills family_id on every user-scoped table by joining through users.
--   3. Sets family_members.clerk_user_id for the auto-created "Self" rows.
--   4. Marks legacy family_member rows without an email as informational.
--
-- This migration does NOT yet make family_id NOT NULL or swap FK cascades —
-- that happens in 0005 once we've verified zero NULLs in production.

BEGIN;

-- 1. Create one family per existing user. Use the user.id as a deterministic
--    family.id for the auto-created "family of 1" so re-running the migration
--    is idempotent.
INSERT INTO "families" ("id", "master_user_id", "name", "created_at", "updated_at")
SELECT
  'fam_' || u."id",
  u."id",
  COALESCE(u."first_name", u."email") || '''s Family',
  now(),
  now()
FROM "users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "families" f WHERE f."id" = 'fam_' || u."id"
);

-- 2. Backfill users.family_id.
UPDATE "users" SET "family_id" = 'fam_' || "id" WHERE "family_id" IS NULL;

-- 3. Backfill all 18 user-scoped tables by joining via user_id -> users.family_id.
UPDATE "family_members"        t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "incomes"               t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "expense_categories"    t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "expense_subcategories" t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "insurance_providers"   t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "expenses"              t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "daily_expenses"        t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "assets"                t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "property_assets"       t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "vehicle_assets"        t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "policies"              t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "goals"                 t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "current_holdings"      t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "holding_amount_history" t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "quick_links"           t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "investment_policies"   t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "budget_shifts"         t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "user_chunks"           t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;

-- 4. The legacy auto-created "Self" family_member row IS that user. Link it.
UPDATE "family_members"
SET "clerk_user_id" = "user_id",
    "status" = 'active'
WHERE "relationship" = 'Self'
  AND "clerk_user_id" IS NULL;

-- 5. Other legacy family_member rows (Child, Spouse without email, etc.) — mark informational.
UPDATE "family_members"
SET "status" = 'informational'
WHERE "relationship" <> 'Self'
  AND "clerk_user_id" IS NULL
  AND "status" = 'active';

-- 6. Add FK from users.family_id -> families.id now that every row is populated.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_family_id_fk' AND table_name = 'users'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_family_id_fk"
      FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE SET NULL;
  END IF;
END$$;

-- 7. Sanity check — fail loudly if any user-scoped table still has a NULL family_id.
DO $$
DECLARE
  null_rows int;
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'users','family_members','incomes','expense_categories','expense_subcategories',
    'insurance_providers','expenses','daily_expenses','assets','property_assets',
    'vehicle_assets','policies','goals','current_holdings','holding_amount_history',
    'quick_links','investment_policies','budget_shifts','user_chunks'
  ])
  LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE family_id IS NULL', tbl) INTO null_rows;
    IF null_rows > 0 THEN
      RAISE EXCEPTION 'Backfill incomplete: % rows in % still have NULL family_id', null_rows, tbl;
    END IF;
  END LOOP;
END$$;

COMMIT;
