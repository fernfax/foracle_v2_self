import { beforeEach, describe, expect, it } from "vitest";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { currentHoldings, expenses } from "@/db/schema";
import { createIncome, listIncomes } from "@/lib/services/incomes";
import {
  checkOnboardingStatus,
  completeOnboarding,
  createOnboardingExpenses,
} from "@/lib/services/onboarding";
import { computeHouseholdSummary } from "@/lib/household-summary";
import type { AuthContext } from "@/lib/auth-context";
import { seedFamilyMember, seedUser, truncateAll } from "./db-helpers";

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding end-to-end (data layer).
//
// The wizard's value is "user enters X → the app shows the right amounts." This
// verifies exactly that WITHOUT a browser or Clerk: we replay the same save
// services the wizard steps call (createIncome, createOnboardingExpenses,
// completeOnboarding) against a real test DB, then feed the persisted rows
// through computeHouseholdSummary — the same pure function /user renders from
// (app/(app)/user/page.tsx). If the saved rows are wrong, the amounts are wrong,
// and this catches it. Reset-and-rerun of the real wizard is covered separately
// by db/manual-migrations/qa/_reset_onboarding.sql; UI/navigation is deferred to
// a future Playwright spec (see the QA plan).
//
// Run: npm run test:db-setup   (one-time)
//      npm run test -- onboarding-flow
// ─────────────────────────────────────────────────────────────────────────────

// incomes_beta has no `frequency` column (beta assumes monthly), so mirror what
// the page does when handing beta rows to computeHouseholdSummary: treat each as
// a monthly stream. Everything else passes through untouched.
async function summaryFor(ctx: AuthContext) {
  const [incomes, expenseRows, holdingRows, members] = await Promise.all([
    listIncomes(ctx),
    db.query.expenses.findMany({ where: eq(expenses.familyId, ctx.familyId) }),
    db.query.currentHoldings.findMany({
      where: eq(currentHoldings.familyId, ctx.familyId),
    }),
    db.query.familyMembers.findMany(),
  ]);

  const incomesForSummary = incomes.map((row) => ({ ...row, frequency: "monthly" }));
  return computeHouseholdSummary(
    incomesForSummary,
    expenseRows,
    holdingRows,
    members.filter((m) => m.familyId === ctx.familyId),
  );
}

async function addHolding(ctx: AuthContext, bankName: string, amount: string) {
  await db.insert(currentHoldings).values({
    id: nanoid(),
    userId: ctx.userId,
    familyId: ctx.familyId,
    bankName,
    holdingAmount: amount,
  });
}

beforeEach(async () => {
  await truncateAll();
});

describe("onboarding flow → household summary (real DB)", () => {
  it("blank slate: complete with no financial data → zeroed summary, onboarded", async () => {
    const ctx = await seedUser({ userId: "u-blank", familyId: "fam-blank", isMaster: true });
    await seedFamilyMember({
      userId: ctx.userId,
      familyId: ctx.familyId,
      name: "Self",
      dateOfBirth: "1990-06-15",
    });

    await completeOnboarding(ctx);

    expect(await checkOnboardingStatus(ctx)).toBe(true);
    const s = await summaryFor(ctx);
    expect(s.grossIncome).toBe(0);
    expect(s.netIncome).toBe(0);
    expect(s.monthlyExpenses).toBe(0);
    expect(s.liquidHoldings).toBe(0);
    expect(s.runwayMonths).toBeNull();
    expect(s.memberCount).toBe(1);
  });

  it("CPF salary + expenses + holdings → amounts match the inputs", async () => {
    const ctx = await seedUser({ userId: "u-core", familyId: "fam-core", isMaster: true });
    const selfId = await seedFamilyMember({
      userId: ctx.userId,
      familyId: ctx.familyId,
      name: "Self",
      dateOfBirth: "1990-06-15", // 30s → CPF applies
    });

    // Income: $6,000/mo salary, subject to CPF, linked to the DOB'd member.
    await createIncome(ctx, {
      name: "Salary",
      category: "employment",
      amount: "6000",
      startDate: "2020-01-01",
      subjectToCpf: true,
      familyMemberId: selfId,
    });

    // Holdings: $20,000 + $5,000 = $25,000 liquid.
    await addHolding(ctx, "DBS", "20000");
    await addHolding(ctx, "POSB", "5000");

    // Expenses: exact per-category amounts → $1,000 + $450 = $1,450/mo.
    await createOnboardingExpenses(ctx, {
      categories: ["Housing", "Food"],
      percentageOfIncome: 0,
      monthlyIncome: 0,
      categoryAmounts: { Housing: "1000", Food: "450" },
    });

    await completeOnboarding(ctx);

    expect(await checkOnboardingStatus(ctx)).toBe(true);

    const s = await summaryFor(ctx);
    expect(s.grossIncome).toBe(6000);
    // CPF was actually applied (derived from the persisted netTakeHome), not just
    // stored raw. Exact rate is intentionally not asserted so a future CPF-rate
    // change doesn't break this test — we assert the relationship instead.
    expect(s.cpfEmployeeTotal).toBeGreaterThan(0);
    expect(s.netIncome).toBe(s.grossIncome - s.cpfEmployeeTotal);
    expect(s.netIncome).toBeLessThan(s.grossIncome);
    expect(s.monthlyExpenses).toBe(1450);
    expect(s.liquidHoldings).toBe(25000);
    expect(s.surplus).toBe(s.netIncome - s.monthlyExpenses);
    expect(s.runwayMonths).toBe(Math.round((25000 / 1450) * 10) / 10);
    expect(s.memberCount).toBe(1);
  });

  it("income with no DOB on the member → CPF stays off (member+DOB policy)", async () => {
    const ctx = await seedUser({ userId: "u-nocpf", familyId: "fam-nocpf", isMaster: true });
    const selfId = await seedFamilyMember({
      userId: ctx.userId,
      familyId: ctx.familyId,
      name: "Self",
      dateOfBirth: null, // no DOB → CPF cannot resolve an age → stays gross
    });

    await createIncome(ctx, {
      name: "Salary",
      category: "employment",
      amount: "6000",
      startDate: "2020-01-01",
      subjectToCpf: true, // requested, but locked off because there's no DOB
      familyMemberId: selfId,
    });
    await completeOnboarding(ctx);

    const s = await summaryFor(ctx);
    expect(s.grossIncome).toBe(6000);
    expect(s.cpfEmployeeTotal).toBe(0);
    expect(s.netIncome).toBe(6000);
  });
});
