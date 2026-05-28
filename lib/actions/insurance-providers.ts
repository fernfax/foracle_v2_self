"use server";

import { db } from "@/db";
import { insuranceProviders } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getCurrentUserAndFamily, type AuthContext } from "@/lib/auth-context";

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
 * Get all insurance providers for the caller's family
 */
export async function getInsuranceProviders(): Promise<InsuranceProvider[]> {
  try {
    const ctx = await getCurrentUserAndFamily();

    const providers = await db
      .select()
      .from(insuranceProviders)
      .where(eq(insuranceProviders.familyId, ctx.familyId))
      .orderBy(asc(insuranceProviders.name));

    // If no providers exist for this family, create defaults
    if (providers.length === 0) {
      await initializeDefaultProviders(ctx);
      return getInsuranceProviders();
    }

    return providers;
  } catch (error) {
    console.error("Error fetching insurance providers:", error);
    return [];
  }
}

/**
 * Initialize default providers for a family
 */
async function initializeDefaultProviders(ctx: AuthContext): Promise<void> {
  const defaultProviders = DEFAULT_PROVIDERS.map((name) => ({
    id: randomUUID(),
    userId: ctx.userId,
    familyId: ctx.familyId,
    name,
    isDefault: true,
  }));

  await db.insert(insuranceProviders).values(defaultProviders);
}

/**
 * Add a new insurance provider
 */
export async function addInsuranceProvider(name: string): Promise<InsuranceProvider> {
  const { userId, familyId } = await getCurrentUserAndFamily();

  const id = randomUUID();

  const [newProvider] = await db
    .insert(insuranceProviders)
    .values({
      id,
      userId,
      familyId,
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
  const { familyId } = await getCurrentUserAndFamily();

  const existing = await db.query.insuranceProviders.findFirst({
    where: and(eq(insuranceProviders.id, id), eq(insuranceProviders.familyId, familyId)),
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
    .where(and(eq(insuranceProviders.id, id), eq(insuranceProviders.familyId, familyId)))
    .returning();

  return updatedProvider;
}

/**
 * Delete an insurance provider
 */
export async function deleteInsuranceProvider(id: string): Promise<void> {
  const { familyId } = await getCurrentUserAndFamily();

  await db
    .delete(insuranceProviders)
    .where(and(eq(insuranceProviders.id, id), eq(insuranceProviders.familyId, familyId)));
}
