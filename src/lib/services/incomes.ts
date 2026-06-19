import { db } from "@/db"
import { and, desc, eq } from "drizzle-orm"
import { nanoid } from "nanoid"

import {
  createIncomeBodySchema,
  updateIncomeBodySchema,
  type CreateIncomeBody,
  type UpdateIncomeBody
} from "@/lib/api-schemas/incomes"
import type { AuthContext } from "@/lib/auth-context"
import { resolveCpfAge } from "@/lib/cpf/cpf-age"
import { calculateCPF, CPF_RATES_VERSION } from "@/lib/cpf/cpf-calculator"
import { familyMembers, incomes } from "@/db/schema"

export type IncomeRow = typeof incomes.$inferSelect

export class IncomeNotFoundError extends Error {
  constructor() {
    super("Income not found")
  }
}

type ResolvedCpf = {
  employeeCpfContribution: string | null
  employerCpfContribution: string | null
  netTakeHome: string | null
  cpfRatesVersion: string | null
}

const CPF_OFF: ResolvedCpf = {
  employeeCpfContribution: null,
  employerCpfContribution: null,
  netTakeHome: null,
  cpfRatesVersion: null
}

// Resolve the CPF contribution fields. POLICY (member + DOB, decided 2026-06-10):
// CPF is computed ONLY when the income is subject to CPF AND linked to a family
// member — scoped to the caller's family — who has a date of birth. With no
// member or no DOB, CPF is OFF (the amount is take-home/gross). The age comes
// solely from the member's DOB; any client-supplied age is ignored (closing the
// tamper hole where a client could send an age to shrink CPF).
export async function resolveCpfFields(opts: {
  subjectToCpf: boolean
  amount: number
  familyId: string
  familyMemberId: string | null
}): Promise<ResolvedCpf> {
  if (!opts.subjectToCpf || !opts.familyMemberId) return CPF_OFF

  const fm = await db.query.familyMembers.findFirst({
    where: and(
      eq(familyMembers.id, opts.familyMemberId),
      eq(familyMembers.familyId, opts.familyId)
    )
  })
  const age = resolveCpfAge(fm?.dateOfBirth ?? null)
  if (age === null) return CPF_OFF // foreign/unknown member or no DOB → CPF locked

  const cpf = calculateCPF(opts.amount, age)
  return {
    employeeCpfContribution: cpf.employeeCpfContribution.toString(),
    employerCpfContribution: cpf.employerCpfContribution.toString(),
    netTakeHome: cpf.netTakeHome.toString(),
    cpfRatesVersion: CPF_RATES_VERSION
  }
}

// List all incomes for the caller's family, including the linked family
// member columns the existing UI needs. Family-scoped: returns rows for every
// member of the family, not just the caller.
export async function listIncomes(ctx: AuthContext): Promise<
  Array<
    IncomeRow & {
      familyMember: {
        id: string
        name: string
        relationship: string | null
        dateOfBirth: string | null
        isContributing: boolean | null
      } | null
    }
  >
> {
  const rows = await db.query.incomes.findMany({
    where: eq(incomes.familyId, ctx.familyId),
    orderBy: [desc(incomes.createdAt)],
    with: {
      familyMember: {
        columns: {
          id: true,
          name: true,
          relationship: true,
          dateOfBirth: true,
          isContributing: true
        }
      }
    }
  })
  // Recompute-on-read: a CPF row stamped with an older rate set (e.g. after a
  // January rate change) is shown with fresh values so the UI never displays
  // stale CPF. Read-only — the durable rewrite is the backfill migration; this
  // just self-heals the display until it runs. Rows without a DOB'd member are
  // left as gross (CPF stays off, matching the member+DOB policy).
  return rows.map((row) => {
    if (
      !row.subjectToCpf ||
      row.cpfRatesVersion === CPF_RATES_VERSION ||
      !row.familyMember?.dateOfBirth
    ) {
      return row
    }
    const age = resolveCpfAge(row.familyMember.dateOfBirth)
    if (age === null) return row
    const cpf = calculateCPF(Number(row.amount), age)
    return {
      ...row,
      employeeCpfContribution: cpf.employeeCpfContribution.toString(),
      employerCpfContribution: cpf.employerCpfContribution.toString(),
      netTakeHome: cpf.netTakeHome.toString(),
      cpfRatesVersion: CPF_RATES_VERSION
    }
  })
}

export async function getIncomeById(
  ctx: AuthContext,
  id: string
): Promise<IncomeRow | null> {
  const row = await db.query.incomes.findFirst({
    where: and(eq(incomes.id, id), eq(incomes.familyId, ctx.familyId))
  })
  return row ?? null
}

export async function createIncome(
  ctx: AuthContext,
  body: CreateIncomeBody
): Promise<IncomeRow> {
  // Enforce the wire contract at runtime: positive amount, valid dates/enums,
  // no negatives/NaN/$0. The schema was previously type-only and never ran.
  createIncomeBodySchema.parse(body)

  const cpf = await resolveCpfFields({
    subjectToCpf: body.subjectToCpf,
    amount: Number(body.amount),
    familyId: ctx.familyId,
    familyMemberId: body.familyMemberId ?? null
  })

  const [row] = await db
    .insert(incomes)
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
      cpfRatesVersion: cpf.cpfRatesVersion,
      cpfOrdinaryAccount: body.cpfOrdinaryAccount ?? null,
      cpfSpecialAccount: body.cpfSpecialAccount ?? null,
      cpfMedisaveAccount: body.cpfMedisaveAccount ?? null,
      startDate: body.startDate,
      endDate: body.endDate ?? null,
      pastIncomeHistory: body.pastIncomeHistory ?? null,
      futureMilestones: body.futureMilestones ?? null,
      accountForFutureChange: body.accountForFutureChange ?? false,
      description: body.description ?? null,
      isActive: true
    })
    .returning()
  return row
}

export async function updateIncome(
  ctx: AuthContext,
  id: string,
  patch: UpdateIncomeBody
): Promise<IncomeRow> {
  updateIncomeBodySchema.parse(patch)

  const existing = await getIncomeById(ctx, id)
  if (!existing) throw new IncomeNotFoundError()

  const update: Partial<typeof incomes.$inferInsert> = {
    updatedAt: new Date()
  }
  if (patch.name !== undefined) update.name = patch.name
  if (patch.category !== undefined) update.category = patch.category
  if (patch.incomeCategory !== undefined)
    update.incomeCategory = patch.incomeCategory
  if (patch.amount !== undefined) update.amount = patch.amount
  if (patch.subjectToCpf !== undefined) update.subjectToCpf = patch.subjectToCpf
  if (patch.accountForBonus !== undefined)
    update.accountForBonus = patch.accountForBonus
  if (patch.bonusGroups !== undefined)
    update.bonusGroups = patch.bonusGroups ?? null
  if (patch.startDate !== undefined) update.startDate = patch.startDate
  if (patch.endDate !== undefined) update.endDate = patch.endDate ?? null
  if (patch.pastIncomeHistory !== undefined)
    update.pastIncomeHistory = patch.pastIncomeHistory ?? null
  if (patch.futureMilestones !== undefined)
    update.futureMilestones = patch.futureMilestones ?? null
  if (patch.accountForFutureChange !== undefined)
    update.accountForFutureChange = patch.accountForFutureChange
  if (patch.description !== undefined)
    update.description = patch.description ?? null
  if (patch.isActive !== undefined) update.isActive = patch.isActive
  if (patch.familyMemberId !== undefined)
    update.familyMemberId = patch.familyMemberId ?? null
  if (patch.cpfOrdinaryAccount !== undefined)
    update.cpfOrdinaryAccount = patch.cpfOrdinaryAccount ?? null
  if (patch.cpfSpecialAccount !== undefined)
    update.cpfSpecialAccount = patch.cpfSpecialAccount ?? null
  if (patch.cpfMedisaveAccount !== undefined)
    update.cpfMedisaveAccount = patch.cpfMedisaveAccount ?? null

  // CPF is a function of (subjectToCpf, amount, age). Recompute whenever any
  // input could have shifted — mirrors the incomes service behavior so
  // the action delegating to this service stays observably identical.
  const finalAmount =
    patch.amount !== undefined ? Number(patch.amount) : Number(existing.amount)
  const finalSubject =
    patch.subjectToCpf !== undefined
      ? patch.subjectToCpf
      : (existing.subjectToCpf ?? false)
  const effectiveFamilyMemberId =
    patch.familyMemberId !== undefined
      ? (patch.familyMemberId ?? null)
      : existing.familyMemberId

  const cpf = await resolveCpfFields({
    subjectToCpf: finalSubject,
    amount: finalAmount,
    familyId: ctx.familyId,
    familyMemberId: effectiveFamilyMemberId
  })
  update.employeeCpfContribution = cpf.employeeCpfContribution
  update.employerCpfContribution = cpf.employerCpfContribution
  update.netTakeHome = cpf.netTakeHome
  update.cpfRatesVersion = cpf.cpfRatesVersion

  const [row] = await db
    .update(incomes)
    .set(update)
    .where(and(eq(incomes.id, id), eq(incomes.familyId, ctx.familyId)))
    .returning()
  return row
}

export async function toggleIncomeActive(
  ctx: AuthContext,
  id: string
): Promise<IncomeRow> {
  const existing = await getIncomeById(ctx, id)
  if (!existing) throw new IncomeNotFoundError()
  const [row] = await db
    .update(incomes)
    .set({ isActive: !existing.isActive, updatedAt: new Date() })
    .where(and(eq(incomes.id, id), eq(incomes.familyId, ctx.familyId)))
    .returning()
  return row
}

export async function deleteIncome(
  ctx: AuthContext,
  id: string
): Promise<void> {
  const existing = await getIncomeById(ctx, id)
  if (!existing) throw new IncomeNotFoundError()
  await db
    .delete(incomes)
    .where(and(eq(incomes.id, id), eq(incomes.familyId, ctx.familyId)))
}
