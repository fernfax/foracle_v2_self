"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { propertyAssets, expenses } from "@/db/schema";
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
 * Create a new property asset
 */
export async function createPropertyAsset(data: {
  propertyName: string;
  purchaseDate: string;
  originalPurchasePrice: number;
  loanAmountTaken?: number;
  outstandingLoan: number;
  monthlyLoanPayment: number;
  interestRate: number;
  principalCpfWithdrawn?: number;
  housingGrantTaken?: number;
  accruedInterestToDate?: number;
  addToExpenditures?: boolean;
  expenseName?: string; // Customizable expense name
  expenditureAmount?: number; // Customizable expenditure amount
}) {
  const userId = await getCurrentUserId();

  const propertyId = nanoid();
  let linkedExpenseId: string | null = null;

  // If addToExpenditures is true, create an expense record
  const expenseAmount = data.expenditureAmount ?? data.monthlyLoanPayment;
  if (data.addToExpenditures && expenseAmount > 0) {
    const expenseId = nanoid();
    await db.insert(expenses).values({
      id: expenseId,
      userId,
      linkedPropertyId: propertyId, // Link back to property
      name: data.expenseName || `${data.propertyName} - Loan Payment`,
      category: "Housing",
      expenseCategory: "current-recurring",
      amount: expenseAmount.toString(),
      frequency: "Monthly",
      startDate: data.purchaseDate,
      description: `Auto-generated from property asset: ${data.propertyName}`,
      isActive: true,
    });
    linkedExpenseId = expenseId;
  }

  const newPropertyAsset = await db.insert(propertyAssets).values({
    id: propertyId,
    userId,
    linkedExpenseId,
    propertyName: data.propertyName,
    purchaseDate: data.purchaseDate,
    originalPurchasePrice: data.originalPurchasePrice.toString(),
    loanAmountTaken: data.loanAmountTaken?.toString() || null,
    outstandingLoan: data.outstandingLoan.toString(),
    monthlyLoanPayment: data.monthlyLoanPayment.toString(),
    interestRate: data.interestRate.toString(),
    principalCpfWithdrawn: data.principalCpfWithdrawn?.toString() || null,
    housingGrantTaken: data.housingGrantTaken?.toString() || null,
    accruedInterestToDate: data.accruedInterestToDate?.toString() || null,
    isActive: true,
  }).returning();

  revalidatePath("/dashboard/user/assets");
  revalidatePath("/dashboard/user/expenses");
  return newPropertyAsset[0];
}

/**
 * Get all property assets for the current user
 */
export async function getPropertyAssets() {
  const userId = await getCurrentUserId();

  const properties = await db
    .select()
    .from(propertyAssets)
    .where(eq(propertyAssets.userId, userId))
    .orderBy(propertyAssets.createdAt);

  return properties;
}

/**
 * Update an existing property asset
 */
export async function updatePropertyAsset(
  id: string,
  data: {
    propertyName: string;
    purchaseDate: string;
    originalPurchasePrice: number;
    loanAmountTaken?: number;
    outstandingLoan: number;
    monthlyLoanPayment: number;
    interestRate: number;
    principalCpfWithdrawn?: number;
    housingGrantTaken?: number;
    accruedInterestToDate?: number;
    addToExpenditures?: boolean;
    expenseName?: string; // Customizable expense name
    expenditureAmount?: number; // Customizable expenditure amount
  }
) {
  const userId = await getCurrentUserId();

  // Get the existing property to check for linked expense
  const existing = await db
    .select()
    .from(propertyAssets)
    .where(and(eq(propertyAssets.id, id), eq(propertyAssets.userId, userId)))
    .limit(1);

  if (!existing.length) {
    throw new Error("Property asset not found");
  }

  const existingProperty = existing[0];
  let linkedExpenseId = existingProperty.linkedExpenseId;

  // Handle expense integration
  const expenseAmount = data.expenditureAmount ?? data.monthlyLoanPayment;
  if (data.addToExpenditures && expenseAmount > 0) {
    if (linkedExpenseId) {
      // Update existing expense
      await db.update(expenses)
        .set({
          name: data.expenseName || `${data.propertyName} - Loan Payment`,
          amount: expenseAmount.toString(),
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
        linkedPropertyId: id, // Link back to property
        name: data.expenseName || `${data.propertyName} - Loan Payment`,
        category: "Housing",
        expenseCategory: "current-recurring",
        amount: expenseAmount.toString(),
        frequency: "Monthly",
        startDate: data.purchaseDate,
        description: `Auto-generated from property asset: ${data.propertyName}`,
        isActive: true,
      });
      linkedExpenseId = expenseId;
    }
  } else if (!data.addToExpenditures && linkedExpenseId) {
    // Remove linked expense if toggle is turned off
    await db.delete(expenses).where(eq(expenses.id, linkedExpenseId));
    linkedExpenseId = null;
  }

  const updated = await db.update(propertyAssets)
    .set({
      linkedExpenseId,
      propertyName: data.propertyName,
      purchaseDate: data.purchaseDate,
      originalPurchasePrice: data.originalPurchasePrice.toString(),
      loanAmountTaken: data.loanAmountTaken?.toString() || null,
      outstandingLoan: data.outstandingLoan.toString(),
      monthlyLoanPayment: data.monthlyLoanPayment.toString(),
      interestRate: data.interestRate.toString(),
      principalCpfWithdrawn: data.principalCpfWithdrawn?.toString() || null,
      housingGrantTaken: data.housingGrantTaken?.toString() || null,
      accruedInterestToDate: data.accruedInterestToDate?.toString() || null,
      updatedAt: new Date(),
    })
    .where(and(eq(propertyAssets.id, id), eq(propertyAssets.userId, userId)))
    .returning();

  revalidatePath("/dashboard/user/assets");
  revalidatePath("/dashboard/user/expenses");
  return updated[0];
}

/**
 * Delete a property asset
 */
export async function deletePropertyAsset(id: string) {
  const userId = await getCurrentUserId();

  // Get the property to check for linked expense
  const existing = await db
    .select()
    .from(propertyAssets)
    .where(and(eq(propertyAssets.id, id), eq(propertyAssets.userId, userId)))
    .limit(1);

  if (!existing.length) {
    throw new Error("Property asset not found");
  }

  // Delete linked expense if exists
  if (existing[0].linkedExpenseId) {
    await db.delete(expenses).where(eq(expenses.id, existing[0].linkedExpenseId));
  }

  await db.delete(propertyAssets)
    .where(and(eq(propertyAssets.id, id), eq(propertyAssets.userId, userId)));

  revalidatePath("/dashboard/user/assets");
  revalidatePath("/dashboard/user/expenses");
}
