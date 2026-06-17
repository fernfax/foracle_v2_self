-- Adds family_members.email_invitation_accepted as a discrete boolean.
-- Redundant with status='active' for invited rows, but exposed as its own
-- column so reports/queries don't need to match against the status enum.
--
-- Backfill: rows that were accepted via the invite flow are exactly those
-- with status='active' AND clerk_user_id IS NOT NULL. Self/informational
-- rows have no clerk_user_id (or were never email-invited), so they stay false.

ALTER TABLE "family_members"
  ADD COLUMN IF NOT EXISTS "email_invitation_accepted" boolean NOT NULL DEFAULT false;

UPDATE "family_members"
SET "email_invitation_accepted" = true
WHERE "status" = 'active'
  AND "clerk_user_id" IS NOT NULL;
