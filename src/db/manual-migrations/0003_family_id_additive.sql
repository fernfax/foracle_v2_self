-- Family ID — Phase 1 (additive, safe).
-- Adds the families table, nullable family_id columns, and family_members
-- invite-flow fields. No FK swaps, no NOT NULL, no backfill in this migration.
-- A follow-up migration (0004) will backfill family_id and tighten constraints
-- once the application code is reading both columns.

CREATE TABLE IF NOT EXISTS "families" (
  "id" varchar(255) PRIMARY KEY,
  "master_user_id" varchar(255) REFERENCES "users"("id") ON DELETE SET NULL,
  "name" varchar(255),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- users: which family this Clerk user belongs to.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "family_id" varchar(255);

-- All 18 user-scoped tables: data ownership column.
ALTER TABLE "family_members"        ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "incomes"               ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "expense_categories"    ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "expense_subcategories" ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "insurance_providers"   ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "expenses"              ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "daily_expenses"        ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "assets"                ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "property_assets"       ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "vehicle_assets"        ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "policies"              ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "goals"                 ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "current_holdings"      ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "holding_amount_history" ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "quick_links"           ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "investment_policies"   ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "budget_shifts"         ADD COLUMN IF NOT EXISTS "family_id" varchar(255);
ALTER TABLE "user_chunks"           ADD COLUMN IF NOT EXISTS "family_id" varchar(255);

-- family_members: invite-flow fields. Nullable; populated by the invite/accept flow.
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "clerk_user_id"        varchar(255);
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "status"               varchar(20) NOT NULL DEFAULT 'active';
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "invited_email"        varchar(255);
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "clerk_invitation_id"  varchar(255);
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "first_name"           varchar(255);
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "last_name"            varchar(255);

-- Partial unique index enforcing one-family-per-Clerk-user (vulnerability #6).
-- Only constrains rows where clerk_user_id is set; informational rows can repeat NULL freely.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'family_members_clerk_user_id_unique'
  ) THEN
    CREATE UNIQUE INDEX "family_members_clerk_user_id_unique"
      ON "family_members" ("clerk_user_id")
      WHERE "clerk_user_id" IS NOT NULL;
  END IF;
END$$;

-- FK from family_members.clerk_user_id -> users.id (set null on Clerk user deletion,
-- so the row demotes to informational rather than getting cascade-deleted).
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
  END IF;
END$$;
