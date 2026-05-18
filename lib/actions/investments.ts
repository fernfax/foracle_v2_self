"use server";

import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  createInvestment as createInvestmentService,
  deleteInvestment as deleteInvestmentService,
  getInvestmentsSummary as getInvestmentsSummaryService,
  listInvestments,
  updateInvestment as updateInvestmentService,
} from "@/lib/services/investments";

export interface Investment {
  id: string;
  userId: string;
  name: string;
  type: string;
  currentCapital: string;
  projectedYield: string;
  contributionAmount: string;
  contributionFrequency: string;
  customMonths: string | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvestmentsSummary {
  totalPortfolioValue: number;
  averageYield: number;
  totalMonthlyContribution: number;
  activeCount: number;
}

export async function getInvestments(): Promise<Investment[]> {
  const ctx = await getCurrentUserAndFamily();
  return listInvestments(ctx);
}

export async function getInvestmentsSummary(): Promise<InvestmentsSummary> {
  const ctx = await getCurrentUserAndFamily();
  return getInvestmentsSummaryService(ctx);
}

export async function createInvestment(data: {
  name: string;
  type: string;
  currentCapital: string;
  projectedYield: string;
  contributionAmount: string;
  contributionFrequency: string;
  customMonths?: string;
}) {
  const ctx = await getCurrentUserAndFamily();
  const result = await createInvestmentService(ctx, {
    name: data.name,
    type: data.type as
      | "stock"
      | "cash"
      | "bonds"
      | "etf"
      | "crypto"
      | "mutual_fund"
      | "reit",
    currentCapital: data.currentCapital,
    projectedYield: data.projectedYield,
    contributionAmount: data.contributionAmount,
    contributionFrequency: data.contributionFrequency as "monthly" | "custom",
    customMonths: data.customMonths,
  });
  return result.row;
}

export async function updateInvestment(
  id: string,
  data: Partial<{
    name: string;
    type: string;
    currentCapital: string;
    projectedYield: string;
    contributionAmount: string;
    contributionFrequency: string;
    customMonths: string;
    isActive: boolean;
  }>
) {
  const ctx = await getCurrentUserAndFamily();
  const patch: Parameters<typeof updateInvestmentService>[2] = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.type !== undefined)
    patch.type = data.type as
      | "stock"
      | "cash"
      | "bonds"
      | "etf"
      | "crypto"
      | "mutual_fund"
      | "reit";
  if (data.currentCapital !== undefined) patch.currentCapital = data.currentCapital;
  if (data.projectedYield !== undefined) patch.projectedYield = data.projectedYield;
  if (data.contributionAmount !== undefined)
    patch.contributionAmount = data.contributionAmount;
  if (data.contributionFrequency !== undefined)
    patch.contributionFrequency = data.contributionFrequency as "monthly" | "custom";
  if (data.customMonths !== undefined) patch.customMonths = data.customMonths;
  if (data.isActive !== undefined) patch.isActive = data.isActive;

  if (Object.keys(patch).length === 0) {
    throw new Error("At least one field must be provided");
  }

  return updateInvestmentService(ctx, id, patch);
}

export async function deleteInvestment(id: string) {
  const ctx = await getCurrentUserAndFamily();
  await deleteInvestmentService(ctx, id);
}
