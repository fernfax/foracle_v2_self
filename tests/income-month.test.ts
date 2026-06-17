import { describe, expect, it } from "vitest"

import {
  buildCashflowModel,
  type CashflowIncomeInput
} from "@/lib/cashflow-sankey"
import {
  bonusDollarsForYear,
  bonusForMonth,
  grossForMonth,
  isMonthInIncomeWindow,
  type MonthAmountIncome
} from "@/lib/income-month"

// A plain monthly beta income (no milestones, no bonus) starting Jan 2026.
function income(overrides: Partial<MonthAmountIncome> = {}): MonthAmountIncome {
  return {
    amount: "5000",
    frequency: "monthly",
    customMonths: null,
    startDate: "2026-01-01",
    endDate: null,
    isActive: true,
    futureMilestones: null,
    accountForFutureChange: false,
    accountForBonus: false,
    bonusGroups: null,
    ...overrides
  }
}

const raise = JSON.stringify([
  { id: "r", targetMonth: "2026-06", amount: 7000 }
])
const tempDip = JSON.stringify([
  { id: "d", targetMonth: "2026-06", endMonth: "2026-08", amount: 3000 }
])

describe("isMonthInIncomeWindow", () => {
  it("excludes months before start and after end", () => {
    const inc = income({ startDate: "2026-03-01", endDate: "2026-09-30" })
    expect(isMonthInIncomeWindow(inc, "2026-02")).toBe(false)
    expect(isMonthInIncomeWindow(inc, "2026-03")).toBe(true)
    expect(isMonthInIncomeWindow(inc, "2026-09")).toBe(true)
    expect(isMonthInIncomeWindow(inc, "2026-10")).toBe(false)
  })
})

describe("grossForMonth", () => {
  it("returns the monthly base inside the window", () => {
    expect(grossForMonth(income(), "2026-05")).toBe(5000)
  })

  it("is 0 outside the income window", () => {
    expect(grossForMonth(income({ startDate: "2026-06-01" }), "2026-05")).toBe(
      0
    )
  })

  it("is 0 when inactive", () => {
    expect(grossForMonth(income({ isActive: false }), "2026-05")).toBe(0)
  })

  it("applies a permanent raise from its month onward", () => {
    const inc = income({
      accountForFutureChange: true,
      futureMilestones: raise
    })
    expect(grossForMonth(inc, "2026-05")).toBe(5000) // before
    expect(grossForMonth(inc, "2026-06")).toBe(7000) // at
    expect(grossForMonth(inc, "2027-01")).toBe(7000) // after
  })

  it("applies a temporary dip only within its window", () => {
    const inc = income({
      accountForFutureChange: true,
      futureMilestones: tempDip
    })
    expect(grossForMonth(inc, "2026-05")).toBe(5000) // before
    expect(grossForMonth(inc, "2026-07")).toBe(3000) // inside
    expect(grossForMonth(inc, "2026-09")).toBe(5000) // reverts
  })

  it("ignores milestones when accountForFutureChange is off", () => {
    const inc = income({
      accountForFutureChange: false,
      futureMilestones: raise
    })
    expect(grossForMonth(inc, "2026-12")).toBe(5000)
  })
})

describe("bonusForMonth", () => {
  const decBonus = JSON.stringify([{ month: 12, amount: "2" }]) // 2x in December

  it("pays multiplier × effective monthly in the bonus month, 0 otherwise", () => {
    const inc = income({ accountForBonus: true, bonusGroups: decBonus })
    expect(bonusForMonth(inc, "2026-11")).toBe(0)
    expect(bonusForMonth(inc, "2026-12")).toBe(10000) // 5000 × 2
  })

  it("scales off the milestone-raised base", () => {
    const inc = income({
      accountForBonus: true,
      bonusGroups: decBonus,
      accountForFutureChange: true,
      futureMilestones: raise // 7000 from Jun 2026
    })
    expect(bonusForMonth(inc, "2026-12")).toBe(14000) // 7000 × 2
  })

  it("is 0 when accountForBonus is off", () => {
    const inc = income({ accountForBonus: false, bonusGroups: decBonus })
    expect(bonusForMonth(inc, "2026-12")).toBe(0)
  })
})

describe("Sankey ⇄ Timeline Studio agreement", () => {
  // Build a Sankey income input mirroring a beta row.
  function sankeyIncome(
    overrides: Partial<CashflowIncomeInput> = {}
  ): CashflowIncomeInput {
    return {
      id: "inc1",
      name: "Salary",
      amount: "5000",
      frequency: "monthly",
      customMonths: null,
      incomeCategory: "current",
      isActive: true,
      netTakeHome: "5000", // no CPF for simplicity
      subjectToCpf: false,
      startDate: "2026-01-01",
      endDate: null,
      futureMilestones: null,
      accountForFutureChange: false,
      accountForBonus: false,
      bonusGroups: null,
      ...overrides
    }
  }

  it("the base income node equals grossForMonth for the target month", () => {
    const inc = sankeyIncome({
      accountForFutureChange: true,
      futureMilestones: raise
    })
    const model = buildCashflowModel([inc], [], { year: 2026, month: 7 })
    const node = model.incomeNodes.find((n) => n.id === "inc1")
    expect(node?.value).toBe(grossForMonth(inc as MonthAmountIncome, "2026-07"))
    expect(node?.value).toBe(7000)
  })

  it("a bonus month emits a separate '<name> Bonus' node", () => {
    const inc = sankeyIncome({
      accountForBonus: true,
      bonusGroups: JSON.stringify([{ month: 7, amount: "1.5" }])
    })
    const model = buildCashflowModel([inc], [], { year: 2026, month: 7 })
    const base = model.incomeNodes.find((n) => n.id === "inc1")
    const bonus = model.incomeNodes.find((n) => n.id === "inc1:bonus")
    expect(base?.value).toBe(5000)
    expect(bonus?.label).toBe("Salary Bonus")
    expect(bonus?.value).toBe(7500) // 5000 × 1.5
  })

  it("no bonus node when the target month has no bonus", () => {
    const inc = sankeyIncome({
      accountForBonus: true,
      bonusGroups: JSON.stringify([{ month: 12, amount: "1" }])
    })
    const model = buildCashflowModel([inc], [], { year: 2026, month: 7 })
    expect(model.incomeNodes.some((n) => n.id === "inc1:bonus")).toBe(false)
  })
})

describe("bonusDollarsForYear — CPF-tab annual bonus aggregation", () => {
  const GROSS = 5000

  it("recurring bonuses count every year (multiplier × monthly gross)", () => {
    const bg = JSON.stringify([{ month: 12, amount: "1.5" }])
    // Recurring repeats yearly, so any year returns the same total.
    expect(bonusDollarsForYear(bg, GROSS, 2026)).toBe(7500)
    expect(bonusDollarsForYear(bg, GROSS, 2030)).toBe(7500)
  })

  it("one-off bonuses count ONLY in their own calendar year (the year-boundary fix)", () => {
    const bg = JSON.stringify([
      { date: "2025-06", amount: "4000" }, // prior year
      { date: "2026-06", amount: "5000" }, // this year
      { date: "2027-01", amount: "9000" } // future year
    ])
    expect(bonusDollarsForYear(bg, GROSS, 2026)).toBe(5000)
    expect(bonusDollarsForYear(bg, GROSS, 2025)).toBe(4000)
    expect(bonusDollarsForYear(bg, GROSS, 2027)).toBe(9000)
    expect(bonusDollarsForYear(bg, GROSS, 2024)).toBe(0)
  })

  it("mixed recurring + one-off: recurring always, one-off only in-year", () => {
    const bg = JSON.stringify([
      { month: 12, amount: "1" }, // recurring → 5000 every year
      { date: "2026-03", amount: "2000" } // one-off this year
    ])
    expect(bonusDollarsForYear(bg, GROSS, 2026)).toBe(7000) // 5000 + 2000
    expect(bonusDollarsForYear(bg, GROSS, 2027)).toBe(5000) // recurring only
  })

  it("null / empty / corrupted / non-positive bonusGroups → 0", () => {
    expect(bonusDollarsForYear(null, GROSS, 2026)).toBe(0)
    expect(bonusDollarsForYear("[]", GROSS, 2026)).toBe(0)
    expect(bonusDollarsForYear("[object Object]", GROSS, 2026)).toBe(0)
    expect(bonusDollarsForYear("{}", GROSS, 2026)).toBe(0)
    expect(
      bonusDollarsForYear(
        JSON.stringify([{ month: 12, amount: "0" }]),
        GROSS,
        2026
      )
    ).toBe(0)
    expect(
      bonusDollarsForYear(
        JSON.stringify([{ date: "2026-06", amount: "-500" }]),
        GROSS,
        2026
      )
    ).toBe(0)
  })
})
