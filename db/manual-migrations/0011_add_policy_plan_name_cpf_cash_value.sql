-- Add plan_name, premium_amount_cpf, cash_value, cash_value_date columns to policies table
-- These were added in the Drizzle schema (commit a538c29) but never migrated to the database.

ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS plan_name varchar(255),
  ADD COLUMN IF NOT EXISTS premium_amount_cpf decimal(12, 2),
  ADD COLUMN IF NOT EXISTS cash_value decimal(12, 2),
  ADD COLUMN IF NOT EXISTS cash_value_date date;
