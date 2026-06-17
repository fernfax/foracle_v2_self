import { describe, expect, it } from "vitest"

import { computeHouseholdSummary } from "@/lib/household-summary"

// QA-verified household fixture (Alex Tan + Jamie Tan, 2026-06-07)
// Alex: $7,500/mo salary, CPF employee $1,500, net $6,000
// Jamie: $6,500/mo salary, CPF employee $1,300, net $5,200
// Total expenses: $9,753/mo
// Total holdings: $101,700

const TODAY_MONTH = new Date().toISOString().slice(0, 7) // e.g. "2026-06"

const ALEX_INCOME = {
  amount: "7500",
  frequency: "monthly",
  netTakeHome: "6000",
  subjectToCpf: true,
  isActive: true,
  startDate: `${TODAY_MONTH}-01`,
  endDate: null,
  futureMilestones: null,
  accountForFutureChange: false,
  accountForBonus: false,
  bonusGroups: null,
  customMonths: null
}

const JAMIE_INCOME = {
  amount: "6500",
  frequency: "monthly",
  netTakeHome: "5200",
  subjectToCpf: true,
  isActive: true,
  startDate: `${TODAY_MONTH}-01`,
  endDate: null,
  futureMilestones: null,
  accountForFutureChange: false,
  accountForBonus: false,
  bonusGroups: null,
  customMonths: null
}

const EXPENSES = [
  { amount: "9753", frequency: "monthly", customMonths: null, isActive: true }
]

const HOLDINGS = [
  { holdingAmount: "32000" }, // DBS Multiplier (Alex)
  { holdingAmount: "6200" }, // HSBC USD (Alex)
  { holdingAmount: "18500" }, // POSB eSavings (Jamie)
  { holdingAmount: "45000" } // DBS Joint Savings
]

const FAMILY_MEMBERS = [
  { id: "alex" },
  { id: "jamie" },
  { id: "kai" },
  { id: "mdm-tan" },
  { id: "mia" }
]

describe("computeHouseholdSummary", () => {
  const summary = computeHouseholdSummary(
    [ALEX_INCOME, JAMIE_INCOME],
    EXPENSES,
    HOLDINGS,
    FAMILY_MEMBERS
  )

  it("grossIncome = Alex $7,500 + Jamie $6,500 = $14,000", () => {
    expect(summary.grossIncome).toBe(14000)
  })

  it("cpfEmployeeTotal = Alex $1,500 + Jamie $1,300 = $2,800", () => {
    expect(summary.cpfEmployeeTotal).toBeCloseTo(2800, 0)
  })

  it("netIncome = $14,000 - $2,800 = $11,200", () => {
    expect(summary.netIncome).toBeCloseTo(11200, 0)
  })

  it("monthlyExpenses = $9,753", () => {
    expect(summary.monthlyExpenses).toBe(9753)
  })

  it("surplus = $11,200 - $9,753 = $1,447", () => {
    expect(summary.surplus).toBeCloseTo(1447, 0)
  })

  it("liquidHoldings = $32,000 + $6,200 + $18,500 + $45,000 = $101,700", () => {
    expect(summary.liquidHoldings).toBe(101700)
  })

  it("runwayMonths = $101,700 / $9,753 ≈ 10.4", () => {
    expect(summary.runwayMonths).toBeCloseTo(10.4, 0)
  })

  it("memberCount = 5", () => {
    expect(summary.memberCount).toBe(5)
  })

  it("inactive income is excluded", () => {
    const inactive = { ...ALEX_INCOME, isActive: false as const }
    const s = computeHouseholdSummary(
      [inactive, JAMIE_INCOME],
      EXPENSES,
      HOLDINGS,
      []
    )
    expect(s.grossIncome).toBe(6500)
  })

  it("non-CPF income: no CPF deduction", () => {
    const nonCpf = { ...ALEX_INCOME, subjectToCpf: false, netTakeHome: null }
    const s = computeHouseholdSummary([nonCpf], [], [], [])
    expect(s.cpfEmployeeTotal).toBe(0)
    expect(s.netIncome).toBe(s.grossIncome)
  })

  it("runwayMonths is null when expenses = 0", () => {
    const s = computeHouseholdSummary([], [], HOLDINGS, [])
    expect(s.runwayMonths).toBeNull()
  })

  it("empty state: all zeros when no data", () => {
    const s = computeHouseholdSummary([], [], [], [])
    expect(s.grossIncome).toBe(0)
    expect(s.netIncome).toBe(0)
    expect(s.cpfEmployeeTotal).toBe(0)
    expect(s.monthlyExpenses).toBe(0)
    expect(s.liquidHoldings).toBe(0)
    expect(s.runwayMonths).toBeNull()
    expect(s.memberCount).toBe(0)
  })
})
