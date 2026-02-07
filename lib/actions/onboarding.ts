"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, expenses } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Weighted distribution for expense categories
const CATEGORY_WEIGHTS: Record<string, number> = {
  Housing: 30,
  Food: 20,
  Transportation: 15,
  Utilities: 10,
  Healthcare: 5,
  Children: 5,
  Entertainment: 5,
  Allowances: 5,
  Vehicle: 5,
  Shopping: 5,
};

/**
 * Check if the current user has completed onboarding.
 * If the user doesn't exist in the database (e.g., Clerk webhook didn't fire in local dev),
 * create them on-demand.
 */
export async function checkOnboardingStatus(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) {
    return false;
  }

  let user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { onboardingCompleted: true },
  });

  // If user doesn't exist in database, create them on-demand
  // This handles the case where Clerk webhook didn't fire (e.g., local development)
  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return false;
    }

    // Create the user in the database (use onConflictDoNothing for race condition safety)
    await db.insert(users).values({
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || "",
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      imageUrl: clerkUser.imageUrl,
      onboardingCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();

    // Re-fetch to get actual onboarding status (in case user already existed)
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, clerkUser.id),
      columns: { onboardingCompleted: true },
    });

    return existingUser?.onboardingCompleted ?? false;
  }

  return user?.onboardingCompleted ?? false;
}

/**
 * Mark the current user's onboarding as complete
 */
export async function completeOnboarding(): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  await db
    .update(users)
    .set({
      onboardingCompleted: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  revalidatePath("/overview");
}

/**
 * Get the current user's onboarding data for confirmation step
 */
export async function getOnboardingData() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Fetch all user data created during onboarding
  const [familyMembers, incomes, currentHoldings] = await Promise.all([
    db.query.familyMembers.findMany({
      where: eq(users.id, userId),
    }),
    db.query.incomes.findMany({
      where: eq(users.id, userId),
    }),
    db.query.currentHoldings.findMany({
      where: eq(users.id, userId),
    }),
  ]);

  return {
    familyMembers,
    incomes,
    currentHoldings,
  };
}

/**
 * Create expenses from onboarding wizard selections
 * Uses custom amounts if provided, otherwise falls back to weighted distribution
 */
export async function createOnboardingExpenses(data: {
  categories: string[];
  percentageOfIncome: number;
  monthlyIncome: number;
  categoryAmounts?: Record<string, string>;
}): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const { categories, percentageOfIncome, monthlyIncome, categoryAmounts } = data;

  // Delete ALL existing onboarding expenses to ensure step 7 reflects step 6
  // This handles cases where user goes back and changes their selections
  await db.delete(expenses).where(
    and(
      eq(expenses.userId, userId),
      eq(expenses.expenseCategory, "current-recurring")
    )
  );

  if (categories.length === 0) {
    return; // Nothing to create if no categories selected
  }

  // Generate expense records using custom amounts
  const expenseRecords = categories.map((category) => {
    // Use custom amount if provided, otherwise calculate from weighted distribution
    let amount: number;
    if (categoryAmounts && categoryAmounts[category]) {
      amount = parseFloat(categoryAmounts[category]) || 0;
    } else {
      // Fallback to weighted distribution
      const totalExpenses = monthlyIncome * (percentageOfIncome / 100);
      const totalWeight = categories.reduce((sum, cat) => sum + (CATEGORY_WEIGHTS[cat] || 5), 0);
      const weight = CATEGORY_WEIGHTS[category] || 5;
      const proportion = weight / totalWeight;
      amount = Math.round(totalExpenses * proportion * 100) / 100;
    }

    return {
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name: category, // Use category name as expense name
      category,
      expenseCategory: "current-recurring",
      amount: amount.toFixed(2),
      frequency: "monthly",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  // Insert all expenses
  if (expenseRecords.length > 0) {
    await db.insert(expenses).values(expenseRecords);
  }

  revalidatePath("/overview");
}
