"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { vehicleAssets, expenses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

/**
 * Get the current authenticated user's ID
 */
async function getCurrentUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

/**
 * Create a new vehicle asset
 */
export async function createVehicleAsset(data: {
  vehicleName: string;
  purchaseDate: string;
  coeExpiryDate?: string;
  originalPurchasePrice: number;
  loanAmountTaken?: number;
  loanAmountRepaid?: number;
  monthlyLoanPayment?: number;
  addToExpenditures?: boolean;
  expenseName?: string;
}) {
  const userId = await getCurrentUserId();

  const vehicleId = nanoid();
  let linkedExpenseId: string | null = null;

  // If addToExpenditures is true, create an expense record
  if (data.addToExpenditures && data.monthlyLoanPayment && data.monthlyLoanPayment > 0) {
    const expenseId = nanoid();
    await db.insert(expenses).values({
      id: expenseId,
      userId,
      linkedVehicleId: vehicleId,
      name: data.expenseName || `${data.vehicleName} - Loan Payment`,
      category: "Vehicle",
      expenseCategory: "current-recurring",
      amount: data.monthlyLoanPayment.toString(),
      frequency: "Monthly",
      startDate: data.purchaseDate,
      description: `Auto-generated from vehicle asset: ${data.vehicleName}`,
      isActive: true,
    });
    linkedExpenseId = expenseId;
  }

  const newVehicleAsset = await db.insert(vehicleAssets).values({
    id: vehicleId,
    userId,
    linkedExpenseId,
    vehicleName: data.vehicleName,
    purchaseDate: data.purchaseDate,
    coeExpiryDate: data.coeExpiryDate || null,
    originalPurchasePrice: data.originalPurchasePrice.toString(),
    loanAmountTaken: data.loanAmountTaken?.toString() || null,
    loanAmountRepaid: data.loanAmountRepaid?.toString() || null,
    monthlyLoanPayment: data.monthlyLoanPayment?.toString() || null,
    isActive: true,
  }).returning();

  revalidatePath("/dashboard/user/assets");
  revalidatePath("/dashboard/user/expenses");
  return newVehicleAsset[0];
}

/**
 * Get all vehicle assets for the current user
 */
export async function getVehicleAssets() {
  const userId = await getCurrentUserId();

  const vehicles = await db
    .select()
    .from(vehicleAssets)
    .where(eq(vehicleAssets.userId, userId))
    .orderBy(vehicleAssets.createdAt);

  return vehicles;
}

/**
 * Update an existing vehicle asset
 */
export async function updateVehicleAsset(
  id: string,
  data: {
    vehicleName: string;
    purchaseDate: string;
    coeExpiryDate?: string;
    originalPurchasePrice: number;
    loanAmountTaken?: number;
    loanAmountRepaid?: number;
    monthlyLoanPayment?: number;
    addToExpenditures?: boolean;
    expenseName?: string;
  }
) {
  const userId = await getCurrentUserId();

  // Get the existing vehicle to check for linked expense
  const existing = await db
    .select()
    .from(vehicleAssets)
    .where(and(eq(vehicleAssets.id, id), eq(vehicleAssets.userId, userId)))
    .limit(1);

  if (!existing.length) {
    throw new Error("Vehicle asset not found");
  }

  const existingVehicle = existing[0];
  let linkedExpenseId = existingVehicle.linkedExpenseId;

  // Handle expense integration
  if (data.addToExpenditures && data.monthlyLoanPayment && data.monthlyLoanPayment > 0) {
    if (linkedExpenseId) {
      // Update existing expense
      await db.update(expenses)
        .set({
          name: data.expenseName || `${data.vehicleName} - Loan Payment`,
          amount: data.monthlyLoanPayment.toString(),
          startDate: data.purchaseDate,
          updatedAt: new Date(),
        })
        .where(eq(expenses.id, linkedExpenseId));
    } else {
      // Create new expense
      const expenseId = nanoid();
      await db.insert(expenses).values({
        id: expenseId,
        userId,
        linkedVehicleId: id,
        name: data.expenseName || `${data.vehicleName} - Loan Payment`,
        category: "Vehicle",
        expenseCategory: "current-recurring",
        amount: data.monthlyLoanPayment.toString(),
        frequency: "Monthly",
        startDate: data.purchaseDate,
        description: `Auto-generated from vehicle asset: ${data.vehicleName}`,
        isActive: true,
      });
      linkedExpenseId = expenseId;
    }
  } else if (!data.addToExpenditures && linkedExpenseId) {
    // Remove linked expense if toggle is turned off
    await db.delete(expenses).where(eq(expenses.id, linkedExpenseId));
    linkedExpenseId = null;
  }

  const updated = await db.update(vehicleAssets)
    .set({
      linkedExpenseId,
      vehicleName: data.vehicleName,
      purchaseDate: data.purchaseDate,
      coeExpiryDate: data.coeExpiryDate || null,
      originalPurchasePrice: data.originalPurchasePrice.toString(),
      loanAmountTaken: data.loanAmountTaken?.toString() || null,
      loanAmountRepaid: data.loanAmountRepaid?.toString() || null,
      monthlyLoanPayment: data.monthlyLoanPayment?.toString() || null,
      updatedAt: new Date(),
    })
    .where(and(eq(vehicleAssets.id, id), eq(vehicleAssets.userId, userId)))
    .returning();

  revalidatePath("/dashboard/user/assets");
  revalidatePath("/dashboard/user/expenses");
  return updated[0];
}

/**
 * Delete a vehicle asset
 */
export async function deleteVehicleAsset(id: string) {
  const userId = await getCurrentUserId();

  // Get the vehicle to check for linked expense
  const existing = await db
    .select()
    .from(vehicleAssets)
    .where(and(eq(vehicleAssets.id, id), eq(vehicleAssets.userId, userId)))
    .limit(1);

  if (!existing.length) {
    throw new Error("Vehicle asset not found");
  }

  // Delete linked expense if exists
  if (existing[0].linkedExpenseId) {
    await db.delete(expenses).where(eq(expenses.id, existing[0].linkedExpenseId));
  }

  await db.delete(vehicleAssets)
    .where(and(eq(vehicleAssets.id, id), eq(vehicleAssets.userId, userId)));

  revalidatePath("/dashboard/user/assets");
  revalidatePath("/dashboard/user/expenses");
}
