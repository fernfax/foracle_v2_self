"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  checkOnboardingStatus as checkOnboardingStatusService,
  completeOnboarding as completeOnboardingService,
  createOnboardingExpenses as createOnboardingExpensesService,
  getOnboardingData as getOnboardingDataService,
} from "@/lib/services/onboarding";

/**
 * Check if the current user has completed onboarding. If the user doesn't
 * exist in the database (Clerk webhook miss in local dev), create them
 * on-demand inside the service.
 */
export async function checkOnboardingStatus(): Promise<boolean> {
  // Use bare auth() here (not getCurrentUserAndFamily) so a missing user row
  // doesn't trigger the family-resolution machinery before we've even created
  // the user. The service handles the on-demand insert.
  const { userId } = await auth();
  if (!userId) return false;
  // The service itself doesn't currently need familyId; it operates on
  // users-table reads/writes only. Pass a stub AuthContext.
  return checkOnboardingStatusService({
    userId,
    familyId: "",
    isMaster: false,
  });
}

/**
 * Mark the current user's onboarding as complete
 */
export async function completeOnboarding(): Promise<void> {
  const ctx = await getCurrentUserAndFamily();
  await completeOnboardingService(ctx);
  revalidatePath("/overview");
}

/**
 * Get the current user's onboarding data for the confirmation step
 */
export async function getOnboardingData() {
  const ctx = await getCurrentUserAndFamily();
  return getOnboardingDataService(ctx);
}

/**
 * Create expenses from onboarding wizard selections
 */
export async function createOnboardingExpenses(data: {
  categories: string[];
  percentageOfIncome: number;
  monthlyIncome: number;
  categoryAmounts?: Record<string, string>;
}): Promise<void> {
  const ctx = await getCurrentUserAndFamily();
  await createOnboardingExpensesService(ctx, data);
  revalidatePath("/overview");
}
