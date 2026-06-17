-- Family ID — production runbook (0003 + 0004 + 0005, bundled).
--
-- This script applies the full family-tier migration in one pass, with
-- pre-flight checks, structured progress output, and post-flight assertions.
-- Safe to run more than once: every step uses IF NOT EXISTS / IS NULL guards.
--
-- ─── WHEN TO RUN ─────────────────────────────────────────────────────────────
-- Run AFTER the application code that:
--   (a) reads from every user-scoped table via family_id, and
--   (b) writes both user_id and family_id on every insert
-- has landed on the branch the prod build deploys from. The read path is what
-- gates 0005; if it isn't done, NOT NULL + cascade swaps will yield "missing
-- data" pages once data with NULL family_id stops being readable.
--
-- ─── HOW TO RUN ──────────────────────────────────────────────────────────────
--   1. Take a backup. Phase 2 (data backfill) and phase 3 (cascade swap) are
--      not reversible by re-running this script. Restoring from backup is the
--      escape hatch.
--   2. Apply via:
--        psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/manual-migrations/runbook_family_id_full.sql
--      The `-v ON_ERROR_STOP=1` flag aborts at the first error rather than
--      leaving the DB in a half-applied state.
--   3. Read the NOTICE output. Each phase prints a one-line summary before
--      running, and the post-flight assertion at the bottom raises an
--      exception if any user-scoped table still has NULL family_id.
--
-- ─── WHAT IT DOES ────────────────────────────────────────────────────────────
--   Phase 1 (0003 — additive)    : families table + family_id columns + invite-flow fields
--                                   + partial unique index family_members(clerk_user_id)
--                                   + FK family_members.clerk_user_id -> users.id (SET NULL)
--   Phase 2 (0004 — backfill)    : family-of-1 per user + family_id backfilled everywhere
--                                   + legacy Self rows linked to their Clerk user
--                                   + FK users.family_id -> families.id (SET NULL)
--   Phase 3 (0005 — lockdown)    : NOT NULL family_id on all 19 tables
--                                   + cascade FKs from families.id (drop old user-cascade)
--                                   + demote data-table user_id FKs to SET NULL
--
-- ─── PRE-FLIGHT ──────────────────────────────────────────────────────────────
-- Wrapping everything in a single transaction means a failure anywhere rolls
-- the whole thing back. The exception: CREATE INDEX statements outside of
-- CREATE INDEX CONCURRENTLY are fine inside a transaction, so this is safe.

BEGIN;

-- Show table sizes up front so the operator can sanity-check the scope.
DO $$
DECLARE
  tbl text;
  n bigint;
BEGIN
  RAISE NOTICE '── Pre-flight: row counts ─────────────────────────────';
  FOR tbl IN SELECT unnest(ARRAY[
    'users','families','family_members','incomes','expenses',
    'expense_categories','daily_expenses','property_assets','vehicle_assets',
    'policies','goals','current_holdings','investment_policies','budget_shifts'
  ])
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('SELECT count(*) FROM %I', tbl) INTO n;
      RAISE NOTICE '  %-26s  % rows', tbl, n;
    END IF;
  END LOOP;
END$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 1 — Additive schema (0003)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE '── Phase 1: additive schema ───────────────────────────'; END$$;

CREATE TABLE IF NOT EXISTS "families" (
  "id" varchar(255) PRIMARY KEY,
  "master_user_id" varchar(255) REFERENCES "users"("id") ON DELETE SET NULL,
  "name" varchar(255),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "users"                  ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "family_members"         ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "incomes"                ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "expense_categories"     ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "expense_subcategories"  ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "insurance_providers"    ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "expenses"               ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "daily_expenses"         ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "assets"                 ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "property_assets"        ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "vehicle_assets"         ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "policies"               ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "goals"                  ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "current_holdings"       ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "holding_amount_history" ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "quick_links"            ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "investment_policies"    ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "budget_shifts"          ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "user_chunks"            ADD COLUMN IF NOT EXISTS "family_id" varchar(255);

ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "clerk_user_id"       varchar(255);
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "status"              varchar(20) NOT NULL DEFAULT 'active';
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "invited_email"       varchar(255);
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "clerk_invitation_id" varchar(255);
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "first_name"          varchar(255);
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "last_name"           varchar(255);
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "email_invitation_accepted" boolean NOT NULL DEFAULT false;

-- Partial unique index: at most one row per Clerk user. Without this guard the
-- application can race itself into duplicate Self rows (see local incident
-- 2026-05-28 — legacy NULL-clerk Self plus a freshly-inserted Self both ended
-- up linked to the same Clerk id after backfill).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'family_members_clerk_user_id_unique'
  ) THEN
    CREATE UNIQUE INDEX "family_members_clerk_user_id_unique"
      ON "family_members" ("clerk_user_id")
      WHERE "clerk_user_id" IS NOT NULL;
    RAISE NOTICE '  + partial unique index family_members_clerk_user_id_unique';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'family_members_clerk_user_id_fk'
      AND table_name = 'family_members'
  ) THEN
    ALTER TABLE "family_members"
      ADD CONSTRAINT "family_members_clerk_user_id_fk"
      FOREIGN KEY ("clerk_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
    RAISE NOTICE '  + fk family_members.clerk_user_id -> users.id';
  END IF;
END$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 2 — Backfill (0004)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE '── Phase 2: backfill family_id ────────────────────────'; END$$;

-- Pre-flight: warn if any duplicate clerk_user_id rows exist that would block
-- the partial unique index addition above. (Already inside the same txn — the
-- index would have errored at CREATE time. This is a friendly extra check.)
DO $$
DECLARE
  dup int;
BEGIN
  SELECT count(*) INTO dup FROM (
    SELECT clerk_user_id FROM family_members
    WHERE clerk_user_id IS NOT NULL
    GROUP BY clerk_user_id HAVING count(*) > 1
  ) x;
  IF dup > 0 THEN
    RAISE EXCEPTION 'Duplicate clerk_user_id rows in family_members (% groups). Resolve before running this migration.', dup;
  END IF;
END$$;

-- 1. Family-of-1 per existing user (idempotent via WHERE NOT EXISTS).
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

-- 2. users.family_id.
UPDATE "users" SET "family_id" = 'fam_' || "id" WHERE "family_id" IS NULL;

-- 3. Backfill via user_id -> users.family_id join. NULL-only updates so re-runs are no-ops.
UPDATE "family_members"         t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "incomes"                t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "expense_categories"     t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "expense_subcategories"  t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "insurance_providers"    t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "expenses"               t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "daily_expenses"         t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "assets"                 t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "property_assets"        t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "vehicle_assets"         t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "policies"               t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "goals"                  t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "current_holdings"       t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "holding_amount_history" t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "quick_links"            t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "investment_policies"    t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "budget_shifts"          t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;
UPDATE "user_chunks"            t SET "family_id" = u."family_id" FROM "users" u WHERE t."user_id" = u."id" AND t."family_id" IS NULL;

-- 4. Legacy Self rows: link to their owning Clerk user.
UPDATE "family_members"
SET "clerk_user_id" = "user_id",
    "status" = 'active'
WHERE "relationship" = 'Self'
  AND "clerk_user_id" IS NULL;

-- 5. Other legacy rows without an email are informational placeholders.
UPDATE "family_members"
SET "status" = 'informational'
WHERE "relationship" <> 'Self'
  AND "clerk_user_id" IS NULL
  AND "status" = 'active';

-- 6. users.family_id FK now that every users row points at a real family.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_family_id_fk' AND table_name = 'users'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_family_id_fk"
      FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE SET NULL;
    RAISE NOTICE '  + fk users.family_id -> families.id';
  END IF;
END$$;

-- 7. Mid-phase assertion — must hit zero NULLs before phase 3 can succeed.
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
  RAISE NOTICE '  ✓ all rows have non-null family_id';
END$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 3 — Lockdown (0005)
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN RAISE NOTICE '── Phase 3: lockdown (NOT NULL + cascade swap) ────────'; END$$;

-- 1. NOT NULL across the board.
ALTER TABLE "users"                  ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "family_members"         ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "incomes"                ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "expense_categories"     ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "expense_subcategories"  ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "insurance_providers"    ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "expenses"               ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "daily_expenses"         ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "assets"                 ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "property_assets"        ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "vehicle_assets"         ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "policies"               ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "goals"                  ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "current_holdings"       ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "holding_amount_history" ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "quick_links"            ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "investment_policies"    ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "budget_shifts"          ALTER COLUMN "family_id" SET NOT NULL;
ALTER TABLE "user_chunks"            ALTER COLUMN "family_id" SET NOT NULL;

-- 2. Cascade FKs from families.id — deleting a family wipes its data.
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

-- 3. Demote user_id FKs from CASCADE to SET NULL. After this, deleting a
-- Clerk user no longer cascade-wipes data the rest of the family relies on.
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
    FOR old_fk IN
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = tbl
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'user_id'
        AND tc.constraint_name <> tbl || '_user_id_fk'
        -- Skip if already the SET NULL constraint we're about to create.
    LOOP
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', tbl, old_fk);
    END LOOP;

    EXECUTE format('ALTER TABLE %I ALTER COLUMN user_id DROP NOT NULL', tbl);

    new_fk := tbl || '_user_id_fk';
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = new_fk AND table_name = tbl
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
        tbl, new_fk
      );
    END IF;
  END LOOP;
END$$;

DO $$ BEGIN RAISE NOTICE '── Done. Family-tier migration applied. ───────────────'; END$$;

COMMIT;
