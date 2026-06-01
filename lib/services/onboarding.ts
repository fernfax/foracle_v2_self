import { and, eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { currentHoldings, expenses, familyMembers, incomes, users } from "@/db/schema";
import type { AuthContext } from "@/lib/auth-context";
import type { CreateOnboardingExpensesBody } from "@/lib/api-schemas/onboarding";

// Weighted distribution used when categoryAmounts isn't supplied for a given
// category. Mirrors the original lib/actions/onboarding.ts mapping so the
// existing wizard math doesn't change.
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

export async function checkOnboardingStatus(ctx: AuthContext): Promise<boolean> {
  let user = await db.query.users.findFirst({
    where: eq(users.id, ctx.userId),
    columns: { onboardingCompleted: true },
  });

  // Handles the case where Clerk webhook didn't fire in local dev. The caller
  // passes an AuthContext, which is produced by getCurrentUserAndFamily() — so
  // the user row (and its family) has already been materialized by the time we
  // get here. This insert is a defensive fallback only; it reuses ctx.familyId
  // because users.family_id is NOT NULL.
  if (!user) {
    const clerk = await currentUser();
    if (!clerk) return false;
    await db
      .insert(users)
      .values({
        id: clerk.id,
        email: clerk.emailAddresses[0]?.emailAddress || "",
        firstName: clerk.firstName,
        lastName: clerk.lastName,
        imageUrl: clerk.imageUrl,
        onboardingCompleted: false,
        familyId: ctx.familyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoNothing();
    user = await db.query.users.findFirst({
      where: eq(users.id, clerk.id),
      columns: { onboardingCompleted: true },
    });
  }
  return user?.onboardingCompleted ?? false;
}

export async function completeOnboarding(ctx: AuthContext): Promise<void> {
  await db
    .update(users)
    .set({ onboardingCompleted: true, updatedAt: new Date() })
    .where(eq(users.id, ctx.userId));
}

export async function getOnboardingData(ctx: AuthContext) {
  const [members, incomeRows, holdings] = await Promise.all([
    db.query.familyMembers.findMany({
      where: eq(familyMembers.familyId, ctx.familyId),
    }),
    db.query.incomes.findMany({
      where: eq(incomes.familyId, ctx.familyId),
    }),
    db.query.currentHoldings.findMany({
      where: eq(currentHoldings.familyId, ctx.familyId),
    }),
  ]);
  return { familyMembers: members, incomes: incomeRows, currentHoldings: holdings };
}

// Deletes all existing current-recurring expenses and re-creates from the
// wizard input. Replacement semantics — matches the original action.
export async function createOnboardingExpenses(
  ctx: AuthContext,
  body: CreateOnboardingExpensesBody
): Promise<void> {
  const { categories, percentageOfIncome, monthlyIncome, categoryAmounts } = body;

  await db.delete(expenses).where(
    and(
      eq(expenses.familyId, ctx.familyId),
      eq(expenses.expenseCategory, "current-recurring")
    )
  );

  if (categories.length === 0) return;

  const totalExpenses = monthlyIncome * (percentageOfIncome / 100);
  const totalWeight = categories.reduce(
    (sum, cat) => sum + (CATEGORY_WEIGHTS[cat] ?? 5),
    0
  );

  const records = categories.map((category) => {
    let amount: number;
    if (categoryAmounts && categoryAmounts[category]) {
      amount = parseFloat(categoryAmounts[category]) || 0;
    } else {
      const weight = CATEGORY_WEIGHTS[category] ?? 5;
      const proportion = weight / totalWeight;
      amount = Math.round(totalExpenses * proportion * 100) / 100;
    }
    return {
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      userId: ctx.userId,
      familyId: ctx.familyId,
      name: category,
      category,
      expenseCategory: "current-recurring",
      amount: amount.toFixed(2),
      frequency: "monthly",
      isActive: true,
    };
  });

  if (records.length > 0) {
    await db.insert(expenses).values(records);
  }
}
