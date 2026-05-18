import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { expenses, vehicleAssets } from "@/db/schema";
import type { AuthContext } from "@/lib/auth-context";
import type {
  CreateVehicleAssetBody,
  ListVehicleAssetsQuery,
  UpdateVehicleAssetBody,
} from "@/lib/api-schemas/vehicle-assets";

export type VehicleAssetRow = typeof vehicleAssets.$inferSelect;

export class VehicleAssetNotFoundError extends Error {
  constructor() {
    super("Vehicle asset not found");
  }
}

export type CreateVehicleAssetResult =
  | { status: "created"; row: VehicleAssetRow }
  | { status: "conflict"; row: VehicleAssetRow };

function expenseNameFor(vehicleName: string, override?: string | null): string {
  return override?.trim() ? override : `${vehicleName} - Loan Payment`;
}

async function ensureLinkedExpense(opts: {
  ctx: AuthContext;
  vehicleId: string;
  vehicleName: string;
  amount: string;
  startDate: string;
  expenseName?: string | null;
  existingExpenseId: string | null;
}): Promise<string> {
  if (opts.existingExpenseId) {
    await db
      .update(expenses)
      .set({
        name: expenseNameFor(opts.vehicleName, opts.expenseName),
        amount: opts.amount,
        startDate: opts.startDate,
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, opts.existingExpenseId));
    return opts.existingExpenseId;
  }
  const id = randomUUID();
  await db.insert(expenses).values({
    id,
    userId: opts.ctx.userId,
    familyId: opts.ctx.familyId,
    linkedVehicleId: opts.vehicleId,
    name: expenseNameFor(opts.vehicleName, opts.expenseName),
    category: "Vehicle",
    expenseCategory: "current-recurring",
    amount: opts.amount,
    frequency: "Monthly",
    startDate: opts.startDate,
    description: `Auto-generated from vehicle asset: ${opts.vehicleName}`,
    isActive: true,
  });
  return id;
}

export async function listVehicleAssets(
  ctx: AuthContext,
  filters: ListVehicleAssetsQuery = {}
): Promise<VehicleAssetRow[]> {
  const conditions = [eq(vehicleAssets.userId, ctx.userId)];
  if (filters.isActive !== undefined)
    conditions.push(eq(vehicleAssets.isActive, filters.isActive));
  return db
    .select()
    .from(vehicleAssets)
    .where(and(...conditions))
    .orderBy(asc(vehicleAssets.createdAt));
}

export async function getVehicleAssetById(
  ctx: AuthContext,
  id: string
): Promise<VehicleAssetRow | null> {
  const row = await db.query.vehicleAssets.findFirst({
    where: and(eq(vehicleAssets.id, id), eq(vehicleAssets.userId, ctx.userId)),
  });
  return row ?? null;
}

export async function createVehicleAsset(
  ctx: AuthContext,
  body: CreateVehicleAssetBody
): Promise<CreateVehicleAssetResult> {
  const vehicleId = body.id ?? randomUUID();

  if (body.id) {
    const existing = await db.query.vehicleAssets.findFirst({
      where: eq(vehicleAssets.id, body.id),
    });
    if (existing) {
      if (existing.userId !== ctx.userId) {
        const err = new Error("id collision with another user's row") as Error & {
          code?: string;
        };
        err.code = "CONFLICT";
        throw err;
      }
      return { status: "conflict", row: existing };
    }
  }

  let linkedExpenseId: string | null = null;
  if (
    body.addToExpenditures &&
    body.monthlyLoanPayment &&
    Number(body.monthlyLoanPayment) > 0
  ) {
    linkedExpenseId = await ensureLinkedExpense({
      ctx,
      vehicleId,
      vehicleName: body.vehicleName,
      amount: body.monthlyLoanPayment,
      startDate: body.purchaseDate,
      expenseName: body.expenseName,
      existingExpenseId: null,
    });
  }

  const [row] = await db
    .insert(vehicleAssets)
    .values({
      id: vehicleId,
      userId: ctx.userId,
      familyId: ctx.familyId,
      linkedExpenseId,
      vehicleName: body.vehicleName,
      purchaseDate: body.purchaseDate,
      coeExpiryDate: body.coeExpiryDate ?? null,
      originalPurchasePrice: body.originalPurchasePrice,
      loanAmountTaken: body.loanAmountTaken ?? null,
      loanAmountRepaid: body.loanAmountRepaid ?? null,
      monthlyLoanPayment: body.monthlyLoanPayment ?? null,
      isActive: true,
    })
    .returning();
  return { status: "created", row };
}

export async function updateVehicleAsset(
  ctx: AuthContext,
  id: string,
  patch: UpdateVehicleAssetBody
): Promise<VehicleAssetRow> {
  const existing = await getVehicleAssetById(ctx, id);
  if (!existing) throw new VehicleAssetNotFoundError();

  let linkedExpenseId = existing.linkedExpenseId;
  const effectiveName = patch.vehicleName ?? existing.vehicleName;
  const effectiveStart = patch.purchaseDate ?? existing.purchaseDate;
  const effectiveMonthly =
    patch.monthlyLoanPayment !== undefined
      ? patch.monthlyLoanPayment
      : existing.monthlyLoanPayment;

  if (patch.addToExpenditures !== undefined || patch.monthlyLoanPayment !== undefined) {
    if (
      patch.addToExpenditures === true &&
      effectiveMonthly &&
      Number(effectiveMonthly) > 0
    ) {
      linkedExpenseId = await ensureLinkedExpense({
        ctx,
        vehicleId: id,
        vehicleName: effectiveName,
        amount: effectiveMonthly,
        startDate: effectiveStart,
        expenseName: patch.expenseName,
        existingExpenseId: linkedExpenseId,
      });
    } else if (patch.addToExpenditures === false && linkedExpenseId) {
      await db.delete(expenses).where(eq(expenses.id, linkedExpenseId));
      linkedExpenseId = null;
    }
  }

  const update: Partial<typeof vehicleAssets.$inferInsert> = {
    updatedAt: new Date(),
    linkedExpenseId,
  };
  if (patch.vehicleName !== undefined) update.vehicleName = patch.vehicleName;
  if (patch.purchaseDate !== undefined) update.purchaseDate = patch.purchaseDate;
  if (patch.coeExpiryDate !== undefined) update.coeExpiryDate = patch.coeExpiryDate ?? null;
  if (patch.originalPurchasePrice !== undefined)
    update.originalPurchasePrice = patch.originalPurchasePrice;
  if (patch.loanAmountTaken !== undefined)
    update.loanAmountTaken = patch.loanAmountTaken ?? null;
  if (patch.loanAmountRepaid !== undefined)
    update.loanAmountRepaid = patch.loanAmountRepaid ?? null;
  if (patch.monthlyLoanPayment !== undefined)
    update.monthlyLoanPayment = patch.monthlyLoanPayment ?? null;
  if (patch.isActive !== undefined) update.isActive = patch.isActive;

  const [row] = await db
    .update(vehicleAssets)
    .set(update)
    .where(and(eq(vehicleAssets.id, id), eq(vehicleAssets.userId, ctx.userId)))
    .returning();
  return row;
}

export async function deleteVehicleAsset(
  ctx: AuthContext,
  id: string
): Promise<void> {
  const existing = await getVehicleAssetById(ctx, id);
  if (!existing) throw new VehicleAssetNotFoundError();
  if (existing.linkedExpenseId) {
    await db.delete(expenses).where(eq(expenses.id, existing.linkedExpenseId));
  }
  await db
    .delete(vehicleAssets)
    .where(and(eq(vehicleAssets.id, id), eq(vehicleAssets.userId, ctx.userId)));
}
