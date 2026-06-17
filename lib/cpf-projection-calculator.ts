import type { CpfByFamilyMember } from "@/lib/actions/cpf"
import {
  AnnualBonusCpf,
  computeCpfContributions,
  getCPFAllocationByAge,
  getCPFRatesByAge
} from "@/lib/cpf-calculator"
import { parseBonusGroups } from "@/lib/income-month"

const OW_CEILING = 8000

// --- CPF Loan Deduction types ---

export interface CpfLoanDeduction {
  monthlyAmount: number
  remainingMonths: number
}

export interface CpfPropertyAsset {
  id: string
  monthlyLoanPayment: string
  outstandingLoan: string
  paidByCpf: boolean | null
  isActive: boolean | null
}

/**
 * Extract CPF loan deductions from property assets that have paidByCpf enabled
 */
export function extractCpfLoanDeductions(
  propertyAssets: CpfPropertyAsset[]
): CpfLoanDeduction[] {
  return propertyAssets
    .filter((p) => p.paidByCpf && p.isActive !== false)
    .map((p) => {
      const monthlyPayment = parseFloat(p.monthlyLoanPayment) || 0
      const outstanding = parseFloat(p.outstandingLoan) || 0
      const remainingMonths =
        monthlyPayment > 0 ? Math.ceil(outstanding / monthlyPayment) : 0
      return { monthlyAmount: monthlyPayment, remainingMonths }
    })
    .filter((d) => d.monthlyAmount > 0 && d.remainingMonths > 0)
}

export interface CpfProjectionInput {
  familyMemberId: string
  familyMemberName: string
  monthlyGrossIncome: number
  dateOfBirth: string | null
  currentAge: number | null
  /** Recurring bonuses: months-of-salary multiplier, repeats yearly in `month`. */
  bonusSchedule: { month: number; multiplier: number }[]
  /** One-off bonuses: direct dollars landing once in `date` ("YYYY-MM"). */
  oneOffBonuses: { date: string; dollars: number }[]
}

export interface CpfProjectionDataPoint {
  month: string
  monthIndex: number
  [key: string]: number | string
}

/**
 * Extract projection inputs from CPF data and incomes
 */
export function extractCpfProjectionInputs(
  cpfData: CpfByFamilyMember[],
  incomes: {
    familyMemberId: string | null
    amount: string
    subjectToCpf: boolean | null
    isActive: boolean | null
    accountForBonus: boolean | null
    bonusGroups: string | null
    familyMember: {
      id: string
      name: string
      dateOfBirth: string | null
    } | null
  }[]
): CpfProjectionInput[] {
  return cpfData.map((member) => {
    // Find matching income to get DOB and bonus info
    const matchingIncome = incomes.find(
      (inc) =>
        inc.familyMemberId === member.familyMemberId &&
        inc.subjectToCpf &&
        inc.isActive
    )

    // Parse the bonus schedule from the stored wire shape via the shared
    // parser — recurring entries are { month, amount } (months-of-salary
    // multiplier, repeats yearly); one-off entries are { date: "YYYY-MM",
    // amount } (direct dollars, land once). The previous parser expected a
    // `multiplier` field the wire format never carried, so every bonus was
    // silently dropped from the projection.
    const bonusSchedule: { month: number; multiplier: number }[] = []
    const oneOffBonuses: { date: string; dollars: number }[] = []
    if (matchingIncome?.accountForBonus && matchingIncome?.bonusGroups) {
      for (const g of parseBonusGroups(matchingIncome.bonusGroups)) {
        if (g.kind === "recurring") {
          if (g.month >= 1 && g.month <= 12) {
            bonusSchedule.push({ month: g.month, multiplier: g.multiplier })
          }
        } else {
          oneOffBonuses.push({ date: g.date, dollars: g.dollars })
        }
      }
    }

    return {
      familyMemberId: member.familyMemberId,
      familyMemberName: member.familyMemberName,
      monthlyGrossIncome: member.monthlyGrossIncome,
      dateOfBirth: matchingIncome?.familyMember?.dateOfBirth ?? null,
      currentAge: member.age,
      bonusSchedule,
      oneOffBonuses
    }
  })
}

/**
 * Calculate age at a given month offset from now, using DOB if available
 */
function getAgeAtMonth(
  dateOfBirth: string | null,
  currentAge: number | null,
  monthOffset: number
): number {
  if (dateOfBirth) {
    const dob = new Date(dateOfBirth)
    const future = new Date()
    future.setMonth(future.getMonth() + monthOffset)
    let age = future.getFullYear() - dob.getFullYear()
    const monthDiff = future.getMonth() - dob.getMonth()
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && future.getDate() < dob.getDate())
    ) {
      age--
    }
    return age
  }
  // Fallback: use current age or default 30
  const baseAge = currentAge ?? 30
  return baseAge + Math.floor(monthOffset / 12)
}

/**
 * Calculate CPF projection data for Recharts
 */
export function calculateCpfProjection(
  inputs: CpfProjectionInput[],
  totalMonths: number,
  loanDeductions?: CpfLoanDeduction[]
): CpfProjectionDataPoint[] {
  // Pin the projection's start month/year to Asia/Singapore so one-off bonus
  // matching (oneOff.date === monthKey) and the start bucket don't drift on a
  // UTC server at the year/month boundary. Matches the repo's SGT convention.
  const sgParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "numeric"
  }).formatToParts(new Date())
  const startYear = Number(sgParts.find((p) => p.type === "year")?.value)
  const startMonth = Number(sgParts.find((p) => p.type === "month")?.value) - 1 // 0-indexed

  // Track cumulative values per member
  const cumulative: Record<
    string,
    { total: number; oa: number; sa: number; ma: number; loanDeduction: number }
  > = {}
  for (const input of inputs) {
    cumulative[input.familyMemberId] = {
      total: 0,
      oa: 0,
      sa: 0,
      ma: 0,
      loanDeduction: 0
    }
  }

  // One bonus accumulator per (member, calendar year) so a year's bonuses share
  // the Additional Wage ceiling cumulatively instead of each seeing full room.
  // Keyed by `${memberId}:${year}` and reset implicitly at each year boundary.
  const bonusAccumulators = new Map<string, AnnualBonusCpf>()

  const data: CpfProjectionDataPoint[] = []

  for (let i = 0; i <= totalMonths; i++) {
    const date = new Date(startYear, startMonth + i, 1)
    const monthLabel = date.toLocaleDateString("en-SG", {
      month: "short",
      year: "2-digit"
    })
    const calendarMonth = date.getMonth() + 1 // 1-12

    const point: CpfProjectionDataPoint = {
      month: monthLabel,
      monthIndex: i
    }

    let householdMonthlyTotal = 0
    let householdMonthlyOa = 0
    let householdMonthlySa = 0
    let householdMonthlyMa = 0
    let householdMonthlyLoanDeduction = 0
    let householdCumulativeTotal = 0
    let householdCumulativeOa = 0
    let householdCumulativeSa = 0
    let householdCumulativeMa = 0
    let householdCumulativeLoanDeduction = 0

    for (const input of inputs) {
      const id = input.familyMemberId
      const age = getAgeAtMonth(input.dateOfBirth, input.currentAge, i)
      const rates = getCPFRatesByAge(age)
      const allocation = getCPFAllocationByAge(age)

      // Monthly salary CPF
      let monthlyTotal = 0
      let monthlyOa = 0
      let monthlySa = 0
      let monthlyMa = 0

      if (i > 0) {
        // Month 0 is the starting point (no contribution yet)
        const cpfApplicable = Math.min(input.monthlyGrossIncome, OW_CEILING)
        const { employee: empLow, employer: erLow } = computeCpfContributions(
          cpfApplicable,
          rates
        )
        const totalCpf = empLow + erLow
        monthlyOa = totalCpf * allocation.oa
        monthlySa = totalCpf * allocation.sa
        monthlyMa = totalCpf * allocation.ma
        monthlyTotal = monthlyOa + monthlySa + monthlyMa

        // Bonuses landing this month: every recurring entry matching the
        // calendar month (multiplier × monthly gross) plus any one-off dated
        // exactly this YYYY-MM.
        let bonusGross = 0
        for (const b of input.bonusSchedule) {
          if (b.month === calendarMonth) {
            bonusGross += input.monthlyGrossIncome * b.multiplier
          }
        }
        const monthKey = `${date.getFullYear()}-${String(calendarMonth).padStart(2, "0")}`
        for (const oneOff of input.oneOffBonuses) {
          if (oneOff.date === monthKey) {
            bonusGross += oneOff.dollars
          }
        }
        if (bonusGross > 0) {
          // Feed this month's bonus into the member's year accumulator so the
          // AW ceiling consumes month by month (two bonuses in a year share the
          // room). Age captured at the year's first bonus — minor birthday-edge
          // approximation, acceptable for a projection.
          const accKey = `${id}:${date.getFullYear()}`
          let acc = bonusAccumulators.get(accKey)
          if (!acc) {
            acc = new AnnualBonusCpf(input.monthlyGrossIncome, age)
            bonusAccumulators.set(accKey, acc)
          }
          const step = acc.addBonus(bonusGross)
          monthlyOa += step.oaAllocation
          monthlySa += step.saAllocation
          monthlyMa += step.maAllocation
          monthlyTotal += step.total
        }
      }

      // Apply CPF loan deductions (OA only, split evenly across members)
      let monthlyLoanDeduction = 0
      if (
        i > 0 &&
        loanDeductions &&
        loanDeductions.length > 0 &&
        inputs.length > 0
      ) {
        const memberCount = inputs.length
        for (const deduction of loanDeductions) {
          if (i <= deduction.remainingMonths) {
            const perMemberDeduction = deduction.monthlyAmount / memberCount
            monthlyLoanDeduction += perMemberDeduction
          }
        }
        monthlyOa -= monthlyLoanDeduction
        monthlyTotal -= monthlyLoanDeduction
      }

      // Update cumulative
      cumulative[id].total += monthlyTotal
      cumulative[id].oa += monthlyOa
      cumulative[id].sa += monthlySa
      cumulative[id].ma += monthlyMa
      cumulative[id].loanDeduction += monthlyLoanDeduction

      // Per-member monthly values
      point[`member_${id}_monthly_total`] = Math.round(monthlyTotal)
      point[`member_${id}_monthly_oa`] = Math.round(monthlyOa)
      point[`member_${id}_monthly_sa`] = Math.round(monthlySa)
      point[`member_${id}_monthly_ma`] = Math.round(monthlyMa)
      point[`member_${id}_monthly_loan_deduction`] =
        Math.round(monthlyLoanDeduction)

      // Per-member cumulative values
      point[`member_${id}_total`] = Math.round(cumulative[id].total)
      point[`member_${id}_oa`] = Math.round(cumulative[id].oa)
      point[`member_${id}_sa`] = Math.round(cumulative[id].sa)
      point[`member_${id}_ma`] = Math.round(cumulative[id].ma)
      point[`member_${id}_loan_deduction`] = Math.round(
        cumulative[id].loanDeduction
      )

      householdMonthlyTotal += monthlyTotal
      householdMonthlyOa += monthlyOa
      householdMonthlySa += monthlySa
      householdMonthlyMa += monthlyMa
      householdMonthlyLoanDeduction += monthlyLoanDeduction
      householdCumulativeTotal += cumulative[id].total
      householdCumulativeOa += cumulative[id].oa
      householdCumulativeSa += cumulative[id].sa
      householdCumulativeMa += cumulative[id].ma
      householdCumulativeLoanDeduction += cumulative[id].loanDeduction
    }

    point.householdTotal = Math.round(householdCumulativeTotal)
    point.householdOa = Math.round(householdCumulativeOa)
    point.householdSa = Math.round(householdCumulativeSa)
    point.householdMa = Math.round(householdCumulativeMa)
    point.householdLoanDeduction = Math.round(householdCumulativeLoanDeduction)
    point.householdMonthlyTotal = Math.round(householdMonthlyTotal)
    point.householdMonthlyOa = Math.round(householdMonthlyOa)
    point.householdMonthlySa = Math.round(householdMonthlySa)
    point.householdMonthlyMa = Math.round(householdMonthlyMa)
    point.householdMonthlyLoanDeduction = Math.round(
      householdMonthlyLoanDeduction
    )

    data.push(point)
  }

  return data
}
