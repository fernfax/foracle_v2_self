import { describe, expect, it } from "vitest";
import {
  buildCashflowModel,
  CPF_ID,
  HUB_ID,
  SAVINGS_ID,
  SHORTFALL_ID,
  type CashflowExpenseInput,
  type CashflowIncomeInput,
} from "@/lib/cashflow-sankey";

// Minimal income / expense factories — only the fields the transform reads.
const income = (
  o: Partial<CashflowIncomeInput> & { id: string; name: string; amount: string },
): CashflowIncomeInput => ({
  frequency: "monthly",
  customMonths: null,
  incomeCategory: "current",
  isActive: true,
  netTakeHome: null,
  subjectToCpf: false,
  ...o,
});

const expense = (
  o: Partial<CashflowExpenseInput> & {
    id: string;
    name: string;
    category: string;
    amount: string;
  },
): CashflowExpenseInput => ({
  frequency: "monthly",
  customMonths: null,
  isActive: true,
  ...o,
});

// Sum of values out of the hub minus sum into the hub — should be zero.
function hubBalance(model: ReturnType<typeof buildCashflowModel>): number {
  const into = model.links
    .filter((l) => l.targetId === HUB_ID)
    .reduce((s, l) => s + l.value, 0);
  const outOf = model.links
    .filter((l) => l.sourceId === HUB_ID)
    .reduce((s, l) => s + l.value, 0);
  return Math.round((into - outOf) * 100) / 100;
}

describe("buildCashflowModel", () => {
  it("conserves flow: incomes = CPF + expenses + savings (no shortfall path)", () => {
    const model = buildCashflowModel(
      [income({ id: "i1", name: "Salary", amount: "5000" })],
      [
        expense({ id: "e1", name: "Rent", category: "Housing", amount: "1500" }),
        expense({ id: "e2", name: "Food", category: "Food", amount: "500" }),
      ],
    );

    expect(model.totalGross).toBe(5000);
    expect(model.totalCpf).toBe(0);
    expect(model.totalExpenses).toBe(2000);
    expect(model.savings).toBe(3000);
    expect(model.shortfall).toBe(0);
    // Conservation: every dollar in the hub is accounted for.
    expect(hubBalance(model)).toBe(0);

    // Savings node is present, shortfall is not.
    expect(model.outflowNodes.some((n) => n.id === SAVINGS_ID)).toBe(true);
    expect(model.incomeNodes.some((n) => n.id === SHORTFALL_ID)).toBe(false);
  });

  it("derives employee CPF from gross − netTakeHome and routes it as its own outflow", () => {
    const model = buildCashflowModel(
      [
        income({
          id: "i1",
          name: "Salary",
          amount: "5000",
          subjectToCpf: true,
          netTakeHome: "4000",
        }),
      ],
      [expense({ id: "e1", name: "Rent", category: "Housing", amount: "1500" })],
    );

    expect(model.totalCpf).toBe(1000); // 5000 − 4000
    const cpfNode = model.outflowNodes.find((n) => n.id === CPF_ID);
    expect(cpfNode?.value).toBe(1000);
    // Income node carries the gross/net/cpf breakdown for tooltip use.
    const inc = model.incomeNodes.find((n) => n.id === "i1");
    expect(inc?.meta).toMatchObject({ gross: 5000, cpf: 1000, net: 4000 });
    // Still balanced.
    expect(hubBalance(model)).toBe(0);
  });

  it("normalizes frequency: yearly → /12, one-time drops out", () => {
    const model = buildCashflowModel(
      [income({ id: "i1", name: "Bonus", amount: "12000", frequency: "yearly" })],
      [
        // One-time normalizes to 0 — should be excluded from categories entirely.
        expense({
          id: "e1",
          name: "TV",
          category: "Electronics",
          amount: "2000",
          frequency: "one-time",
        }),
        expense({
          id: "e2",
          name: "Insurance",
          category: "Insurance",
          amount: "1200",
          frequency: "yearly",
        }),
      ],
    );

    expect(model.totalGross).toBe(1000); // 12000 / 12
    expect(model.totalExpenses).toBe(100); // 1200 / 12, TV excluded
    expect(model.categories.map((c) => c.name)).toEqual(["Insurance"]);
    expect(model.savings).toBe(900);
  });

  it("emits a Shortfall inflow node (not negative savings) when overspending", () => {
    const model = buildCashflowModel(
      [income({ id: "i1", name: "Salary", amount: "1000" })],
      [expense({ id: "e1", name: "Rent", category: "Housing", amount: "1500" })],
    );

    expect(model.savings).toBe(0);
    expect(model.shortfall).toBe(500);
    // Shortfall participates as a top-layer source so the diagram balances.
    expect(model.incomeNodes.some((n) => n.id === SHORTFALL_ID)).toBe(true);
    expect(model.outflowNodes.some((n) => n.id === SAVINGS_ID)).toBe(false);
    expect(hubBalance(model)).toBe(0);
  });

  it("groups expenses by category and keeps items for drill-down, sorted desc", () => {
    const model = buildCashflowModel(
      [income({ id: "i1", name: "Salary", amount: "5000" })],
      [
        expense({ id: "e1", name: "Rent", category: "Housing", amount: "1200" }),
        expense({ id: "e2", name: "Reno loan", category: "Housing", amount: "300" }),
        expense({ id: "e3", name: "Groceries", category: "Food", amount: "400" }),
      ],
    );

    expect(model.categories).toHaveLength(2);
    // Housing (1500) > Food (400).
    expect(model.categories[0].name).toBe("Housing");
    expect(model.categories[0].value).toBe(1500);
    expect(model.categories[0].items.map((i) => i.name)).toEqual(["Rent", "Reno loan"]);
    expect(model.categories[1].name).toBe("Food");
  });

  it("excludes past / future / inactive incomes from this month's cashflow", () => {
    const model = buildCashflowModel(
      [
        income({ id: "i1", name: "Current job", amount: "5000" }),
        income({
          id: "i2",
          name: "Old job",
          amount: "9999",
          incomeCategory: "past",
        }),
        income({
          id: "i3",
          name: "Future promotion",
          amount: "9999",
          incomeCategory: "future-recurring",
        }),
        income({ id: "i4", name: "Paused", amount: "9999", isActive: false }),
      ],
      [],
    );

    expect(model.totalGross).toBe(5000);
    expect(model.incomeNodes.map((n) => n.id)).toEqual(["i1"]);
  });
});
