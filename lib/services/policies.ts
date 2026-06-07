import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { expenses, policies } from "@/db/schema";
import type { AuthContext } from "@/lib/auth-context";
import type {
  CreatePolicyBody,
  ListPoliciesQuery,
  UpdatePolicyBody,
} from "@/lib/api-schemas/policies";

export type PolicyRow = typeof policies.$inferSelect;

export class PolicyNotFoundError extends Error {
  constructor() {
    super("Policy not found");
  }
}

export type CreatePolicyResult =
  | { status: "created"; row: PolicyRow }
  | { status: "conflict"; row: PolicyRow };

export async function listPolicies(
  ctx: AuthContext,
  filters: ListPoliciesQuery = {}
): Promise<PolicyRow[]> {
  const conditions = [eq(policies.familyId, ctx.familyId)];
  if (filters.status !== undefined) conditions.push(eq(policies.status, filters.status));
  if (filters.isActive !== undefined) conditions.push(eq(policies.isActive, filters.isActive));
  if (filters.policyType !== undefined) conditions.push(eq(policies.policyType, filters.policyType));
  if (filters.familyMemberId !== undefined)
    conditions.push(eq(policies.familyMemberId, filters.familyMemberId));

  return db
    .select()
    .from(policies)
    .where(and(...conditions))
    .orderBy(asc(policies.createdAt));
}

export async function getPolicyById(
  ctx: AuthContext,
  id: string
): Promise<PolicyRow | null> {
  const row = await db.query.policies.findFirst({
    where: and(eq(policies.id, id), eq(policies.familyId, ctx.familyId)),
  });
  return row ?? null;
}

export async function createPolicy(
  ctx: AuthContext,
  body: CreatePolicyBody
): Promise<CreatePolicyResult> {
  const id = body.id ?? randomUUID();

  if (body.id) {
    const existing = await db.query.policies.findFirst({
      where: eq(policies.id, body.id),
    });
    if (existing) {
      if (existing.familyId !== ctx.familyId) {
        const err = new Error("id collision with another family's row") as Error & {
          code?: string;
        };
        err.code = "CONFLICT";
        throw err;
      }
      return { status: "conflict", row: existing };
    }
  }

  const [row] = await db
    .insert(policies)
    .values({
      id,
      userId: ctx.userId,
      familyId: ctx.familyId,
      familyMemberId: body.familyMemberId ?? null,
      linkedExpenseId: body.linkedExpenseId ?? null,
      provider: body.provider,
      planName: body.planName ?? null,
      policyNumber: body.policyNumber ?? null,
      policyType: body.policyType,
      status: body.status ?? "active",
      startDate: body.startDate,
      maturityDate: body.maturityDate ?? null,
      coverageUntilAge: body.coverageUntilAge ?? null,
      premiumAmount: body.premiumAmount,
      premiumAmountCPF: body.premiumAmountCPF ?? null,
      premiumFrequency: body.premiumFrequency,
      customMonths: body.customMonths ?? null,
      totalPremiumDuration: body.totalPremiumDuration ?? null,
      coverageOptions: body.coverageOptions ?? null,
      cashValue: body.cashValue ?? null,
      cashValueDate: body.cashValueDate ?? null,
      description: body.description ?? null,
      isActive: true,
    })
    .returning();

  return { status: "created", row };
}

export async function updatePolicy(
  ctx: AuthContext,
  id: string,
  patch: UpdatePolicyBody
): Promise<PolicyRow> {
  const existing = await getPolicyById(ctx, id);
  if (!existing) throw new PolicyNotFoundError();

  const update: Partial<typeof policies.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (patch.familyMemberId !== undefined) update.familyMemberId = patch.familyMemberId ?? null;
  if (patch.linkedExpenseId !== undefined) update.linkedExpenseId = patch.linkedExpenseId ?? null;
  if (patch.provider !== undefined) update.provider = patch.provider;
  if (patch.planName !== undefined) update.planName = patch.planName ?? null;
  if (patch.policyNumber !== undefined) update.policyNumber = patch.policyNumber ?? null;
  if (patch.policyType !== undefined) update.policyType = patch.policyType;
  if (patch.status !== undefined) update.status = patch.status;
  if (patch.startDate !== undefined) update.startDate = patch.startDate;
  if (patch.maturityDate !== undefined) update.maturityDate = patch.maturityDate ?? null;
  if (patch.coverageUntilAge !== undefined) update.coverageUntilAge = patch.coverageUntilAge ?? null;
  if (patch.premiumAmount !== undefined) update.premiumAmount = patch.premiumAmount;
  if (patch.premiumAmountCPF !== undefined) update.premiumAmountCPF = patch.premiumAmountCPF ?? null;
  if (patch.premiumFrequency !== undefined) update.premiumFrequency = patch.premiumFrequency;
  if (patch.customMonths !== undefined) update.customMonths = patch.customMonths ?? null;
  if (patch.totalPremiumDuration !== undefined)
    update.totalPremiumDuration = patch.totalPremiumDuration ?? null;
  if (patch.coverageOptions !== undefined) update.coverageOptions = patch.coverageOptions ?? null;
  if (patch.cashValue !== undefined) update.cashValue = patch.cashValue ?? null;
  if (patch.cashValueDate !== undefined) update.cashValueDate = patch.cashValueDate ?? null;
  if (patch.description !== undefined) update.description = patch.description ?? null;
  if (patch.isActive !== undefined) update.isActive = patch.isActive;

  const [row] = await db
    .update(policies)
    .set(update)
    .where(and(eq(policies.id, id), eq(policies.familyId, ctx.familyId)))
    .returning();
  return row;
}

// Cascades the linked recurring expense if present. Mirrors the pre-extraction
// behavior so dropping a policy doesn't leave an orphan "Insurance - …" row in
// the budget rollup.
export async function deletePolicy(
  ctx: AuthContext,
  id: string
): Promise<void> {
  const existing = await getPolicyById(ctx, id);
  if (!existing) throw new PolicyNotFoundError();
  if (existing.linkedExpenseId) {
    await db.delete(expenses).where(eq(expenses.id, existing.linkedExpenseId));
  }
  await db
    .delete(policies)
    .where(and(eq(policies.id, id), eq(policies.familyId, ctx.familyId)));
}
