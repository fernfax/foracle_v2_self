/**
 * Current CPF balances per family member.
 *
 * Balances are not stored as their own entity — the user enters them at
 * onboarding (CpfStep) and they live on the member's primary active CPF income
 * row as cpfOrdinaryAccount / cpfSpecialAccount / cpfMedisaveAccount. This
 * mirrors the selection cpf-list.tsx uses (first income where the member is
 * subjectToCpf and isActive), so the CPF tab and the Net Worth view always
 * agree on the same numbers and never double-count a multi-income member.
 */

export interface CpfBalanceIncomeRow {
  familyMemberId: string | null
  subjectToCpf: boolean | null
  isActive: boolean | null
  cpfOrdinaryAccount: string | null
  cpfSpecialAccount: string | null
  cpfMedisaveAccount: string | null
}

export interface CpfBalance {
  oa: number
  sa: number
  ma: number
  total: number
}

const toNum = (s: string | null | undefined): number => {
  const n = parseFloat(s ?? "")
  return Number.isFinite(n) ? n : 0
}

/**
 * The income row a member's CPF balance is stored on — the first income where
 * they are subjectToCpf and isActive. Single source of truth for "which income"
 * so the displayed balance and the edit target never diverge.
 */
export function findPrimaryCpfIncome<T extends CpfBalanceIncomeRow>(
  familyMemberId: string,
  incomes: T[]
): T | undefined {
  return incomes.find(
    (i) => i.familyMemberId === familyMemberId && i.subjectToCpf && i.isActive
  )
}

/** OA/SA/MA balance for one member, read from their primary active CPF income. */
export function cpfBalanceForMember(
  familyMemberId: string,
  incomes: CpfBalanceIncomeRow[]
): CpfBalance {
  const inc = findPrimaryCpfIncome(familyMemberId, incomes)
  const oa = toNum(inc?.cpfOrdinaryAccount)
  const sa = toNum(inc?.cpfSpecialAccount)
  const ma = toNum(inc?.cpfMedisaveAccount)
  return { oa, sa, ma, total: oa + sa + ma }
}
