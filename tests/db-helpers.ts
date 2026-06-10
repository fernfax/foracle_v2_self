import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { families, users, familyMembers } from "@/db/schema";
import type { AuthContext } from "@/lib/auth-context";

// Safety guard: every destructive helper re-verifies the connection points
// at a DB whose name contains "test". This is belt-and-suspenders alongside
// the vitest.config.ts URL derivation — we never want to TRUNCATE dev data.
function assertTestDb(): void {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("test")) {
    throw new Error(
      `Refusing to mutate non-test DB. DATABASE_URL must contain "test"; got ${url}`
    );
  }
}

// Introspects all public tables and truncates them with CASCADE. Drizzle's
// internal `__drizzle_migrations` table is preserved so schema state survives.
export async function truncateAll(): Promise<void> {
  assertTestDb();
  const rows = (await db.execute(sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '\\_drizzle%'
      AND table_name NOT LIKE '\\_\\_drizzle%'
  `)) as unknown as Array<{ table_name: string }>;

  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.table_name}"`).join(", ");
  await db.execute(sql.raw(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`));
}

// Inserts a family + user pair, optionally promoting the user to family master.
// Returns an AuthContext ready to pass to service functions.
export async function seedUser(opts: {
  userId: string;
  familyId: string;
  email?: string;
  isMaster?: boolean;
}): Promise<AuthContext> {
  assertTestDb();

  // families.master_user_id has a FK to users.id, so insert the family with
  // a null master first, then create the user, then promote if requested.
  await db
    .insert(families)
    .values({ id: opts.familyId, masterUserId: null })
    .onConflictDoNothing();

  await db
    .insert(users)
    .values({
      id: opts.userId,
      email: opts.email ?? `${opts.userId}@test.local`,
      familyId: opts.familyId,
    })
    .onConflictDoNothing();

  if (opts.isMaster) {
    await db
      .update(families)
      .set({ masterUserId: opts.userId })
      .where(sql`${families.id} = ${opts.familyId}`);
  }

  return {
    userId: opts.userId,
    familyId: opts.familyId,
    isMaster: !!opts.isMaster,
  };
}

// Inserts a family member (the CPF member+DOB policy needs a linked member with
// a date of birth for CPF to compute). Returns the member id. Pass
// dateOfBirth: null to model a pending/DOB-less member (CPF stays off).
export async function seedFamilyMember(opts: {
  id?: string;
  userId: string;
  familyId: string;
  name?: string;
  dateOfBirth?: string | null;
  isContributing?: boolean;
}): Promise<string> {
  assertTestDb();
  const id = opts.id ?? nanoid();
  await db
    .insert(familyMembers)
    .values({
      id,
      userId: opts.userId,
      familyId: opts.familyId,
      name: opts.name ?? "Member",
      status: "active",
      dateOfBirth: opts.dateOfBirth ?? null,
      isContributing: opts.isContributing ?? true,
    })
    .onConflictDoNothing();
  return id;
}
