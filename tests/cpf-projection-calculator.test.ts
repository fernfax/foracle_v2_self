import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { CpfByFamilyMember } from "@/lib/actions/cpf"
import {
  calculateCpfProjection,
  extractCpfProjectionInputs,
  type CpfProjectionInput
} from "@/lib/cpf-projection-calculator"

// Pin "now" so calendar-month assertions are deterministic: the projection
// starts at the current month, and one-off bonuses match exact YYYY-MM keys.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 0, 15)) // 15 Jan 2026
})
afterEach(() => {
  vi.useRealTimers()
})

const member = (over: Partial<CpfByFamilyMember> = {}) =>
  ({
    familyMemberId: "m1",
    familyMemberName: "Alex",
    age: 35,
    monthlyGrossIncome: 5000,
    ...over
  }) as unknown as CpfByFamilyMember

const income = (bonusGroups: string | null, accountForBonus = true) => ({
  familyMemberId: "m1",
  amount: "5000",
  subjectToCpf: true,
  isActive: true,
  accountForBonus,
  bonusGroups,
  familyMember: { id: "m1", name: "Alex", dateOfBirth: null }
})

describe("extractCpfProjectionInputs — stored bonus wire shape", () => {
  // Regression: the old parser expected a `multiplier` field that the stored
  // format ({ month, amount } / { date, amount }) never carries, so EVERY
  // bonus was silently dropped from the CPF projection.
  it("parses recurring { month, amount } entries (amount = months-of-salary multiplier)", () => {
    const [input] = extractCpfProjectionInputs(
      [member()],
      [income(JSON.stringify([{ month: 12, amount: "1.5" }]))]
    )
    expect(input.bonusSchedule).toEqual([{ month: 12, multiplier: 1.5 }])
    expect(input.oneOffBonuses).toEqual([])
  })

  it("parses one-off { date, amount } entries as dollars, not multipliers", () => {
    const [input] = extractCpfProjectionInputs(
      [member()],
      [income(JSON.stringify([{ date: "2026-06", amount: "5000" }]))]
    )
    expect(input.oneOffBonuses).toEqual([{ date: "2026-06", dollars: 5000 }])
    expect(input.bonusSchedule).toEqual([])
  })

  it("splits mixed entries by kind; corrupted JSON yields no bonuses", () => {
    const [mixed] = extractCpfProjectionInputs(
      [member()],
      [
        income(
          JSON.stringify([
            { month: 7, amount: "1" },
            { date: "2026-03", amount: "2000" }
          ])
        )
      ]
    )
    expect(mixed.bonusSchedule).toEqual([{ month: 7, multiplier: 1 }])
    expect(mixed.oneOffBonuses).toEqual([{ date: "2026-03", dollars: 2000 }])

    const [corrupted] = extractCpfProjectionInputs(
      [member()],
      [income("[object Object]")]
    )
    expect(corrupted.bonusSchedule).toEqual([])
    expect(corrupted.oneOffBonuses).toEqual([])
  })

  it("accountForBonus=false drops the schedule entirely", () => {
    const [input] = extractCpfProjectionInputs(
      [member()],
      [income(JSON.stringify([{ month: 12, amount: "1" }]), false)]
    )
    expect(input.bonusSchedule).toEqual([])
    expect(input.oneOffBonuses).toEqual([])
  })
})

describe("calculateCpfProjection — bonuses land in the right months", () => {
  const base: CpfProjectionInput = {
    familyMemberId: "m1",
    familyMemberName: "Alex",
    monthlyGrossIncome: 5000,
    dateOfBirth: null,
    currentAge: 35,
    bonusSchedule: [],
    oneOffBonuses: []
  }

  it("a recurring December bonus adds CPF every December, and only there", () => {
    const data = calculateCpfProjection(
      [{ ...base, bonusSchedule: [{ month: 12, multiplier: 1 }] }],
      24
    )
    // Start = Jan 2026 (i=0 baseline month, no contribution).
    const nov26 = data[10]["member_m1_monthly_total"] as number
    const dec26 = data[11]["member_m1_monthly_total"] as number
    const dec27 = data[23]["member_m1_monthly_total"] as number
    expect(dec26).toBeGreaterThan(nov26)
    expect(dec27).toBeGreaterThan(nov26) // recurring repeats yearly
    // 1 month × $5,000 bonus at 37% total CPF ≈ $1,850 extra.
    expect(dec26 - nov26).toBeCloseTo(1850, 0)
  })

  it("a one-off bonus lands exactly once in its YYYY-MM and never repeats", () => {
    const data = calculateCpfProjection(
      [{ ...base, oneOffBonuses: [{ date: "2026-06", dollars: 5000 }] }],
      18
    )
    const may26 = data[4]["member_m1_monthly_total"] as number
    const jun26 = data[5]["member_m1_monthly_total"] as number
    const jun27 = data[17]["member_m1_monthly_total"] as number
    expect(jun26).toBeGreaterThan(may26)
    expect(jun26 - may26).toBeCloseTo(1850, 0)
    expect(jun27).toBeCloseTo(may26, 0) // does NOT repeat the following June
  })

  it("multiple recurring entries in the same month all count", () => {
    const data = calculateCpfProjection(
      [
        {
          ...base,
          bonusSchedule: [
            { month: 3, multiplier: 0.5 },
            { month: 3, multiplier: 0.5 }
          ]
        }
      ],
      6
    )
    const feb26 = data[1]["member_m1_monthly_total"] as number
    const mar26 = data[2]["member_m1_monthly_total"] as number
    // Two 0.5-month bonuses = one month of salary → same ≈$1,850 uplift.
    expect(mar26 - feb26).toBeCloseTo(1850, 0)
  })

  it("two one-off bonuses in the same YYYY-MM both count", () => {
    const data = calculateCpfProjection(
      [
        {
          ...base,
          oneOffBonuses: [
            { date: "2026-06", dollars: 2000 },
            { date: "2026-06", dollars: 3000 }
          ]
        }
      ],
      12
    )
    const may26 = data[4]["member_m1_monthly_total"] as number
    const jun26 = data[5]["member_m1_monthly_total"] as number
    // $2,000 + $3,000 = $5,000 combined → ≈$1,850 uplift at 37% total CPF.
    expect(jun26 - may26).toBeCloseTo(1850, 0)
  })
})
