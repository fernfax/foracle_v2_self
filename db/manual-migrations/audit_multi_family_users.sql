-- ─── Audit: detect users tangled across multiple families ────────────────────
-- Read-only. Run before any cleanup.
--
-- Run via:
--   psql "$PROD_DB" -f db/manual-migrations/audit_multi_family_users.sql
--
-- The invariant we want:
--   For every user U:
--     U.family_id  ==  the family_id of every family_members row where
--                      family_members.clerk_user_id = U.id
--
-- Anything that violates this means the user is "in multiple families" and
-- needs reconciling. The two queries below find the two ways this can break.

\echo
\echo === Q1: users.family_id ≠ their clerk-linked family_members.family_id ===
\echo (these users' "home" family per users.family_id doesnt match the family
\echo  they appear in as a member; arbitrary which side is canonical)
\echo

SELECT
  u.id                                                   AS user_id,
  u.email                                                AS email,
  u.family_id                                            AS users_family_id,
  fm.family_id                                           AS member_family_id,
  fm.id                                                  AS family_member_row_id,
  fm.status                                              AS member_status,
  fm.relationship                                        AS relationship,
  fm.created_at                                          AS member_row_created
FROM users u
JOIN family_members fm
  ON fm.clerk_user_id = u.id
WHERE fm.family_id <> u.family_id
ORDER BY u.email, fm.created_at;

\echo
\echo === Q2: same clerk_user_id appearing in multiple family_members rows ===
\echo (the partial unique index added in runbook_family_id_full.sql should make
\echo  this impossible going forward, but legacy data may still violate it)
\echo

SELECT
  fm.clerk_user_id,
  u.email,
  count(*)                                               AS rows,
  array_agg(fm.family_id ORDER BY fm.created_at)         AS family_ids,
  array_agg(fm.id ORDER BY fm.created_at)                AS family_member_row_ids,
  array_agg(fm.status ORDER BY fm.created_at)            AS statuses,
  array_agg(fm.created_at ORDER BY fm.created_at)        AS created_ats
FROM family_members fm
JOIN users u ON u.id = fm.clerk_user_id
WHERE fm.clerk_user_id IS NOT NULL
GROUP BY fm.clerk_user_id, u.email
HAVING count(*) > 1
ORDER BY count(*) DESC, u.email;

\echo
\echo === Q3: orphan pending invitations targeting emails of existing users ===
\echo (pending family_members rows where the invitedEmail already belongs to a
\echo  signed-up users row — these never resolve cleanly when the invitee
\echo  clicks the link, because Clerk reuses their existing account)
\echo

SELECT
  fm.id                          AS family_member_row_id,
  fm.family_id                   AS pending_in_family,
  fm.invited_email,
  fm.status                      AS member_status,
  fm.created_at                  AS invited_at,
  u.id                           AS existing_user_id,
  u.family_id                    AS existing_user_family,
  u.created_at                   AS existing_user_signed_up
FROM family_members fm
JOIN users u ON lower(u.email) = lower(fm.invited_email)
WHERE fm.status = 'pending'
  AND fm.invited_email IS NOT NULL
ORDER BY fm.created_at;

\echo
\echo === Q4: per-user data footprint by family ===
\echo (helps decide which family to keep when reconciling — the one with the
\echo  most user-created rows is usually the right "home". Re-run scoped to a
\echo  specific email after Q1/Q2 surface candidates.)
\echo

-- Replace 'USER_EMAIL_HERE' with an affected email and uncomment to inspect.
-- SELECT
--   'incomes'           AS tbl, family_id, count(*) FROM incomes              WHERE user_id = (SELECT id FROM users WHERE email = 'USER_EMAIL_HERE') GROUP BY family_id
-- UNION ALL SELECT 'expenses',           family_id, count(*) FROM expenses               WHERE user_id = (SELECT id FROM users WHERE email = 'USER_EMAIL_HERE') GROUP BY family_id
-- UNION ALL SELECT 'daily_expenses',     family_id, count(*) FROM daily_expenses         WHERE user_id = (SELECT id FROM users WHERE email = 'USER_EMAIL_HERE') GROUP BY family_id
-- UNION ALL SELECT 'policies',           family_id, count(*) FROM policies               WHERE user_id = (SELECT id FROM users WHERE email = 'USER_EMAIL_HERE') GROUP BY family_id
-- UNION ALL SELECT 'goals',              family_id, count(*) FROM goals                  WHERE user_id = (SELECT id FROM users WHERE email = 'USER_EMAIL_HERE') GROUP BY family_id
-- UNION ALL SELECT 'current_holdings',   family_id, count(*) FROM current_holdings       WHERE user_id = (SELECT id FROM users WHERE email = 'USER_EMAIL_HERE') GROUP BY family_id
-- UNION ALL SELECT 'property_assets',    family_id, count(*) FROM property_assets        WHERE user_id = (SELECT id FROM users WHERE email = 'USER_EMAIL_HERE') GROUP BY family_id
-- UNION ALL SELECT 'vehicle_assets',     family_id, count(*) FROM vehicle_assets         WHERE user_id = (SELECT id FROM users WHERE email = 'USER_EMAIL_HERE') GROUP BY family_id
-- ORDER BY tbl, family_id;
