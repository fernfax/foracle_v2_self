import { randomUUID } from "crypto"
import { db } from "@/db"
import { and, asc, eq } from "drizzle-orm"

import type {
  CreateInvestmentBody,
  ListInvestmentsQuery,
  UpdateInvestmentBody
} from "@/lib/api-schemas/investments"
import type { AuthContext } from "@/lib/auth-context"
import { investmentPolicies } from "@/db/schema"
import type { Investment } from "@/db/types"

export class InvestmentNotFoundError extends Error {
  constructor() {
    super("Investment not found")
  }
}

export type CreateInvestmentResult =
  | { status: "created"; row: Investment }
  | { status: "conflict"; row: Investment }

export type InvestmentsSummary = {
  totalPortfolioValue: number
  averageYield: number
  totalMonthlyContribution: number
  activeCount: number
}

export async function listInvestments(
  ctx: AuthContext,
  filters: ListInvestmentsQuery = {}
): Promise<Investment[]> {
  const conditions = [eq(investmentPolicies.familyId, ctx.familyId)]
  if (filters.isActive !== undefined)
    conditions.push(eq(investmentPolicies.isActive, filters.isActive))
  if (filters.type !== undefined)
    conditions.push(eq(investmentPolicies.type, filters.type))
  return db
    .select()
    .from(investmentPolicies)
    .where(and(...conditions))
    .orderBy(asc(investmentPolicies.createdAt))
}

export async function getInvestmentById(
  ctx: AuthContext,
  id: string
): Promise<Investment | null> {
  const row = await db.query.investmentPolicies.findFirst({
    where: and(
      eq(investmentPolicies.id, id),
      eq(investmentPolicies.familyId, ctx.familyId)
    )
  })
  return row ?? null
}

export async function createInvestment(
  ctx: AuthContext,
  body: CreateInvestmentBody
): Promise<CreateInvestmentResult> {
  const id = body.id ?? randomUUID()

  if (body.id) {
    const existing = await db.query.investmentPolicies.findFirst({
      where: eq(investmentPolicies.id, body.id)
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

  const [row] = await db
    .insert(investmentPolicies)
    .values({
      id,
      userId: ctx.userId,
      familyId: ctx.familyId,
      name: body.name,
      type: body.type,
      currentCapital: body.currentCapital,
      projectedYield: body.projectedYield,
      contributionAmount: body.contributionAmount,
      contributionFrequency: body.contributionFrequency,
      customMonths: body.customMonths ?? null,
      isActive: true
    })
    .returning()
  return { status: "created", row }
}

export async function updateInvestment(
  ctx: AuthContext,
  id: string,
  patch: UpdateInvestmentBody
): Promise<Investment> {
  const existing = await getInvestmentById(ctx, id)
  if (!existing) throw new InvestmentNotFoundError()

  const update: Partial<typeof investmentPolicies.$inferInsert> = {
    updatedAt: new Date()
  }
  if (patch.name !== undefined) update.name = patch.name
  if (patch.type !== undefined) update.type = patch.type
  if (patch.currentCapital !== undefined)
    update.currentCapital = patch.currentCapital
  if (patch.projectedYield !== undefined)
    update.projectedYield = patch.projectedYield
  if (patch.contributionAmount !== undefined)
    update.contributionAmount = patch.contributionAmount
  if (patch.contributionFrequency !== undefined)
    update.contributionFrequency = patch.contributionFrequency
  if (patch.customMonths !== undefined)
    update.customMonths = patch.customMonths ?? null
  if (patch.isActive !== undefined) update.isActive = patch.isActive

  const [row] = await db
    .update(investmentPolicies)
    .set(update)
    .where(
      and(
        eq(investmentPolicies.id, id),
        eq(investmentPolicies.familyId, ctx.familyId)
      )
    )
    .returning()
  return row
}

export async function deleteInvestment(
  ctx: AuthContext,
  id: string
): Promise<void> {
  const existing = await getInvestmentById(ctx, id)
  if (!existing) throw new InvestmentNotFoundError()
  await db
    .delete(investmentPolicies)
    .where(
      and(
        eq(investmentPolicies.id, id),
        eq(investmentPolicies.familyId, ctx.familyId)
      )
    )
}

// Portfolio summary across all active investments. Mirrors the existing
// lib/actions/investments.ts math (weighted average yield, monthly-equivalent
// for custom-frequency contributions).
export async function getInvestmentsSummary(
  ctx: AuthContext
): Promise<InvestmentsSummary> {
  const rows = await db
    .select()
    .from(investmentPolicies)
    .where(eq(investmentPolicies.familyId, ctx.familyId))
  const active = rows.filter((r) => r.isActive)
  if (active.length === 0) {
    return {
      totalPortfolioValue: 0,
      averageYield: 0,
      totalMonthlyContribution: 0,
      activeCount: 0
    }
  }
  const totalPortfolioValue = active.reduce(
    (acc, r) => acc + parseFloat(r.currentCapital),
    0
  )
  const weighted = active.reduce(
    (acc, r) =>
      acc + parseFloat(r.currentCapital) * parseFloat(r.projectedYield),
    0
  )
  const averageYield =
    totalPortfolioValue > 0 ? weighted / totalPortfolioValue : 0
  const totalMonthlyContribution = active.reduce((acc, r) => {
    const amount = parseFloat(r.contributionAmount)
    if (r.contributionFrequency === "monthly") return acc + amount
    if (r.contributionFrequency === "custom" && r.customMonths) {
      try {
        const months = JSON.parse(r.customMonths) as number[]
        return acc + (amount * months.length) / 12
      } catch {
        return acc
      }
    }
    return acc
  }, 0)
  return {
    totalPortfolioValue,
    averageYield,
    totalMonthlyContribution,
    activeCount: active.length
  }
}
