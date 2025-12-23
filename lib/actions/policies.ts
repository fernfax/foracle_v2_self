"use server";

import { db } from "@/db";
import { policies, expenses } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getUserPolicies(userId: string) {
  const userPolicies = await db
    .select()
    .from(policies)
    .where(eq(policies.userId, userId))
    .orderBy(policies.createdAt);

  return userPolicies;
}

export async function createPolicy(data: {
  userId: string;
  familyMemberId?: string;
  linkedExpenseId?: string;
  provider: string;
  policyNumber?: string;
  policyType: string;
  status?: string;
  startDate: string;
  maturityDate?: string;
  coverageUntilAge?: number;
  premiumAmount: string;
  premiumFrequency: string;
  customMonths?: string;
  totalPremiumDuration?: number;
  coverageOptions?: string;
  description?: string;
}) {
  const newPolicy = await db.insert(policies).values({
    id: crypto.randomUUID(),
    ...data,
    isActive: true,
  }).returning();

  return newPolicy[0];
}

export async function updatePolicy(
  policyId: string,
  data: Partial<{
    familyMemberId: string;
    linkedExpenseId: string;
    provider: string;
    policyNumber: string;
    policyType: string;
    status: string;
    startDate: string;
    maturityDate: string;
    coverageUntilAge: number;
    premiumAmount: string;
    premiumFrequency: string;
    customMonths: string;
    totalPremiumDuration: number;
    coverageOptions: string;
    description: string;
    isActive: boolean;
  }>
) {
  const updatedPolicy = await db
    .update(policies)
    .set(data)
    .where(eq(policies.id, policyId))
    .returning();

  return updatedPolicy[0];
}

export async function deletePolicy(policyId: string) {
  // First, get the policy to find the linked expense
  const policy = await db.query.policies.findFirst({
    where: eq(policies.id, policyId),
  });

  // Delete the linked expense if it exists
  if (policy?.linkedExpenseId) {
    await db.delete(expenses).where(eq(expenses.id, policy.linkedExpenseId));
  }

  // Then delete the policy
  await db.delete(policies).where(eq(policies.id, policyId));
}
