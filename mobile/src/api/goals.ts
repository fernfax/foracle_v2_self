import type { ApiClient } from "@/src/lib/api-client";

export type Goal = {
  id: string;
  userId: string;
  familyId: string | null;
  linkedExpenseId: string | null;
  goalName: string;
  goalType: "primary" | "secondary";
  targetAmount: string;
  targetDate: string;
  currentAmountSaved: string | null;
  monthlyContribution: string | null;
  description: string | null;
  isAchieved: boolean | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
};

export type ListGoalsQuery = {
  isActive?: boolean;
  isAchieved?: boolean;
  goalType?: "primary" | "secondary";
};

export function listGoals(
  client: ApiClient,
  filters: ListGoalsQuery = {}
): Promise<Goal[]> {
  const params: Record<string, string> = {};
  if (filters.isActive !== undefined) params.isActive = String(filters.isActive);
  if (filters.isAchieved !== undefined) params.isAchieved = String(filters.isAchieved);
  if (filters.goalType !== undefined) params.goalType = filters.goalType;
  const qs = new URLSearchParams(params).toString();
  return client.get<Goal[]>(`/api/v1/goals${qs ? `?${qs}` : ""}`);
}
