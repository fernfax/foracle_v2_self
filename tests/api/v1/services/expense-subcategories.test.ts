import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { expenseCategories, expenseSubcategories } from "@/db/schema";
import {
  SubcategoryNotFoundError,
  createExpenseSubcategory,
  deleteExpenseSubcategory,
  getExpenseSubcategoryById,
  listExpenseSubcategories,
  updateExpenseSubcategory,
} from "@/lib/services/expense-subcategories";
import { seedUser, truncateAll } from "../../../db-helpers";
import type { AuthContext } from "@/lib/auth-context";

// Subcategory rows FK to expense_categories.id — seed a real category row
// so the FK constraint is satisfied.
async function seedCategory(
  ctx: AuthContext,
  opts: { id?: string; name: string } = { name: "Test" }
): Promise<string> {
  const id = opts.id ?? randomUUID();
  await db.insert(expenseCategories).values({
    id,
    userId: ctx.userId,
    name: opts.name,
    isDefault: false,
  });
  return id;
}

beforeEach(async () => {
  await truncateAll();
});

describe("expense-subcategories (real DB)", () => {
  it("scopes by userId — never returns another user's subcategories", async () => {
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
    const catA = await seedCategory(ctxA, { name: "Food-A" });
    const catB = await seedCategory(ctxB, { name: "Food-B" });
    await createExpenseSubcategory(ctxA, { categoryId: catA, name: "Groceries" });
    await createExpenseSubcategory(ctxB, { categoryId: catB, name: "Dining" });

    const aRows = await listExpenseSubcategories(ctxA);
    expect(aRows).toHaveLength(1);
    expect(aRows[0].name).toBe("Groceries");

    const bRows = await listExpenseSubcategories(ctxB);
    expect(bRows).toHaveLength(1);
    expect(bRows[0].name).toBe("Dining");
  });

  it("categoryId filter narrows to that category only", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const catFood = await seedCategory(ctx, { name: "Food" });
    const catHousing = await seedCategory(ctx, { name: "Housing" });
    await createExpenseSubcategory(ctx, { categoryId: catFood, name: "Groceries" });
    await createExpenseSubcategory(ctx, { categoryId: catFood, name: "Dining" });
    await createExpenseSubcategory(ctx, { categoryId: catHousing, name: "Rent" });

    const food = await listExpenseSubcategories(ctx, { categoryId: catFood });
    expect(food).toHaveLength(2);
    expect(food.every((r) => r.categoryId === catFood)).toBe(true);

    const housing = await listExpenseSubcategories(ctx, {
      categoryId: catHousing,
    });
    expect(housing).toHaveLength(1);
  });

  it("update changes the name and returns the patched row", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const catId = await seedCategory(ctx, { name: "Food" });
    const created = await createExpenseSubcategory(ctx, {
      categoryId: catId,
      name: "Groceries",
    });

    const updated = await updateExpenseSubcategory(ctx, created.id, {
      name: "Supermarket",
    });
    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe("Supermarket");
    expect(updated.updatedAt).toBeInstanceOf(Date);
  });

  it("update refuses to touch another user's subcategory", async () => {
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
    const catId = await seedCategory(ctxA, { name: "Food" });
    const created = await createExpenseSubcategory(ctxA, {
      categoryId: catId,
      name: "Groceries",
    });

    await expect(
      updateExpenseSubcategory(ctxB, created.id, { name: "Stolen" })
    ).rejects.toBeInstanceOf(SubcategoryNotFoundError);

    const intact = await getExpenseSubcategoryById(ctxA, created.id);
    expect(intact?.name).toBe("Groceries");
  });

  it("delete removes the row", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const catId = await seedCategory(ctx, { name: "Food" });
    const created = await createExpenseSubcategory(ctx, {
      categoryId: catId,
      name: "Groceries",
    });
    await deleteExpenseSubcategory(ctx, created.id);

    const remaining = await db
      .select()
      .from(expenseSubcategories)
      .where(eq(expenseSubcategories.id, created.id));
    expect(remaining).toHaveLength(0);
  });

  it("delete refuses another user's subcategory", async () => {
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
    const catId = await seedCategory(ctxA, { name: "Food" });
    const created = await createExpenseSubcategory(ctxA, {
      categoryId: catId,
      name: "Groceries",
    });
    await expect(deleteExpenseSubcategory(ctxB, created.id)).rejects.toBeInstanceOf(
      SubcategoryNotFoundError
    );
  });

  it("update throws NotFound when row doesn't exist", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    await expect(
      updateExpenseSubcategory(ctx, "does-not-exist", { name: "x" })
    ).rejects.toBeInstanceOf(SubcategoryNotFoundError);
  });
});
