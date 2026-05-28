import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyExpenses } from "@/db/schema";
import {
  DailyExpenseNotFoundError,
  createDailyExpense,
  deleteDailyExpense,
  getDailyExpenseById,
  listDailyExpenses,
  updateDailyExpense,
} from "@/lib/services/daily-expenses";
import { seedUser, truncateAll } from "../../../db-helpers";

const VALID_UUID = "11111111-1111-4111-8111-111111111111";
const VALID_UUID_2 = "22222222-2222-4222-8222-222222222222";

beforeEach(async () => {
  await truncateAll();
});

describe("listDailyExpenses (real DB)", () => {
  it("scopes by userId — never returns rows from another user", async () => {
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

    await createDailyExpense(ctxA, {
      categoryName: "Food",
      amount: "10.00",
      date: "2026-05-15",
    });
    await createDailyExpense(ctxB, {
      categoryName: "Food",
      amount: "10.00",
      date: "2026-05-15",
    });
    await createDailyExpense(ctxB, {
      categoryName: "Transport",
      amount: "5.00",
      date: "2026-05-16",
    });

    const aRows = await listDailyExpenses(ctxA, {
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });
    expect(aRows).toHaveLength(1);
    expect(aRows[0].userId).toBe("user-a");

    const bRows = await listDailyExpenses(ctxB, {
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });
    expect(bRows).toHaveLength(2);
    expect(bRows.every((r) => r.userId === "user-b")).toBe(true);
  });

  it("filters by date range inclusively", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    await createDailyExpense(ctx, {
      categoryName: "Food",
      amount: "5",
      date: "2026-04-30",
    });
    await createDailyExpense(ctx, {
      categoryName: "Food",
      amount: "5",
      date: "2026-05-01",
    });
    await createDailyExpense(ctx, {
      categoryName: "Food",
      amount: "5",
      date: "2026-05-31",
    });
    await createDailyExpense(ctx, {
      categoryName: "Food",
      amount: "5",
      date: "2026-06-01",
    });

    const rows = await listDailyExpenses(ctx, {
      startDate: "2026-05-01",
      endDate: "2026-05-31",
    });
    expect(rows).toHaveLength(2);
  });
});

describe("createDailyExpense (real DB)", () => {
  it("persists with familyId backfilled from AuthContext", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const result = await createDailyExpense(ctx, {
      categoryName: "Food",
      amount: "10.00",
      date: "2026-05-15",
    });
    expect(result.status).toBe("created");
    expect(result.row.familyId).toBe("fam-a");
    expect(result.row.userId).toBe("user-a");

    const fromDb = await db.query.dailyExpenses.findFirst({
      where: eq(dailyExpenses.id, result.row.id),
    });
    expect(fromDb?.familyId).toBe("fam-a");
  });

  it("returns conflict (not duplicate) when same id is replayed by same user", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const first = await createDailyExpense(ctx, {
      id: VALID_UUID,
      categoryName: "Food",
      amount: "10.00",
      date: "2026-05-15",
    });
    expect(first.status).toBe("created");

    const replay = await createDailyExpense(ctx, {
      id: VALID_UUID,
      categoryName: "DIFFERENT",
      amount: "999.99",
      date: "2026-05-15",
    });
    expect(replay.status).toBe("conflict");
    expect(replay.row.id).toBe(VALID_UUID);
    expect(replay.row.amount).toBe("10.00");

    const all = await db
      .select()
      .from(dailyExpenses)
      .where(and(eq(dailyExpenses.id, VALID_UUID), eq(dailyExpenses.userId, "user-a")));
    expect(all).toHaveLength(1);
  });

  it("throws on cross-user id collision", async () => {
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
    await createDailyExpense(ctxA, {
      id: VALID_UUID,
      categoryName: "Food",
      amount: "10",
      date: "2026-05-15",
    });
    await expect(
      createDailyExpense(ctxB, {
        id: VALID_UUID,
        categoryName: "Food",
        amount: "10",
        date: "2026-05-15",
      })
    ).rejects.toThrow(/collision/);
  });
});

describe("updateDailyExpense + deleteDailyExpense (real DB)", () => {
  it("update changes the row and bumps updatedAt", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const created = await createDailyExpense(ctx, {
      id: VALID_UUID,
      categoryName: "Food",
      amount: "10.00",
      date: "2026-05-15",
    });
    const before = created.row.updatedAt;

    const updated = await updateDailyExpense(ctx, VALID_UUID, {
      amount: "25.50",
      note: "lunch",
    });
    expect(updated.amount).toBe("25.50");
    expect(updated.note).toBe("lunch");
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("update throws DailyExpenseNotFoundError when row doesn't exist", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    await expect(
      updateDailyExpense(ctx, VALID_UUID_2, { amount: "1" })
    ).rejects.toBeInstanceOf(DailyExpenseNotFoundError);
  });

  it("update refuses to touch another user's row (scoping)", async () => {
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
    await createDailyExpense(ctxA, {
      id: VALID_UUID,
      categoryName: "Food",
      amount: "10",
      date: "2026-05-15",
    });
    await expect(
      updateDailyExpense(ctxB, VALID_UUID, { amount: "99" })
    ).rejects.toBeInstanceOf(DailyExpenseNotFoundError);

    const stillIntact = await getDailyExpenseById(ctxA, VALID_UUID);
    expect(stillIntact?.amount).toBe("10.00");
  });

  it("delete removes the row", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    await createDailyExpense(ctx, {
      id: VALID_UUID,
      categoryName: "Food",
      amount: "10",
      date: "2026-05-15",
    });
    await deleteDailyExpense(ctx, VALID_UUID);
    expect(await getDailyExpenseById(ctx, VALID_UUID)).toBeNull();
  });

  it("delete throws NotFound for another user's row", async () => {
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
    await createDailyExpense(ctxA, {
      id: VALID_UUID,
      categoryName: "Food",
      amount: "10",
      date: "2026-05-15",
    });
    await expect(deleteDailyExpense(ctxB, VALID_UUID)).rejects.toBeInstanceOf(
      DailyExpenseNotFoundError
    );
    expect(await getDailyExpenseById(ctxA, VALID_UUID)).not.toBeNull();
  });
});
