import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { expenseCategories, expenses } from "@/db/schema";
import {
  createExpenseCategory,
  listExpenseCategories,
} from "@/lib/services/expense-categories";
import { seedUser, truncateAll } from "../../../db-helpers";

const DEFAULT_CATEGORIES = [
  "Housing",
  "Food",
  "Transportation",
  "Utilities",
  "Healthcare",
  "Insurance",
  "Children",
  "Entertainment",
  "Allowances",
  "Vehicle",
  "Shopping",
];

beforeEach(async () => {
  await truncateAll();
});

describe("expense-categories (real DB)", () => {
  it("scopes by userId — never returns another user's categories", async () => {
    const ctxA = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const ctxB = await seedUser({
      userId: "user-b",
      familyId: "fam-b",
      isMaster: true,
    });
    await createExpenseCategory(ctxA, "OnlyA");
    await createExpenseCategory(ctxB, "OnlyB");

    const aNames = (await listExpenseCategories(ctxA)).map((c) => c.name);
    const bNames = (await listExpenseCategories(ctxB)).map((c) => c.name);
    expect(aNames).toContain("OnlyA");
    expect(aNames).not.toContain("OnlyB");
    expect(bNames).toContain("OnlyB");
    expect(bNames).not.toContain("OnlyA");
  });

  it("auto-seeds DEFAULT_CATEGORIES on first list call when empty", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    expect(
      await db
        .select()
        .from(expenseCategories)
        .where(eq(expenseCategories.userId, ctx.userId))
    ).toHaveLength(0);

    const rows = await listExpenseCategories(ctx);
    expect(rows.length).toBeGreaterThanOrEqual(DEFAULT_CATEGORIES.length);
    const names = rows.map((r) => r.name).sort();
    expect(names).toEqual(expect.arrayContaining(DEFAULT_CATEGORIES));
    // All seeded categories should be marked default
    const seeded = rows.filter((r) => DEFAULT_CATEGORIES.includes(r.name));
    expect(seeded.every((r) => r.isDefault === true)).toBe(true);
  });

  it("second list call is idempotent — does not re-seed defaults", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const first = await listExpenseCategories(ctx);
    const second = await listExpenseCategories(ctx);
    expect(second.length).toBe(first.length);
  });

  it("auto-heals: backfills categories present in expenses table but missing from expense_categories", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    // Seed the defaults first (triggers the seed path).
    await listExpenseCategories(ctx);

    // Now insert an `expenses` row with a category name that isn't in the
    // categories table (a hand-edit or import scenario).
    await db.insert(expenses).values({
      id: randomUUID(),
      userId: ctx.userId,
      familyId: ctx.familyId,
      name: "Pet grooming",
      category: "Pets",
      amount: "50.00",
      frequency: "monthly",
      isActive: true,
    });

    const rows = await listExpenseCategories(ctx);
    const pets = rows.find((r) => r.name === "Pets");
    expect(pets).toBeDefined();
    expect(pets?.trackedInBudget).toBe(true);
    expect(pets?.isDefault).toBe(false);
  });

  it("createExpenseCategory persists a non-default category", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const row = await createExpenseCategory(ctx, "Subscriptions");
    expect(row.name).toBe("Subscriptions");
    expect(row.isDefault).toBe(false);

    const fromDb = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.id, row.id));
    expect(fromDb).toHaveLength(1);
  });

  // --- Reproduction of the prod "duplicate categories" bug ------------------
  // expense_categories has NO unique constraint on (familyId, name). listExpense-
  // Categories is a side-effecting read (seeds + backfills) called concurrently
  // by the web budget page (lib/actions/expense-categories.ts) AND /api/v1/expense
  // -categories (native app). Two separate processes racing the non-atomic
  // seed/backfill double-insert the same name — the trigger being asset-linked
  // categories "Housing" (property-assets.ts:56) and "Vehicle" (vehicle-assets.ts:56)
  // landing in the backfill path. (In-process Promise.all can't reproduce two
  // processes, so we assert on the OUTCOME the race produces.)
  //
  // Here we seed the duplicate ROWS the prod race created, then assert the picker
  // (listExpenseCategories) never surfaces a name twice — matching the screenshot
  // where Housing / Transportation / Vehicle each appear ×2.
  it("listExpenseCategories never returns a category name twice (repro: prod dup picker)", async () => {
    const ctx = await seedUser({ userId: "user-a", familyId: "fam-a", isMaster: true });
    await listExpenseCategories(ctx); // seed the defaults once

    // The concurrent backfill produced a second Housing/Vehicle/Transportation row.
    for (const name of ["Housing", "Vehicle", "Transportation"]) {
      await db.insert(expenseCategories).values({
        id: randomUUID(),
        userId: ctx.userId,
        familyId: ctx.familyId,
        name,
        isDefault: false,
        trackedInBudget: true,
      });
    }

    const names = (await listExpenseCategories(ctx)).map((c) => c.name);
    const dups = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
    expect(dups, `category picker shows duplicates: ${dups.join(", ")}`).toEqual([]);
  });
});
