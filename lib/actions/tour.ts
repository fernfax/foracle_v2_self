"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type TourName = "overall" | "dashboard" | "incomes" | "expenses";

export type TourStatus = Record<TourName, string | null>;

/**
 * Get the tour completion status for the current user
 */
export async function getTourStatus(): Promise<TourStatus> {
  const { userId } = await auth();
  if (!userId) {
    return { overall: null, dashboard: null, incomes: null, expenses: null };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { tourCompletedAt: true },
  });

  if (!user?.tourCompletedAt) {
    return { overall: null, dashboard: null, incomes: null, expenses: null };
  }

  try {
    return JSON.parse(user.tourCompletedAt);
  } catch {
    return { overall: null, dashboard: null, incomes: null, expenses: null };
  }
}

/**
 * Mark a specific tour as completed
 */
export async function markTourCompleted(tourName: TourName): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  const existing = await getTourStatus();
  existing[tourName] = new Date().toISOString();

  await db
    .update(users)
    .set({
      tourCompletedAt: JSON.stringify(existing),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Reset a tour so it can be replayed (for manual replay via Help button)
 */
export async function resetTourStatus(tourName: TourName): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  const existing = await getTourStatus();
  existing[tourName] = null;

  await db
    .update(users)
    .set({
      tourCompletedAt: JSON.stringify(existing),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Check if a specific tour has been completed
 */
export async function isTourCompleted(tourName: TourName): Promise<boolean> {
  const status = await getTourStatus();
  return status[tourName] !== null;
}
