import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { budgetShifts, dailyExpenses, expenseCategories, expenses } from "@/db/schema";
import { getBudgetForMonth } from "@/lib/services/budget";
import type { AuthContext } from "@/lib/auth-context";
import { seedUser, truncateAll } from "../../../db-helpers";

const YEAR = 2026;
const MONTH = 5;

async function seedCategory(ctx: AuthContext, name: string, icon: string | null = null) {
  const id = randomUUID();
  await db.insert(expenseCategories).values({
    id,
    userId: ctx.userId,
    name,
    isDefault: false,
    trackedInBudget: true,
    icon,
  });
  return id;
}

async function seedRecurringExpense(
  ctx: AuthContext,
  opts: {
    name: string;
    category: string;
    amount: string;
    frequency?: string;
    isActive?: boolean;
    trackedInBudget?: boolean;
    startDate?: string;
  }
) {
  await db.insert(expenses).values({
    id: randomUUID(),
    userId: ctx.userId,
    familyId: ctx.familyId,
    name: opts.name,
    category: opts.category,
    amount: opts.amount,
    frequency: opts.frequency ?? "monthly",
    isActive: opts.isActive ?? true,
    trackedInBudget: opts.trackedInBudget ?? true,
    startDate: opts.startDate ?? null,
  });
}

async function seedDaily(
  ctx: AuthContext,
  opts: { categoryName: string; amount: string; date: string }
) {
  await db.insert(dailyExpenses).values({
    id: randomUUID(),
    userId: ctx.userId,
    familyId: ctx.familyId,
    categoryName: opts.categoryName,
    amount: opts.amount,
    date: opts.date,
  });
}

async function seedShift(
  ctx: AuthContext,
  opts: { from: string; to: string; amount: string }
) {
  await db.insert(budgetShifts).values({
    id: randomUUID(),
    userId: ctx.userId,
    familyId: ctx.familyId,
    year: YEAR,
    month: MONTH,
    fromCategoryName: opts.from,
    toCategoryName: opts.to,
    amount: opts.amount,
  });
}

beforeEach(async () => {
  await truncateAll();
});

describe("getBudgetForMonth (real DB)", () => {
  it("rolls up tracked recurring expenses into per-category budgets and totals", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    await seedCategory(ctx, "Food");
    await seedCategory(ctx, "Transport");
    await seedRecurringExpense(ctx, { name: "Groceries", category: "Food", amount: "600.00" });
    await seedRecurringExpense(ctx, { name: "Bus", category: "Transport", amount: "100.00" });

    const { summary, categories } = await getBudgetForMonth(ctx, YEAR, MONTH);
    expect(summary.totalBudget).toBe(700);
    const food = categories.find((c) => c.categoryName === "Food");
    expect(food?.monthlyBudget).toBe(600);
  });

  it("excludes untracked + inactive expenses from the budget total", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    await seedCategory(ctx, "Food");
    await seedRecurringExpense(ctx, { name: "Groceries", category: "Food", amount: "600.00" });
    await seedRecurringExpense(ctx, {
      name: "Untracked",
      category: "Food",
      amount: "200.00",
      trackedInBudget: false,
    });
    await seedRecurringExpense(ctx, {
      name: "Inactive",
      category: "Food",
      amount: "300.00",
      isActive: false,
    });

    const { summary, categories } = await getBudgetForMonth(ctx, YEAR, MONTH);
    expect(summary.totalBudget).toBe(600);
    expect(categories.find((c) => c.categoryName === "Food")?.monthlyBudget).toBe(600);
  });

  it("includes one-time expenses only when their start date falls in the queried month", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    await seedCategory(ctx, "Shopping");
    await seedRecurringExpense(ctx, {
      name: "May purchase",
      category: "Shopping",
      amount: "500.00",
      frequency: "one-time",
      startDate: "2026-05-10",
    });
    await seedRecurringExpense(ctx, {
      name: "April purchase",
      category: "Shopping",
      amount: "9999.00",
      frequency: "one-time",
      startDate: "2026-04-10",
    });

    const may = await getBudgetForMonth(ctx, YEAR, MONTH);
    expect(may.summary.totalBudget).toBe(500);
    const april = await getBudgetForMonth(ctx, YEAR, 4);
    expect(april.summary.totalBudget).toBe(9999);
  });

  it("attributes daily-expense spending only to tracked categories and computes remaining/pacing", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    await seedCategory(ctx, "Food");
    await seedRecurringExpense(ctx, { name: "Groceries", category: "Food", amount: "600.00" });
    await seedDaily(ctx, { categoryName: "Food", amount: "240.00", date: "2026-05-10" });
    await seedDaily(ctx, { categoryName: "Food", amount: "60.00", date: "2026-05-20" });
    // Untracked category spending should NOT count toward totalSpent
    await seedDaily(ctx, {
      categoryName: "Mystery Category",
      amount: "100.00",
      date: "2026-05-15",
    });

    const { summary, categories } = await getBudgetForMonth(ctx, YEAR, MONTH);
    expect(summary.totalBudget).toBe(600);
    expect(summary.totalSpent).toBe(300);
    expect(summary.remaining).toBe(300);
    const food = categories.find((c) => c.categoryName === "Food");
    expect(food?.spent).toBe(300);
    expect(food?.remaining).toBe(300);
  });

  it("applies budget shifts: source goes down, destination goes up", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    await seedCategory(ctx, "Food");
    await seedCategory(ctx, "Entertainment");
    await seedRecurringExpense(ctx, { name: "Groceries", category: "Food", amount: "600.00" });
    await seedRecurringExpense(ctx, {
      name: "Streaming",
      category: "Entertainment",
      amount: "50.00",
    });
    await seedShift(ctx, { from: "Food", to: "Entertainment", amount: "100.00" });

    const { categories } = await getBudgetForMonth(ctx, YEAR, MONTH);
    const food = categories.find((c) => c.categoryName === "Food");
    const ent = categories.find((c) => c.categoryName === "Entertainment");
    expect(food?.monthlyBudget).toBe(500);
    expect(ent?.monthlyBudget).toBe(150);
  });

  it("scopes by userId — never bleeds budget data across users", async () => {
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
    await seedCategory(ctxA, "Food");
    await seedRecurringExpense(ctxA, { name: "A", category: "Food", amount: "100.00" });
    await seedCategory(ctxB, "Food");
    await seedRecurringExpense(ctxB, { name: "B", category: "Food", amount: "9999.00" });

    const a = await getBudgetForMonth(ctxA, YEAR, MONTH);
    expect(a.summary.totalBudget).toBe(100);

    const b = await getBudgetForMonth(ctxB, YEAR, MONTH);
    expect(b.summary.totalBudget).toBe(9999);
  });
});
