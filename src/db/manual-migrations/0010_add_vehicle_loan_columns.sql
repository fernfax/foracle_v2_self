-- Add the vehicle loan-amortization columns that the deployed code expects.
--
-- These columns were added to db/schema.ts (vehicleAssets) for the vehicle loan
-- amortization feature and pushed to local DBs via `db:push`, but no migration
-- ever added them to prod. The deployed code's `db.query.vehicleAssets.findMany()`
-- selects them, so on prod it errors with "column does not exist" — which 500s
-- every page that reads vehicle assets (e.g. /overview via getDashboardMetrics).
--
-- Additive + nullable → safe, non-destructive, no data migration. The running
-- app recovers immediately once these exist (no redeploy needed). Idempotent.
--
-- Run:  psql "$PROD_URL" -f db/manual-migrations/0010_add_vehicle_loan_columns.sql

ALTER TABLE vehicle_assets
  ADD COLUMN IF NOT EXISTS loan_interest_rate numeric(5, 2),
  ADD COLUMN IF NOT EXISTS loan_tenure_years  integer,
  ADD COLUMN IF NOT EXISTS loan_tenure_months integer;
