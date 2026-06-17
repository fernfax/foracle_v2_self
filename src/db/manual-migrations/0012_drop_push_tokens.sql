-- Drop the push_tokens table (native iOS/Android effort, removed).
--
-- Background: push_tokens stored one row per (user, device token) so the Expo
-- mobile client could register its APNs/FCM token for push notifications. The
-- entire native effort — the Expo app, the /api/v1 REST surface, and the
-- push-tokens service/schema — has been removed from the codebase. This table
-- is no longer referenced by any application code.
--
-- The web app never read or wrote push_tokens, so dropping it has no effect on
-- the production web experience. It is safe to run at any time.
--
-- Run: psql "$DATABASE_URL" -f db/manual-migrations/0012_drop_push_tokens.sql

BEGIN;

DROP TABLE IF EXISTS push_tokens;

COMMIT;
