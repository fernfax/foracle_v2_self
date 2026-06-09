-- Dedupe expense categories + add a unique (family_id, name) index.
--
-- Background: expense_categories had no unique constraint on (family_id, name).
-- listExpenseCategories() seeded/backfilled categories as a side effect of reads
-- called from two concurrent surfaces (the web budget page AND the native
-- /api/v1/expense-categories endpoint). Concurrent runs double-inserted the same
-- name — notably the asset-linked "Housing" (property-assets.ts) / "Vehicle"
-- (vehicle-assets.ts) / "Transportation" — so the category picker showed
-- duplicates (see the prod screenshot).
--
-- The app code now de-duplicates on read and serializes seeding/backfill behind
-- a per-family advisory lock, so the picker is already clean. This migration
-- removes the leftover duplicate ROWS and adds a unique index so duplicates can
-- never be stored again.
--
-- Run: psql "$DATABASE_URL" -f db/manual-migrations/dedupe_expense_categories.sql

BEGIN;

-- 1) Delete duplicate rows, keeping the most useful per (family_id, name):
--    a tracked category over an untracked one, then a default, then the oldest.
--    Safe: expenses reference categories by NAME (text), not by id, so removing
--    a duplicate row orphans nothing.
DELETE FROM expense_categories ec
WHERE ec.id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY family_id, name
        ORDER BY (tracked_in_budget IS NOT FALSE) DESC, is_default DESC, created_at ASC, id ASC
      ) AS rn
    FROM expense_categories
    WHERE family_id IS NOT NULL
  ) ranked
  WHERE ranked.rn > 1
);

-- 2) Prevent it permanently. The app's onConflictDoNothing inserts and
--    createExpenseCategory's check-then-insert become race-proof against this.
CREATE UNIQUE INDEX IF NOT EXISTS expense_categories_family_name_uniq
  ON expense_categories (family_id, name);

COMMIT;
