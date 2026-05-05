# Manual migrations

Hand-authored SQL migrations that go beyond what `drizzle-kit push` can do —
specifically: data backfills, FK cascade swaps, and multi-step constraint
tightening that the schema-diff approach can't express.

The Drizzle output dir (`/drizzle`) is gitignored, so we keep these alongside
`db/schema.ts` instead.

## How `db:push` interacts with these

`drizzle-kit push` does a schema-state diff. It will:

- pick up additive changes (new tables, new nullable columns) automatically
- skip data moves entirely

So when we ship a feature that needs both (e.g. add a column AND backfill it
AND make it NOT NULL), `db:push` covers the schema; the SQL files here cover
the rest. Run them via `psql $DATABASE_URL -f db/manual-migrations/<file>.sql`.

## Family ID rollout

Three-step migration. Run in order, gated on application code:

| File | Run when | What it does | Revertible? |
| --- | --- | --- | --- |
| `0003_family_id_additive.sql` | Before merging the schema-only PR | Adds `families` table, nullable `family_id` everywhere, `family_members` invite-flow fields | Yes — drop the new columns/table |
| `0004_family_id_backfill.sql` | After 0003 deployed and app is writing both `userId` and `familyId` on inserts | Creates a family-of-1 per user, backfills `family_id` everywhere, links the auto-created Self row to its Clerk user | No (data migration) |
| `0005_family_id_lockdown.sql` | After 0004 succeeded AND app reads/writes by `familyId` everywhere | NOT NULL `family_id`, swap cascade FKs from `users` to `families`, demote `user_id` to SET NULL | No |

Run only after verifying the previous step on a staging clone. Each migration
ends with assertions that fail loudly if the state is inconsistent.

## Pre-flight check

Before each step, verify nothing is mid-migration by counting NULLs on
`family_id`:

```sql
SELECT 'users' AS tbl, count(*) AS nulls FROM users WHERE family_id IS NULL
UNION ALL SELECT 'family_members', count(*) FROM family_members WHERE family_id IS NULL
-- ... etc
;
```
