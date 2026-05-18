import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { familyMembers, incomesBeta } from "@/db/schema";
import { calculateCPF } from "@/lib/cpf-calculator";
import type { AuthContext } from "@/lib/auth-context";
import type {
  CreateIncomeBody,
  UpdateIncomeBody,
} from "@/lib/api-schemas/incomes";

export type IncomeRow = typeof incomesBeta.$inferSelect;

export class IncomeNotFoundError extends Error {
  constructor() {
    super("Income not found");
  }
}

function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

// Resolves the CPF contribution fields based on the row's subjectToCpf state,
// the amount, and (if available) the linked family member's date of birth.
// Returns nulls across the board when subjectToCpf is false.
async function resolveCpfFields(opts: {
  subjectToCpf: boolean;
  amount: number;
  familyMemberId: string | null;
  familyMemberAge?: number;
}): Promise<{
  employeeCpfContribution: string | null;
  employerCpfContribution: string | null;
  netTakeHome: string | null;
}> {
  if (!opts.subjectToCpf) {
    return {
      employeeCpfContribution: null,
      employerCpfContribution: null,
      netTakeHome: null,
    };
  }
  let age = opts.familyMemberAge ?? 30;
  if (opts.familyMemberAge === undefined && opts.familyMemberId) {
    const fm = await db.query.familyMembers.findFirst({
      where: eq(familyMembers.id, opts.familyMemberId),
    });
    if (fm?.dateOfBirth) age = calculateAge(new Date(fm.dateOfBirth));
  }
  const cpf = calculateCPF(opts.amount, age);
  return {
    employeeCpfContribution: cpf.employeeCpfContribution.toString(),
    employerCpfContribution: cpf.employerCpfContribution.toString(),
    netTakeHome: cpf.netTakeHome.toString(),
  };
}

// List all incomes for the caller's family, including the linked family
// member columns the existing UI needs. Family-scoped: returns rows for every
// member of the family, not just the caller.
export async function listIncomes(ctx: AuthContext): Promise<
  Array<IncomeRow & {
    familyMember: {
      id: string;
      name: string;
      relationship: string | null;
      dateOfBirth: string | null;
      isContributing: boolean | null;
    } | null;
  }>
> {
  const rows = await db.query.incomesBeta.findMany({
    where: eq(incomesBeta.familyId, ctx.familyId),
    orderBy: [desc(incomesBeta.createdAt)],
    with: {
      familyMember: {
        columns: {
          id: true,
          name: true,
          relationship: true,
          dateOfBirth: true,
          isContributing: true,
        },
      },
    },
  });
  return rows;
}

export async function getIncomeById(
  ctx: AuthContext,
  id: string
): Promise<IncomeRow | null> {
  const row = await db.query.incomesBeta.findFirst({
    where: and(eq(incomesBeta.id, id), eq(incomesBeta.familyId, ctx.familyId)),
  });
  return row ?? null;
}

export async function createIncome(
  ctx: AuthContext,
  body: CreateIncomeBody
): Promise<IncomeRow> {
  const cpf = await resolveCpfFields({
    subjectToCpf: body.subjectToCpf,
    amount: Number(body.amount),
    familyMemberId: body.familyMemberId ?? null,
    familyMemberAge: body.familyMemberAge,
  });

  const [row] = await db
    .insert(incomesBeta)
    .values({
      id: nanoid(),
      userId: ctx.userId,
      familyId: ctx.familyId,
      familyMemberId: body.familyMemberId ?? null,
      name: body.name,
      category: body.category,
      incomeCategory: body.incomeCategory ?? "current",
      amount: body.amount,
      subjectToCpf: body.subjectToCpf,
      accountForBonus: body.accountForBonus ?? false,
      bonusGroups: body.bonusGroups ?? null,
      employeeCpfContribution: cpf.employeeCpfContribution,
      employerCpfContribution: cpf.employerCpfContribution,
      netTakeHome: cpf.netTakeHome,
      cpfOrdinaryAccount: body.cpfOrdinaryAccount ?? null,
      cpfSpecialAccount: body.cpfSpecialAccount ?? null,
      cpfMedisaveAccount: body.cpfMedisaveAccount ?? null,
      startDate: body.startDate,
      endDate: body.endDate ?? null,
      pastIncomeHistory: body.pastIncomeHistory ?? null,
      futureMilestones: body.futureMilestones ?? null,
      accountForFutureChange: body.accountForFutureChange ?? false,
      description: body.description ?? null,
      isActive: true,
    })
    .returning();
  return row;
}

export async function updateIncome(
  ctx: AuthContext,
  id: string,
  patch: UpdateIncomeBody
): Promise<IncomeRow> {
  const existing = await getIncomeById(ctx, id);
  if (!existing) throw new IncomeNotFoundError();

  const update: Partial<typeof incomesBeta.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.category !== undefined) update.category = patch.category;
  if (patch.incomeCategory !== undefined) update.incomeCategory = patch.incomeCategory;
  if (patch.amount !== undefined) update.amount = patch.amount;
  if (patch.subjectToCpf !== undefined) update.subjectToCpf = patch.subjectToCpf;
  if (patch.accountForBonus !== undefined) update.accountForBonus = patch.accountForBonus;
  if (patch.bonusGroups !== undefined) update.bonusGroups = patch.bonusGroups ?? null;
  if (patch.startDate !== undefined) update.startDate = patch.startDate;
  if (patch.endDate !== undefined) update.endDate = patch.endDate ?? null;
  if (patch.pastIncomeHistory !== undefined) update.pastIncomeHistory = patch.pastIncomeHistory ?? null;
  if (patch.futureMilestones !== undefined) update.futureMilestones = patch.futureMilestones ?? null;
  if (patch.accountForFutureChange !== undefined) update.accountForFutureChange = patch.accountForFutureChange;
  if (patch.description !== undefined) update.description = patch.description ?? null;
  if (patch.isActive !== undefined) update.isActive = patch.isActive;
  if (patch.familyMemberId !== undefined) update.familyMemberId = patch.familyMemberId ?? null;
  if (patch.cpfOrdinaryAccount !== undefined) update.cpfOrdinaryAccount = patch.cpfOrdinaryAccount ?? null;
  if (patch.cpfSpecialAccount !== undefined) update.cpfSpecialAccount = patch.cpfSpecialAccount ?? null;
  if (patch.cpfMedisaveAccount !== undefined) update.cpfMedisaveAccount = patch.cpfMedisaveAccount ?? null;

  // CPF is a function of (subjectToCpf, amount, age). Recompute whenever any
  // input could have shifted — mirrors lib/actions/incomes-beta.ts behavior so
  // the action delegating to this service stays observably identical.
  const finalAmount =
    patch.amount !== undefined ? Number(patch.amount) : Number(existing.amount);
  const finalSubject =
    patch.subjectToCpf !== undefined
      ? patch.subjectToCpf
      : (existing.subjectToCpf ?? false);
  const effectiveFamilyMemberId =
    patch.familyMemberId !== undefined
      ? (patch.familyMemberId ?? null)
      : existing.familyMemberId;

  const cpf = await resolveCpfFields({
    subjectToCpf: finalSubject,
    amount: finalAmount,
    familyMemberId: effectiveFamilyMemberId,
    familyMemberAge: patch.familyMemberAge,
  });
  update.employeeCpfContribution = cpf.employeeCpfContribution;
  update.employerCpfContribution = cpf.employerCpfContribution;
  update.netTakeHome = cpf.netTakeHome;

  const [row] = await db
    .update(incomesBeta)
    .set(update)
    .where(and(eq(incomesBeta.id, id), eq(incomesBeta.familyId, ctx.familyId)))
    .returning();
  return row;
}

export async function toggleIncomeActive(
  ctx: AuthContext,
  id: string
): Promise<IncomeRow> {
  const existing = await getIncomeById(ctx, id);
  if (!existing) throw new IncomeNotFoundError();
  const [row] = await db
    .update(incomesBeta)
    .set({ isActive: !existing.isActive, updatedAt: new Date() })
    .where(and(eq(incomesBeta.id, id), eq(incomesBeta.familyId, ctx.familyId)))
    .returning();
  return row;
}

export async function deleteIncome(ctx: AuthContext, id: string): Promise<void> {
  const existing = await getIncomeById(ctx, id);
  if (!existing) throw new IncomeNotFoundError();
  await db
    .delete(incomesBeta)
    .where(and(eq(incomesBeta.id, id), eq(incomesBeta.familyId, ctx.familyId)));
}
