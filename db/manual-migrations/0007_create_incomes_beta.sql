-- Provisions the `incomes_beta` table that powers the Incomes Beta view.
--
-- Coexists with the existing `incomes` table — none of the existing readers
-- or writers (dashboard, CPF projector, AI executors, family-member cascade
-- delete) touch this new table. Same column set as `incomes` minus
-- `frequency` / `custom_months` (beta assumes monthly recurring), and with a
-- simpler `income_category` discriminator (past | current | future).
--
-- CPF computed columns follow the same write rule as `incomes`: populated
-- server-side via the existing `calculateCPF` helper when subject_to_cpf is
-- true; cleared to NULL otherwise.
--
-- Idempotent: every statement uses IF NOT EXISTS so re-running is a no-op.

CREATE TABLE IF NOT EXISTS "incomes_beta" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "user_id" varchar(255) NOT NULL,
  "family_id" varchar(255) NOT NULL,
  "family_member_id" varchar(255),
  "name" varchar(255) NOT NULL,
  "category" varchar(100) NOT NULL,
  "income_category" varchar(20) NOT NULL DEFAULT 'current',
  "amount" numeric(12, 2) NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date,
  "subject_to_cpf" boolean DEFAULT false,
  "account_for_bonus" boolean DEFAULT false,
  "bonus_groups" text,
  "employee_cpf_contribution" numeric(12, 2),
  "employer_cpf_contribution" numeric(12, 2),
  "net_take_home" numeric(12, 2),
  "cpf_ordinary_account" numeric(12, 2),
  "cpf_special_account" numeric(12, 2),
  "cpf_medisave_account" numeric(12, 2),
  "description" text,
  "past_income_history" text,
  "future_milestones" text,
  "account_for_future_change" boolean DEFAULT false,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'incomes_beta_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "incomes_beta"
      ADD CONSTRAINT "incomes_beta_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'incomes_beta_family_id_families_id_fk'
  ) THEN
    ALTER TABLE "incomes_beta"
      ADD CONSTRAINT "incomes_beta_family_id_families_id_fk"
      FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'incomes_beta_family_member_id_family_members_id_fk'
  ) THEN
    ALTER TABLE "incomes_beta"
      ADD CONSTRAINT "incomes_beta_family_member_id_family_members_id_fk"
      FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- Helpful indexes for common access patterns (mirrors what would be implied
-- by Drizzle's relation queries).
CREATE INDEX IF NOT EXISTS "incomes_beta_user_id_idx" ON "incomes_beta" ("user_id");
CREATE INDEX IF NOT EXISTS "incomes_beta_family_id_idx" ON "incomes_beta" ("family_id");
CREATE INDEX IF NOT EXISTS "incomes_beta_family_member_id_idx" ON "incomes_beta" ("family_member_id");
