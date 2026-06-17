-- ═══════════════════════════════════════════════════════════════════════════
-- QA RESET — make onboarding re-runnable for the one QA test household.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Onboarding is normally once-per-account: completeOnboarding() sets
-- users.onboarding_completed = true (one-way), and /onboarding redirects to
-- /overview the moment it's true (app/onboarding/layout.tsx). To re-test the
-- wizard end to end you do NOT need to delete the Clerk account — Clerk identity
-- is separate from app data. You only need to (1) wipe this family's financial
-- data and (2) flip the flag back to false. This script does both.
--
-- It reuses _reset_family.sql for the wipe (same family, preserves the users
-- row, the families row, and the stable "Self" member AfJc5H4SGvgCH7RBO35cH —
-- getOrCreateSelfMember reuses it and the wizard just re-updates its name/DOB),
-- then resets the onboarding flag.
--
-- After running this against the DEV database, visit http://localhost:3000/onboarding
-- (authenticated) and the wizard is reachable again. Re-run as often as you like.
--
-- Run:
--   /Applications/Postgres.app/Contents/Versions/17/bin/psql \
--     postgresql://evanlee@localhost:5432/foracle_v2_self \
--     -f db/manual-migrations/qa/_reset_onboarding.sql
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

\echo
\echo === Wiping family data (via _reset_family.sql) ===
-- \ir = include relative to THIS script's directory, so it works regardless of
-- the shell's current working directory.
\ir _reset_family.sql

\echo
\echo === Resetting onboarding flag ===
UPDATE users
   SET onboarding_completed = false,
       updated_at           = now()
 WHERE id = 'user_37saN3qoomjrkSRkqix5DaIPEdg';

\echo
\echo === onboarding_completed (should be f) ===
SELECT id, onboarding_completed
  FROM users
 WHERE id = 'user_37saN3qoomjrkSRkqix5DaIPEdg';
