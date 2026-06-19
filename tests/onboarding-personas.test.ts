import { db } from "@/db"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { beforeEach, describe, expect, it } from "vitest"

import type { AuthContext } from "@/lib/auth-context"
import { computeHouseholdSummary } from "@/lib/finance/household-summary"
import { createIncome, listIncomes } from "@/lib/services/incomes"
import {
  completeOnboarding,
  createOnboardingExpenses
} from "@/lib/services/onboarding"
import { currentHoldings, expenses } from "@/db/schema"

import { seedFamilyMember, seedUser, truncateAll } from "./db-helpers"

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding tally matrix — 10 user scenarios.
//
// Goal: whatever a user enters in the onboarding wizard, the numbers the app
// shows must tally. Each persona below is a set of wizard inputs (members +
// DOBs, income streams, holdings, expense categories). We replay the exact save
// services the wizard calls (createIncome, createOnboardingExpenses,
// completeOnboarding) against a real test DB, then feed the persisted rows
// through computeHouseholdSummary — the same pure function /user renders from —
// and assert the cross-feature totals equal the sum of what was entered:
//
//   • gross income      == Σ income amounts
//   • monthly expenses   == Σ expense category amounts
//   • liquid holdings    == Σ holdings
//   • member count       == number of household members
//   • CPF                applied iff a CPF-eligible income has a DOB'd member,
//                         and net income == gross − CPF (the take-home identity)
//
// Exact CPF dollar amounts aren't asserted (they depend on age-based rates that
// change yearly); we assert the relationship so the test survives rate updates
// while still proving CPF flows through. Run:
//   npm run test:db-setup            (one-time)
//   npm run test -- onboarding-personas
// ─────────────────────────────────────────────────────────────────────────────

type IncomeInput = { memberIdx: number; amount: string; subjectToCpf: boolean }
type Persona = {
  key: string
  label: string
  members: { name: string; dob: string | null }[]
  incomes: IncomeInput[]
  holdings: string[]
  expenses: Record<string, string>
}

const PAST_START = "2020-01-01" // all streams active in the current month

const PERSONAS: Persona[] = [
  {
    key: "01_blank_slate",
    label: "Blank slate — signs up, enters nothing",
    members: [{ name: "Maya Rahman", dob: "1995-04-10" }],
    incomes: [],
    holdings: [],
    expenses: {}
  },
  {
    key: "02_fresh_grad",
    label: "Fresh grad — one CPF salary, lean spend",
    members: [{ name: "Aaron Lim", dob: "2001-09-01" }],
    incomes: [{ memberIdx: 0, amount: "3500", subjectToCpf: true }],
    holdings: ["2000"],
    expenses: { Housing: "800", Food: "500", Transportation: "200" }
  },
  {
    key: "03_dink_couple",
    label: "DINK couple — two CPF earners",
    members: [
      { name: "Wei Tan", dob: "1990-02-15" },
      { name: "Lin Tan", dob: "1991-06-20" }
    ],
    incomes: [
      { memberIdx: 0, amount: "7000", subjectToCpf: true },
      { memberIdx: 1, amount: "6500", subjectToCpf: true }
    ],
    holdings: ["40000", "15000"],
    expenses: {
      Housing: "2500",
      Food: "1200",
      Transportation: "600",
      Entertainment: "400"
    }
  },
  {
    key: "04_young_family",
    label: "Young family — two earners + two kids (no income)",
    members: [
      { name: "Daniel Ng", dob: "1988-03-12" },
      { name: "Grace Ng", dob: "1989-11-05" },
      { name: "Kid One", dob: "2018-01-01" },
      { name: "Kid Two", dob: "2020-07-07" }
    ],
    incomes: [
      { memberIdx: 0, amount: "8000", subjectToCpf: true },
      { memberIdx: 1, amount: "4000", subjectToCpf: true }
    ],
    holdings: ["30000"],
    expenses: {
      Housing: "3000",
      Food: "1500",
      Children: "1200",
      Transportation: "800",
      Healthcare: "300"
    }
  },
  {
    key: "05_sandwich_gen",
    label: "Sandwich gen — one earner, dependent parent",
    members: [
      { name: "Priya Devi", dob: "1975-05-22" },
      { name: "Elderly Parent", dob: "1948-02-02" }
    ],
    incomes: [{ memberIdx: 0, amount: "9000", subjectToCpf: true }],
    holdings: ["60000"],
    expenses: {
      Housing: "2800",
      Food: "1400",
      Healthcare: "900",
      Allowances: "1000"
    }
  },
  {
    key: "06_pre_retiree",
    label: "Pre-retiree — high income, large holdings (older CPF bracket)",
    members: [{ name: "Robert Koh", dob: "1965-08-30" }],
    incomes: [{ memberIdx: 0, amount: "11000", subjectToCpf: true }],
    holdings: ["250000"],
    expenses: { Housing: "2000", Food: "1000", Healthcare: "600" }
  },
  {
    key: "07_hnw_investor",
    label: "HNW investor — high income, big cash",
    members: [{ name: "Vivian Soh", dob: "1980-12-01" }],
    incomes: [{ memberIdx: 0, amount: "25000", subjectToCpf: true }],
    holdings: ["500000", "150000"],
    expenses: {
      Housing: "6000",
      Food: "2500",
      Transportation: "1500",
      Entertainment: "2000"
    }
  },
  {
    key: "08_freelancer",
    label: "Freelancer — income NOT subject to CPF",
    members: [{ name: "Sam Tan", dob: "1992-10-18" }],
    incomes: [{ memberIdx: 0, amount: "6000", subjectToCpf: false }],
    holdings: ["20000"],
    expenses: { Housing: "1800", Food: "800", Transportation: "300" }
  },
  {
    key: "09_over_budgeter",
    label: "Over-budgeter — expenses exceed take-home",
    members: [{ name: "Jenny Wong", dob: "1996-07-14" }],
    incomes: [{ memberIdx: 0, amount: "4000", subjectToCpf: true }],
    holdings: ["1000"],
    expenses: {
      Housing: "1800",
      Food: "900",
      Shopping: "800",
      Entertainment: "700",
      Transportation: "400"
    }
  },
  {
    key: "10_power_user",
    label: "Power user — multiple income streams + many holdings/categories",
    members: [
      { name: "Marcus Lee", dob: "1985-06-09" },
      { name: "Tara Lee", dob: "1986-04-25" }
    ],
    incomes: [
      { memberIdx: 0, amount: "12000", subjectToCpf: true }, // salary
      { memberIdx: 0, amount: "2000", subjectToCpf: true }, // bonus-ish second stream
      { memberIdx: 1, amount: "9000", subjectToCpf: true }
    ],
    holdings: ["80000", "40000", "25000"],
    expenses: {
      Housing: "3500",
      Food: "1800",
      Transportation: "1000",
      Utilities: "400",
      Healthcare: "500",
      Children: "900",
      Entertainment: "600",
      Shopping: "500"
    }
  }
]

const sum = (xs: string[]) => xs.reduce((a, s) => a + Number(s), 0)

async function summaryFor(ctx: AuthContext) {
  const [incomes, expenseRows, holdingRows, members] = await Promise.all([
    listIncomes(ctx),
    db.query.expenses.findMany({ where: eq(expenses.familyId, ctx.familyId) }),
    db.query.currentHoldings.findMany({
      where: eq(currentHoldings.familyId, ctx.familyId)
    }),
    db.query.familyMembers.findMany()
  ])
  // incomes_beta has no frequency/custom_months columns (beta is monthly).
  const incomesForSummary = incomes.map((row) => ({
    ...row,
    frequency: "monthly",
    customMonths: null
  }))
  return computeHouseholdSummary(
    incomesForSummary,
    expenseRows,
    holdingRows,
    members.filter((m) => m.familyId === ctx.familyId)
  )
}

beforeEach(async () => {
  await truncateAll()
})

describe("onboarding tally matrix (real DB)", () => {
  for (const p of PERSONAS) {
    it(`${p.key}: ${p.label} → app numbers tally with wizard inputs`, async () => {
      const ctx = await seedUser({
        userId: `u-${p.key}`,
        familyId: `fam-${p.key}`,
        isMaster: true
      })

      // 1. Members (the wizard captures Self + DOB; couples/families add more).
      const memberIds: string[] = []
      for (const m of p.members) {
        memberIds.push(
          await seedFamilyMember({
            userId: ctx.userId,
            familyId: ctx.familyId,
            name: m.name,
            dateOfBirth: m.dob
          })
        )
      }

      // 2. Income streams (same service the wizard's IncomeStep calls).
      for (const inc of p.incomes) {
        await createIncome(ctx, {
          name: "Income",
          category: "employment",
          amount: inc.amount,
          startDate: PAST_START,
          subjectToCpf: inc.subjectToCpf,
          familyMemberId: memberIds[inc.memberIdx]
        })
      }

      // 3. Holdings.
      for (const amount of p.holdings) {
        await db.insert(currentHoldings).values({
          id: nanoid(),
          userId: ctx.userId,
          familyId: ctx.familyId,
          bankName: "Bank",
          holdingAmount: amount
        })
      }

      // 4. Expenses (exact per-category amounts → deterministic total).
      const categories = Object.keys(p.expenses)
      await createOnboardingExpenses(ctx, {
        categories,
        percentageOfIncome: 0,
        monthlyIncome: 0,
        categoryAmounts: p.expenses
      })

      await completeOnboarding(ctx)

      // ── Assert the app's numbers tally with what was entered ──
      const expectedGross = sum(p.incomes.map((i) => i.amount))
      const expectedExpenses = sum(Object.values(p.expenses))
      const expectedHoldings = sum(p.holdings)
      const cpfApplies = p.incomes.some(
        (i) => i.subjectToCpf && p.members[i.memberIdx].dob !== null
      )

      const s = await summaryFor(ctx)

      expect(s.grossIncome).toBe(expectedGross)
      expect(s.monthlyExpenses).toBe(expectedExpenses)
      expect(s.liquidHoldings).toBe(expectedHoldings)
      expect(s.memberCount).toBe(p.members.length)

      // CPF flows through correctly and net take-home reconciles.
      if (cpfApplies) {
        expect(s.cpfEmployeeTotal).toBeGreaterThan(0)
        expect(s.cpfEmployeeTotal).toBeLessThan(expectedGross)
      } else {
        expect(s.cpfEmployeeTotal).toBe(0)
      }
      expect(s.netIncome).toBeCloseTo(expectedGross - s.cpfEmployeeTotal, 6)

      // Surplus + runway are derived consistently from the tallied figures.
      expect(s.surplus).toBeCloseTo(s.netIncome - expectedExpenses, 6)
      expect(s.runwayMonths).toBe(
        expectedExpenses > 0
          ? Math.round((expectedHoldings / expectedExpenses) * 10) / 10
          : null
      )
    })
  }
})
