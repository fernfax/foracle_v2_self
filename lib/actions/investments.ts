"use server";

import { db } from "@/db";
import { investmentPolicies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

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
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const investments = await db
    .select()
    .from(investmentPolicies)
    .where(eq(investmentPolicies.userId, user.id))
    .orderBy(investmentPolicies.createdAt);

  return investments;
}

export async function getInvestmentsSummary(): Promise<InvestmentsSummary> {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const investments = await db
    .select()
    .from(investmentPolicies)
    .where(eq(investmentPolicies.userId, user.id));

  const activeInvestments = investments.filter((i) => i.isActive);

  if (activeInvestments.length === 0) {
    return {
      totalPortfolioValue: 0,
      averageYield: 0,
      totalMonthlyContribution: 0,
      activeCount: 0,
    };
  }

  const totalPortfolioValue = activeInvestments.reduce(
    (sum, inv) => sum + parseFloat(inv.currentCapital),
    0
  );

  // Calculate weighted average yield
  const weightedYield = activeInvestments.reduce((sum, inv) => {
    const capital = parseFloat(inv.currentCapital);
    const yield_ = parseFloat(inv.projectedYield);
    return sum + capital * yield_;
  }, 0);
  const averageYield =
    totalPortfolioValue > 0 ? weightedYield / totalPortfolioValue : 0;

  // Calculate total monthly contribution
  const totalMonthlyContribution = activeInvestments.reduce((sum, inv) => {
    const amount = parseFloat(inv.contributionAmount);
    if (inv.contributionFrequency === "monthly") {
      return sum + amount;
    } else if (inv.contributionFrequency === "custom" && inv.customMonths) {
      try {
        const months = JSON.parse(inv.customMonths) as number[];
        // Average monthly contribution for custom frequency
        return sum + (amount * months.length) / 12;
      } catch {
        return sum;
      }
    }
    return sum;
  }, 0);

  return {
    totalPortfolioValue,
    averageYield,
    totalMonthlyContribution,
    activeCount: activeInvestments.length,
  };
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
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const newInvestment = await db
    .insert(investmentPolicies)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      ...data,
      isActive: true,
    })
    .returning();

  return newInvestment[0];
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
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await db.query.investmentPolicies.findFirst({
    where: eq(investmentPolicies.id, id),
  });

  if (!existing || existing.userId !== user.id) {
    throw new Error("Investment not found or unauthorized");
  }

  const updated = await db
    .update(investmentPolicies)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(investmentPolicies.id, id))
    .returning();

  return updated[0];
}

export async function deleteInvestment(id: string) {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await db.query.investmentPolicies.findFirst({
    where: eq(investmentPolicies.id, id),
  });

  if (!existing || existing.userId !== user.id) {
    throw new Error("Investment not found or unauthorized");
  }

  await db.delete(investmentPolicies).where(eq(investmentPolicies.id, id));
}
