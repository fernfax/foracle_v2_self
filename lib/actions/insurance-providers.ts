"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { insuranceProviders } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

export type InsuranceProvider = {
  id: string;
  userId: string;
  name: string;
  isDefault: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

// Default providers that will be created for new users
const DEFAULT_PROVIDERS = [
  "AIA",
  "Prudential",
  "Great Eastern",
  "NTUC Income",
  "Manulife",
  "AXA",
  "Tokio Marine",
  "Singlife",
  "FWD",
  "Other",
];

/**
 * Get all insurance providers for the authenticated user
 */
export async function getInsuranceProviders(): Promise<InsuranceProvider[]> {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const providers = await db
      .select()
      .from(insuranceProviders)
      .where(eq(insuranceProviders.userId, userId))
      .orderBy(asc(insuranceProviders.name));

    // If no providers exist, create default ones
    if (providers.length === 0) {
      await initializeDefaultProviders(userId);
      return getInsuranceProviders();
    }

    return providers;
  } catch (error) {
    console.error("Error fetching insurance providers:", error);
    return [];
  }
}

/**
 * Initialize default providers for a user
 */
async function initializeDefaultProviders(userId: string): Promise<void> {
  const defaultProviders = DEFAULT_PROVIDERS.map((name) => ({
    id: randomUUID(),
    userId,
    name,
    isDefault: true,
  }));

  await db.insert(insuranceProviders).values(defaultProviders);
}

/**
 * Add a new insurance provider
 */
export async function addInsuranceProvider(name: string): Promise<InsuranceProvider> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const id = randomUUID();

  const [newProvider] = await db
    .insert(insuranceProviders)
    .values({
      id,
      userId,
      name,
      isDefault: false,
    })
    .returning();

  return newProvider;
}

/**
 * Update an existing insurance provider
 */
export async function updateInsuranceProvider(
  id: string,
  name: string
): Promise<InsuranceProvider> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Verify ownership
  const existing = await db.query.insuranceProviders.findFirst({
    where: and(eq(insuranceProviders.id, id), eq(insuranceProviders.userId, userId)),
  });

  if (!existing) {
    throw new Error("Provider not found");
  }

  const [updatedProvider] = await db
    .update(insuranceProviders)
    .set({
      name,
      updatedAt: new Date(),
    })
    .where(and(eq(insuranceProviders.id, id), eq(insuranceProviders.userId, userId)))
    .returning();

  return updatedProvider;
}

/**
 * Delete an insurance provider
 */
export async function deleteInsuranceProvider(id: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  await db
    .delete(insuranceProviders)
    .where(and(eq(insuranceProviders.id, id), eq(insuranceProviders.userId, userId)));
}
