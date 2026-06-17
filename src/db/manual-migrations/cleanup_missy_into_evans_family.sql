-- ─── One-shot cleanup: merge missyyu@gmail.com into Evan's family ─────────────
--
-- Context (from db/manual-migrations/audit_multi_family_users.sql Q3):
--
--   Pending invitation row id : 9qPQcUaWopijGOg7d6sJ5
--   Pending in family         : fam_user_37saN3qoomjrkSRkqix5DaIPEdg   (Evan)
--   Invited email             : missyyu@gmail.com
--   Invited at                : 2026-01-07
--   But invitee signed up at  : 2026-05-06 as user_3DL8eWdVVzt5PC34jMmKfDgVu6U
--   Existing user family      : fam_user_3DL8eWdVVzt5PC34jMmKfDgVu6U   (Missy, own)
--
-- Outcome: dissolve Missy's auto-created family, move her data + Self row into
-- Evan's family, drop the dangling pending invitation row. Missy's Clerk
-- account is untouched; she'll log in to Evan's family on her next visit.
--
-- ─── HOW TO RUN ──────────────────────────────────────────────────────────────
--   $PSQL "$PROD_DB" -f db/manual-migrations/cleanup_missy_into_evans_family.sql
--
-- The file runs inside a transaction and stops before COMMIT. After the
-- updates apply, you'll see verification output. To finalise, run COMMIT
-- in the same psql session; to abort, run ROLLBACK.
--
-- Or run interactively (recommended):
--   $PSQL "$PROD_DB"
--   foracle=> \i db/manual-migrations/cleanup_missy_into_evans_family.sql
--   foracle=> COMMIT;   -- or ROLLBACK;

\set ON_ERROR_STOP on
\set EVAN_FAMILY  '\'fam_user_37saN3qoomjrkSRkqix5DaIPEdg\''
\set MISSY_FAMILY '\'fam_user_3DL8eWdVVzt5PC34jMmKfDgVu6U\''
\set MISSY_USER   '\'user_3DL8eWdVVzt5PC34jMmKfDgVu6U\''
\set PENDING_ROW  '\'9qPQcUaWopijGOg7d6sJ5\''

BEGIN;

-- ── Pre-flight: snapshot of everything in Missy's family before we touch it ──
\echo
\echo === Pre-flight: rows currently in Missy''s family ===
\echo

SELECT 'users'                    tbl, count(*) FROM users                  WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'family_members',        count(*) FROM family_members      WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'incomes',               count(*) FROM incomes             WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'expenses',              count(*) FROM expenses            WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'expense_categories',    count(*) FROM expense_categories  WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'expense_subcategories', count(*) FROM expense_subcategories WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'daily_expenses',        count(*) FROM daily_expenses      WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'assets',                count(*) FROM assets              WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'property_assets',       count(*) FROM property_assets     WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'vehicle_assets',        count(*) FROM vehicle_assets      WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'policies',              count(*) FROM policies            WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'goals',                 count(*) FROM goals               WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'current_holdings',      count(*) FROM current_holdings    WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'holding_amount_history', count(*) FROM holding_amount_history WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'insurance_providers',   count(*) FROM insurance_providers WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'investment_policies',   count(*) FROM investment_policies WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'budget_shifts',         count(*) FROM budget_shifts       WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'user_chunks',           count(*) FROM user_chunks         WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'quick_links',           count(*) FROM quick_links         WHERE family_id = :MISSY_FAMILY;

\echo
\echo === Missy''s existing family_members rows (before move) ===
SELECT id, name, relationship, status, clerk_user_id, invited_email
FROM family_members
WHERE family_id = :MISSY_FAMILY;

\echo
\echo === Evan''s pending invitation row (will be deleted) ===
SELECT id, name, relationship, status, invited_email, clerk_invitation_id
FROM family_members
WHERE id = :PENDING_ROW;

-- ── Step 1: move Missy's users.family_id to Evan's family ───────────────────
UPDATE users
SET family_id = :EVAN_FAMILY, updated_at = now()
WHERE id = :MISSY_USER
  AND family_id = :MISSY_FAMILY;

-- ── Step 2: drop Evan's dangling pending invitation row ─────────────────────
--      Missy is now in the family via her own Self row (moved in step 3), so
--      the pending invitation Evan sent her is redundant. Delete first to free
--      the (family_id, invited_email) slot before the Self row arrives — in
--      case both rows ever referenced the same email, which they don't here.
DELETE FROM family_members WHERE id = :PENDING_ROW;

-- ── Step 3: move all family-scoped data from Missy's family to Evan's ───────
UPDATE family_members         SET family_id = :EVAN_FAMILY, updated_at = now() WHERE family_id = :MISSY_FAMILY;
UPDATE incomes                SET family_id = :EVAN_FAMILY, updated_at = now() WHERE family_id = :MISSY_FAMILY;
UPDATE expenses               SET family_id = :EVAN_FAMILY, updated_at = now() WHERE family_id = :MISSY_FAMILY;
UPDATE expense_categories     SET family_id = :EVAN_FAMILY, updated_at = now() WHERE family_id = :MISSY_FAMILY;
UPDATE expense_subcategories  SET family_id = :EVAN_FAMILY, updated_at = now() WHERE family_id = :MISSY_FAMILY;
UPDATE daily_expenses         SET family_id = :EVAN_FAMILY, updated_at = now() WHERE family_id = :MISSY_FAMILY;
UPDATE assets                 SET family_id = :EVAN_FAMILY, updated_at = now() WHERE family_id = :MISSY_FAMILY;
UPDATE property_assets        SET family_id = :EVAN_FAMILY, updated_at = now() WHERE family_id = :MISSY_FAMILY;
UPDATE vehicle_assets         SET family_id = :EVAN_FAMILY, updated_at = now() WHERE family_id = :MISSY_FAMILY;
UPDATE policies               SET family_id = :EVAN_FAMILY, updated_at = now() WHERE family_id = :MISSY_FAMILY;
UPDATE goals                  SET family_id = :EVAN_FAMILY, updated_at = now() WHERE family_id = :MISSY_FAMILY;
UPDATE current_holdings       SET family_id = :EVAN_FAMILY, updated_at = now() WHERE family_id = :MISSY_FAMILY;
UPDATE holding_amount_history SET family_id = :EVAN_FAMILY                     WHERE family_id = :MISSY_FAMILY;
UPDATE insurance_providers    SET family_id = :EVAN_FAMILY, updated_at = now() WHERE family_id = :MISSY_FAMILY;
UPDATE investment_policies    SET family_id = :EVAN_FAMILY, updated_at = now() WHERE family_id = :MISSY_FAMILY;
UPDATE budget_shifts          SET family_id = :EVAN_FAMILY                     WHERE family_id = :MISSY_FAMILY;
UPDATE user_chunks            SET family_id = :EVAN_FAMILY, updated_at = now() WHERE family_id = :MISSY_FAMILY;
UPDATE quick_links            SET family_id = :EVAN_FAMILY, updated_at = now() WHERE family_id = :MISSY_FAMILY;

-- ── Step 4: delete the now-empty family ──────────────────────────────────────
--      families.master_user_id had been Missy; FK is SET NULL on user delete,
--      but we're deleting the family itself, not the user. Cascade FKs on the
--      19 child tables would delete leftover rows — but step 3 already moved
--      everything, so nothing cascades. Confirmed empty in the post-flight.
DELETE FROM families WHERE id = :MISSY_FAMILY;

-- ── Post-flight: confirm Missy's family is empty + she's in Evan's ───────────
\echo
\echo === Post-flight: anything still referencing Missy''s old family? ===
\echo (every count below must be 0; if not, ROLLBACK and investigate)
\echo

SELECT 'users'                    tbl, count(*) FROM users                  WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'family_members',        count(*) FROM family_members      WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'incomes',               count(*) FROM incomes             WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'expenses',              count(*) FROM expenses            WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'expense_categories',    count(*) FROM expense_categories  WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'daily_expenses',        count(*) FROM daily_expenses      WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'policies',              count(*) FROM policies            WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'goals',                 count(*) FROM goals               WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'current_holdings',      count(*) FROM current_holdings    WHERE family_id = :MISSY_FAMILY
UNION ALL SELECT 'families',              count(*) FROM families            WHERE id        = :MISSY_FAMILY;

\echo
\echo === Missy''s state in Evan''s family ===
SELECT u.id, u.email, u.family_id
FROM users u
WHERE u.id = :MISSY_USER;

SELECT id, name, relationship, status, clerk_user_id
FROM family_members
WHERE clerk_user_id = :MISSY_USER;

\echo
\echo === Evan''s family roster (full member list) ===
SELECT id, name, relationship, status, clerk_user_id IS NOT NULL AS has_clerk
FROM family_members
WHERE family_id = :EVAN_FAMILY
ORDER BY relationship, name;

\echo
\echo ─────────────────────────────────────────────────────────────────────
\echo If everything above looks right, type:   COMMIT;
\echo Otherwise to abort and undo everything:  ROLLBACK;
\echo ─────────────────────────────────────────────────────────────────────
