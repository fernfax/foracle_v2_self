import type { ApiClient } from "@/src/lib/api-client";

// Row shape returned by GET /api/v1/incomes (family-scoped). Mirrors the
// incomes_beta table plus the joined familyMember columns the route returns.
export type Income = {
  id: string;
  userId: string;
  familyId: string;
  familyMemberId: string | null;
  name: string;
  category: string;
  incomeCategory: string; // "past" | "current" | "future"
  amount: string;
  startDate: string;
  endDate: string | null;
  subjectToCpf: boolean | null;
  accountForBonus: boolean | null;
  bonusGroups: string | null;
  employeeCpfContribution: string | null;
  employerCpfContribution: string | null;
  netTakeHome: string | null;
  cpfOrdinaryAccount: string | null;
  cpfSpecialAccount: string | null;
  cpfMedisaveAccount: string | null;
  description: string | null;
  pastIncomeHistory: string | null;
  futureMilestones: string | null;
  accountForFutureChange: boolean | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
  familyMember: {
    id: string;
    name: string;
    relationship: string | null;
    dateOfBirth: string | null;
    isContributing: boolean | null;
  } | null;
};

export function listIncomes(client: ApiClient): Promise<Income[]> {
  return client.get<Income[]>("/api/v1/incomes");
}
