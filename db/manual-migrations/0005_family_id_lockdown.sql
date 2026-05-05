-- Family ID — Phase 3 (lockdown).
-- Run AFTER 0004 has succeeded AND all application code is reading by family_id.
-- This migration:
--   1. Tightens family_id NOT NULL across the 19 tables.
--   2. Swaps ON DELETE CASCADE: data tables now cascade from families, not users.
--      A Clerk user deletion must NOT cascade-wipe family-shared data.
--   3. Adds remaining FKs to families.id.
--
-- This is the destructive cutover — verify on staging first.

BEGIN;

-- 1. NOT NULL on family_id everywhere.
ALTER TABLE "users"                 ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "family_members"        ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "incomes"               ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "expense_categories"    ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "expense_subcategories" ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "insurance_providers"   ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "expenses"              ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "daily_expenses"        ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "assets"                ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "property_assets"       ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "vehicle_assets"        ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "policies"              ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "goals"                 ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "current_holdings"      ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "holding_amount_history" ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "quick_links"           ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "investment_policies"   ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "budget_shifts"         ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "user_chunks"           ALTER COLUMN "family_id" SET NOT NULL;

-- 2. Add FKs to families.id with cascade for all 18 child tables (the families
--    table is the new ownership root; deleting a family wipes its data).
DO $$
DECLARE
  tbl text;
  fk_name text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'family_members','incomes','expense_categories','expense_subcategories',
    'insurance_providers','expenses','daily_expenses','assets','property_assets',
    'vehicle_assets','policies','goals','current_holdings','holding_amount_history',
    'quick_links','investment_policies','budget_shifts','user_chunks'
  ])
  LOOP
    fk_name := tbl || '_family_id_fk';
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = fk_name AND table_name = tbl
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE',
        tbl, fk_name
      );
    END IF;
  END LOOP;
END$$;

-- 3. Drop the existing CASCADE FKs from data tables -> users(id) and replace
--    with ON DELETE SET NULL on user_id. After this, deleting a Clerk user
--    leaves all family-shared data intact (only that user's "createdBy"
--    attribution is nulled). Family deletion is the only cascade trigger.
DO $$
DECLARE
  tbl text;
  old_fk text;
  new_fk text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'family_members','incomes','expense_categories','expense_subcategories',
    'insurance_providers','expenses','daily_expenses','assets','property_assets',
    'vehicle_assets','policies','goals','current_holdings','holding_amount_history',
    'quick_links','investment_policies','budget_shifts','user_chunks'
  ])
  LOOP
    -- Drop any existing user_id FK constraint (name pattern from drizzle-kit).
    FOR old_fk IN
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = tbl
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'user_id'
    LOOP
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', tbl, old_fk);
    END LOOP;

    -- Make user_id nullable so SET NULL is valid (createdBy attribution lost on user deletion).
    EXECUTE format('ALTER TABLE %I ALTER COLUMN user_id DROP NOT NULL', tbl);

    -- Re-add as SET NULL.
    new_fk := tbl || '_user_id_fk';
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
      tbl, new_fk
    );
  END LOOP;
END$$;

COMMIT;
