import { randomUUID } from "crypto"
import { db } from "@/db"
import { and, asc, eq } from "drizzle-orm"

import type {
  CreatePropertyAssetBody,
  ListPropertyAssetsQuery,
  UpdatePropertyAssetBody
} from "@/lib/api-schemas/property-assets"
import type { AuthContext } from "@/lib/auth-context"
import { expenses, propertyAssets } from "@/db/schema"
import type { PropertyAsset } from "@/db/types"

export class PropertyAssetNotFoundError extends Error {
  constructor() {
    super("Property asset not found")
  }
}

export type CreatePropertyAssetResult =
  | { status: "created"; row: PropertyAsset }
  | { status: "conflict"; row: PropertyAsset }

function expenseNameFor(
  propertyName: string,
  override?: string | null
): string {
  return override?.trim() ? override : `${propertyName} - Loan Payment`
}

async function ensureLinkedExpense(opts: {
  ctx: AuthContext
  propertyId: string
  propertyName: string
  amount: string
  startDate: string
  expenseName?: string | null
  existingExpenseId: string | null
}): Promise<string> {
  if (opts.existingExpenseId) {
    await db
      .update(expenses)
      .set({
        name: expenseNameFor(opts.propertyName, opts.expenseName),
        amount: opts.amount,
        startDate: opts.startDate,
        updatedAt: new Date()
      })
      .where(eq(expenses.id, opts.existingExpenseId))
    return opts.existingExpenseId
  }
  const id = randomUUID()
  await db.insert(expenses).values({
    id,
    userId: opts.ctx.userId,
    familyId: opts.ctx.familyId,
    linkedPropertyId: opts.propertyId,
    name: expenseNameFor(opts.propertyName, opts.expenseName),
    category: "Housing",
    expenseCategory: "current-recurring",
    amount: opts.amount,
    frequency: "Monthly",
    startDate: opts.startDate,
    description: `Auto-generated from property asset: ${opts.propertyName}`,
    isActive: true
  })
  return id
}

export async function listPropertyAssets(
  ctx: AuthContext,
  filters: ListPropertyAssetsQuery = {}
): Promise<PropertyAsset[]> {
  const conditions = [eq(propertyAssets.familyId, ctx.familyId)]
  if (filters.isActive !== undefined)
    conditions.push(eq(propertyAssets.isActive, filters.isActive))
  return db
    .select()
    .from(propertyAssets)
    .where(and(...conditions))
    .orderBy(asc(propertyAssets.createdAt))
}

export async function getPropertyAssetById(
  ctx: AuthContext,
  id: string
): Promise<PropertyAsset | null> {
  const row = await db.query.propertyAssets.findFirst({
    where: and(
      eq(propertyAssets.id, id),
      eq(propertyAssets.familyId, ctx.familyId)
    )
  })
  return row ?? null
}

export async function createPropertyAsset(
  ctx: AuthContext,
  body: CreatePropertyAssetBody
): Promise<CreatePropertyAssetResult> {
  const propertyId = body.id ?? randomUUID()

  if (body.id) {
    const existing = await db.query.propertyAssets.findFirst({
      where: eq(propertyAssets.id, body.id)
    })
    if (existing) {
      if (existing.familyId !== ctx.familyId) {
        const err = new Error(
          "id collision with another family's row"
        ) as Error & {
          code?: string
        }
        err.code = "CONFLICT"
        throw err
      }
      return { status: "conflict", row: existing }
    }
  }

  let linkedExpenseId: string | null = null
  const expenseAmount = body.expenditureAmount ?? body.monthlyLoanPayment
  if (body.addToExpenditures && expenseAmount && Number(expenseAmount) > 0) {
    linkedExpenseId = await ensureLinkedExpense({
      ctx,
      propertyId,
      propertyName: body.propertyName,
      amount: expenseAmount,
      startDate: body.purchaseDate,
      expenseName: body.expenseName,
      existingExpenseId: null
    })
  }

  const [row] = await db
    .insert(propertyAssets)
    .values({
      id: propertyId,
      userId: ctx.userId,
      familyId: ctx.familyId,
      linkedExpenseId,
      propertyName: body.propertyName,
      purchaseDate: body.purchaseDate,
      originalPurchasePrice: body.originalPurchasePrice,
      loanAmountTaken: body.loanAmountTaken ?? null,
      outstandingLoan: body.outstandingLoan,
      monthlyLoanPayment: body.monthlyLoanPayment,
      interestRate: body.interestRate,
      principalCpfWithdrawn: body.principalCpfWithdrawn ?? null,
      housingGrantTaken: body.housingGrantTaken ?? null,
      accruedInterestToDate: body.accruedInterestToDate ?? null,
      paidByCpf: body.paidByCpf ?? false,
      isActive: true
    })
    .returning()
  return { status: "created", row }
}

export async function updatePropertyAsset(
  ctx: AuthContext,
  id: string,
  patch: UpdatePropertyAssetBody
): Promise<PropertyAsset> {
  const existing = await getPropertyAssetById(ctx, id)
  if (!existing) throw new PropertyAssetNotFoundError()

  let linkedExpenseId = existing.linkedExpenseId
  const effectiveName = patch.propertyName ?? existing.propertyName
  const effectiveStart = patch.purchaseDate ?? existing.purchaseDate
  const effectiveMonthly =
    patch.monthlyLoanPayment !== undefined
      ? patch.monthlyLoanPayment
      : existing.monthlyLoanPayment
  const effectiveExpAmount =
    patch.expenditureAmount !== undefined
      ? patch.expenditureAmount
      : effectiveMonthly

  if (
    patch.addToExpenditures !== undefined ||
    patch.expenditureAmount !== undefined
  ) {
    if (
      patch.addToExpenditures === true &&
      effectiveExpAmount &&
      Number(effectiveExpAmount) > 0
    ) {
      linkedExpenseId = await ensureLinkedExpense({
        ctx,
        propertyId: id,
        propertyName: effectiveName,
        amount: effectiveExpAmount,
        startDate: effectiveStart,
        expenseName: patch.expenseName,
        existingExpenseId: linkedExpenseId
      })
    } else if (patch.addToExpenditures === false && linkedExpenseId) {
      await db.delete(expenses).where(eq(expenses.id, linkedExpenseId))
      linkedExpenseId = null
    }
  }

  const update: Partial<typeof propertyAssets.$inferInsert> = {
    updatedAt: new Date(),
    linkedExpenseId
  }
  if (patch.propertyName !== undefined) update.propertyName = patch.propertyName
  if (patch.purchaseDate !== undefined) update.purchaseDate = patch.purchaseDate
  if (patch.originalPurchasePrice !== undefined)
    update.originalPurchasePrice = patch.originalPurchasePrice
  if (patch.loanAmountTaken !== undefined)
    update.loanAmountTaken = patch.loanAmountTaken ?? null
  if (patch.outstandingLoan !== undefined)
    update.outstandingLoan = patch.outstandingLoan
  if (patch.monthlyLoanPayment !== undefined)
    update.monthlyLoanPayment = patch.monthlyLoanPayment
  if (patch.interestRate !== undefined) update.interestRate = patch.interestRate
  if (patch.principalCpfWithdrawn !== undefined)
    update.principalCpfWithdrawn = patch.principalCpfWithdrawn ?? null
  if (patch.housingGrantTaken !== undefined)
    update.housingGrantTaken = patch.housingGrantTaken ?? null
  if (patch.accruedInterestToDate !== undefined)
    update.accruedInterestToDate = patch.accruedInterestToDate ?? null
  if (patch.paidByCpf !== undefined) update.paidByCpf = patch.paidByCpf
  if (patch.isActive !== undefined) update.isActive = patch.isActive

  const [row] = await db
    .update(propertyAssets)
    .set(update)
    .where(
      and(eq(propertyAssets.id, id), eq(propertyAssets.familyId, ctx.familyId))
    )
    .returning()
  return row
}

export async function deletePropertyAsset(
  ctx: AuthContext,
  id: string
): Promise<void> {
  const existing = await getPropertyAssetById(ctx, id)
  if (!existing) throw new PropertyAssetNotFoundError()
  if (existing.linkedExpenseId) {
    await db.delete(expenses).where(eq(expenses.id, existing.linkedExpenseId))
  }
  await db
    .delete(propertyAssets)
    .where(
      and(eq(propertyAssets.id, id), eq(propertyAssets.familyId, ctx.familyId))
    )
}
