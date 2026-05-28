import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { incomesBeta } from "@/db/schema";
import {
  IncomeNotFoundError,
  createIncome,
  deleteIncome,
  getIncomeById,
  listIncomes,
  toggleIncomeActive,
  updateIncome,
} from "@/lib/services/incomes";
import { seedUser, truncateAll } from "../../../db-helpers";

const baseInput = {
  name: "Salary",
  category: "Employment",
  amount: "5000.00",
  startDate: "2026-01-01",
  subjectToCpf: false,
};

beforeEach(async () => {
  await truncateAll();
});

describe("listIncomes (real DB, family-scoped)", () => {
  it("returns all rows for the caller's family", async () => {
    const ctxA1 = await seedUser({
      userId: "user-a1",
      familyId: "fam-a",
      isMaster: true,
    });
    const ctxA2 = await seedUser({
      userId: "user-a2",
      familyId: "fam-a",
    });
    const ctxB = await seedUser({
      userId: "user-b",
      familyId: "fam-b",
      isMaster: true,
    });

    await createIncome(ctxA1, baseInput);
    await createIncome(ctxA2, { ...baseInput, name: "Spouse Salary" });
    await createIncome(ctxB, { ...baseInput, name: "Other Family" });

    // Family A: BOTH members' incomes visible
    const aRows = await listIncomes(ctxA1);
    expect(aRows).toHaveLength(2);
    expect(aRows.every((r) => r.familyId === "fam-a")).toBe(true);
    expect(aRows.map((r) => r.userId).sort()).toEqual(["user-a1", "user-a2"]);

    // Family B: only its own row
    const bRows = await listIncomes(ctxB);
    expect(bRows).toHaveLength(1);
    expect(bRows[0].userId).toBe("user-b");
  });
});

describe("createIncome CPF behavior (real DB)", () => {
  it("auto-fills CPF fields when subjectToCpf is true", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const row = await createIncome(ctx, {
      ...baseInput,
      subjectToCpf: true,
      familyMemberAge: 30,
    });
    expect(row.subjectToCpf).toBe(true);
    expect(row.employeeCpfContribution).not.toBeNull();
    expect(row.employerCpfContribution).not.toBeNull();
    expect(row.netTakeHome).not.toBeNull();
    expect(Number(row.netTakeHome)).toBeLessThan(Number(row.amount));
  });

  it("leaves CPF fields null when subjectToCpf is false", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const row = await createIncome(ctx, baseInput);
    expect(row.subjectToCpf).toBe(false);
    expect(row.employeeCpfContribution).toBeNull();
    expect(row.employerCpfContribution).toBeNull();
    expect(row.netTakeHome).toBeNull();
  });
});

describe("updateIncome (real DB)", () => {
  it("recomputes CPF when subjectToCpf toggles on", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const created = await createIncome(ctx, baseInput);
    expect(created.employeeCpfContribution).toBeNull();

    const updated = await updateIncome(ctx, created.id, {
      subjectToCpf: true,
      familyMemberAge: 30,
    });
    expect(updated.employeeCpfContribution).not.toBeNull();
    expect(updated.netTakeHome).not.toBeNull();
  });

  it("recomputes CPF when amount changes (subjectToCpf stays true)", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const created = await createIncome(ctx, {
      ...baseInput,
      subjectToCpf: true,
      familyMemberAge: 30,
    });
    const firstCpf = Number(created.employeeCpfContribution);

    const updated = await updateIncome(ctx, created.id, {
      amount: "10000.00",
      familyMemberAge: 30,
    });
    const newCpf = Number(updated.employeeCpfContribution);
    expect(newCpf).toBeGreaterThan(firstCpf);
  });

  it("refuses to touch another family's row", async () => {
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
    const created = await createIncome(ctxA, baseInput);

    await expect(
      updateIncome(ctxB, created.id, { amount: "1" })
    ).rejects.toBeInstanceOf(IncomeNotFoundError);

    const intact = await getIncomeById(ctxA, created.id);
    expect(intact?.amount).toBe("5000.00");
  });
});

describe("toggleIncomeActive (real DB)", () => {
  it("flips isActive on each invocation", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const created = await createIncome(ctx, baseInput);
    expect(created.isActive).toBe(true);

    const off = await toggleIncomeActive(ctx, created.id);
    expect(off.isActive).toBe(false);

    const on = await toggleIncomeActive(ctx, created.id);
    expect(on.isActive).toBe(true);
  });

  it("throws NotFound for another family's row", async () => {
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
    const created = await createIncome(ctxA, baseInput);
    await expect(toggleIncomeActive(ctxB, created.id)).rejects.toBeInstanceOf(
      IncomeNotFoundError
    );
  });
});

describe("deleteIncome (real DB)", () => {
  it("removes the row", async () => {
    const ctx = await seedUser({
      userId: "user-a",
      familyId: "fam-a",
      isMaster: true,
    });
    const created = await createIncome(ctx, baseInput);
    await deleteIncome(ctx, created.id);

    const found = await db
      .select()
      .from(incomesBeta)
      .where(eq(incomesBeta.id, created.id));
    expect(found).toHaveLength(0);
  });

  it("throws NotFound for another family's row", async () => {
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
    const created = await createIncome(ctxA, baseInput);
    await expect(deleteIncome(ctxB, created.id)).rejects.toBeInstanceOf(
      IncomeNotFoundError
    );
    expect(await getIncomeById(ctxA, created.id)).not.toBeNull();
  });
});
