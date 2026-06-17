-- ============================================================================
-- Baseline schema — the full current database, from scratch.
--
-- Source of truth is db/schema.ts (applied with `npm run db:push`). This file is
-- the squashed equivalent: run it on an empty Postgres to reproduce the entire
-- current schema. All prior incremental migrations have been collapsed here.
--
--   psql "$DATABASE_URL" -f src/db/manual-migrations/0001_baseline.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255),
	"type" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"current_value" numeric(15, 2) NOT NULL,
	"purchase_value" numeric(15, 2),
	"purchase_date" date,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_shifts" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255),
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"from_category_name" varchar(100) NOT NULL,
	"to_category_name" varchar(100) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "current_holdings" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255),
	"family_member_id" varchar(255),
	"bank_name" varchar(255) NOT NULL,
	"holding_amount" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_expenses" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255),
	"category_id" varchar(255),
	"category_name" varchar(100) NOT NULL,
	"subcategory_id" varchar(255),
	"subcategory_name" varchar(100),
	"amount" numeric(12, 2) NOT NULL,
	"note" text,
	"date" date NOT NULL,
	"original_currency" varchar(10),
	"original_amount" numeric(12, 2),
	"exchange_rate" numeric(12, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255),
	"name" varchar(100) NOT NULL,
	"icon" varchar(50),
	"is_default" boolean DEFAULT false,
	"tracked_in_budget" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_subcategories" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255),
	"category_id" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255),
	"linked_policy_id" varchar(255),
	"linked_property_id" varchar(255),
	"linked_vehicle_id" varchar(255),
	"linked_goal_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"expense_category" varchar(50) DEFAULT 'current-recurring',
	"amount" numeric(12, 2) NOT NULL,
	"frequency" varchar(50) NOT NULL,
	"custom_months" text,
	"start_date" date,
	"end_date" date,
	"description" text,
	"is_active" boolean DEFAULT true,
	"tracked_in_budget" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"master_user_id" varchar(255),
	"name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255),
	"clerk_user_id" varchar(255),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"invited_email" varchar(255),
	"clerk_invitation_id" varchar(255),
	"email_invitation_accepted" boolean DEFAULT false NOT NULL,
	"name" varchar(255) NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"relationship" varchar(100),
	"date_of_birth" date,
	"is_contributing" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255),
	"linked_expense_id" varchar(255),
	"goal_name" varchar(255) NOT NULL,
	"goal_type" varchar(50) DEFAULT 'primary' NOT NULL,
	"target_amount" numeric(15, 2) NOT NULL,
	"target_date" date NOT NULL,
	"current_amount_saved" numeric(15, 2) DEFAULT '0',
	"monthly_contribution" numeric(12, 2),
	"description" text,
	"is_achieved" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holding_amount_history" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"holding_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255),
	"amount" numeric(15, 2) NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incomes" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255) NOT NULL,
	"family_member_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"income_category" varchar(20) DEFAULT 'current' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"subject_to_cpf" boolean DEFAULT false,
	"account_for_bonus" boolean DEFAULT false,
	"bonus_groups" text,
	"employee_cpf_contribution" numeric(12, 2),
	"employer_cpf_contribution" numeric(12, 2),
	"net_take_home" numeric(12, 2),
	"cpf_rates_version" varchar(20),
	"cpf_ordinary_account" numeric(12, 2),
	"cpf_special_account" numeric(12, 2),
	"cpf_medisave_account" numeric(12, 2),
	"description" text,
	"past_income_history" text,
	"future_milestones" text,
	"account_for_future_change" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insurance_providers" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255),
	"name" varchar(100) NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_policies" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255),
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"current_capital" numeric(15, 2) NOT NULL,
	"projected_yield" numeric(5, 2) NOT NULL,
	"contribution_amount" numeric(12, 2) NOT NULL,
	"contribution_frequency" varchar(50) NOT NULL,
	"custom_months" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kb_chunks" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"doc_id" varchar(255) NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255),
	"family_member_id" varchar(255),
	"linked_expense_id" varchar(255),
	"provider" varchar(255) NOT NULL,
	"plan_name" varchar(255),
	"policy_number" varchar(255),
	"policy_type" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'active',
	"start_date" date NOT NULL,
	"maturity_date" date,
	"coverage_until_age" integer,
	"premium_amount" numeric(12, 2) NOT NULL,
	"premium_amount_cpf" numeric(12, 2),
	"premium_frequency" varchar(50) NOT NULL,
	"custom_months" text,
	"total_premium_duration" integer,
	"coverage_options" text,
	"cash_value" numeric(12, 2),
	"cash_value_date" date,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_assets" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255),
	"linked_expense_id" varchar(255),
	"property_name" varchar(255) NOT NULL,
	"purchase_date" date NOT NULL,
	"original_purchase_price" numeric(15, 2) NOT NULL,
	"loan_amount_taken" numeric(15, 2),
	"outstanding_loan" numeric(15, 2) NOT NULL,
	"monthly_loan_payment" numeric(12, 2) NOT NULL,
	"interest_rate" numeric(5, 2) NOT NULL,
	"principal_cpf_withdrawn" numeric(15, 2),
	"housing_grant_taken" numeric(15, 2),
	"accrued_interest_to_date" numeric(15, 2),
	"paid_by_cpf" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quick_links" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255),
	"link_key" varchar(100) NOT NULL,
	"label" varchar(100) NOT NULL,
	"href" varchar(255) NOT NULL,
	"icon" varchar(50) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_chunks" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255),
	"doc_id" varchar(255) NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"image_url" text,
	"onboarding_completed" boolean DEFAULT false,
	"tour_completed_at" text,
	"singlish_mode" boolean DEFAULT false,
	"background_decor" text DEFAULT 'radial',
	"family_id" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicle_assets" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"family_id" varchar(255),
	"linked_expense_id" varchar(255),
	"vehicle_name" varchar(255) NOT NULL,
	"purchase_date" date NOT NULL,
	"coe_expiry_date" date,
	"original_purchase_price" numeric(15, 2) NOT NULL,
	"loan_amount_taken" numeric(15, 2),
	"loan_interest_rate" numeric(5, 2),
	"loan_tenure_years" integer,
	"loan_tenure_months" integer,
	"loan_amount_repaid" numeric(15, 2),
	"monthly_loan_payment" numeric(12, 2),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_shifts" ADD CONSTRAINT "budget_shifts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_holdings" ADD CONSTRAINT "current_holdings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "current_holdings" ADD CONSTRAINT "current_holdings_family_member_id_family_members_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_expenses" ADD CONSTRAINT "daily_expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_expenses" ADD CONSTRAINT "daily_expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_expenses" ADD CONSTRAINT "daily_expenses_subcategory_id_expense_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."expense_subcategories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_subcategories" ADD CONSTRAINT "expense_subcategories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_subcategories" ADD CONSTRAINT "expense_subcategories_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_master_user_id_users_id_fk" FOREIGN KEY ("master_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_clerk_user_id_users_id_fk" FOREIGN KEY ("clerk_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holding_amount_history" ADD CONSTRAINT "holding_amount_history_holding_id_current_holdings_id_fk" FOREIGN KEY ("holding_id") REFERENCES "public"."current_holdings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holding_amount_history" ADD CONSTRAINT "holding_amount_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_family_member_id_family_members_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_providers" ADD CONSTRAINT "insurance_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_policies" ADD CONSTRAINT "investment_policies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_family_member_id_family_members_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_assets" ADD CONSTRAINT "property_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_links" ADD CONSTRAINT "quick_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_chunks" ADD CONSTRAINT "user_chunks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_assets" ADD CONSTRAINT "vehicle_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kb_chunks_doc_id_idx" ON "kb_chunks" USING btree ("doc_id");--> statement-breakpoint
CREATE INDEX "kb_chunks_created_at_idx" ON "kb_chunks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_chunks_user_id_idx" ON "user_chunks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_chunks_doc_id_idx" ON "user_chunks" USING btree ("doc_id");--> statement-breakpoint
CREATE INDEX "user_chunks_user_doc_idx" ON "user_chunks" USING btree ("user_id","doc_id");--> statement-breakpoint
CREATE INDEX "user_chunks_created_at_idx" ON "user_chunks" USING btree ("created_at");