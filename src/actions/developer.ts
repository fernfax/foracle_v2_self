"use server"

import { IS_DEV } from "@/configs/env.config"
import { db } from "@/db"
import { eq, sql } from "drizzle-orm"
import type { PgColumn, PgTable } from "drizzle-orm/pg-core"

import { getCurrentUserAndFamily } from "@/lib/auth-context"
import type {
  DeveloperTableScope,
  TableRowsResult
} from "@/lib/developer-tables"
import {
  assets,
  budgetShifts,
  currentHoldings,
  dailyExpenses,
  expenseCategories,
  expenses,
  expenseSubcategories,
  families,
  familyMembers,
  goals,
  holdingAmountHistory,
  incomesBeta,
  insuranceProviders,
  investmentPolicies,
  kbChunks,
  policies,
  propertyAssets,
  quickLinks,
  userChunks,
  users,
  vehicleAssets
} from "@/db/schema"

const ROW_LIMIT = 100

type TableEntry = {
  scope: DeveloperTableScope
  table: PgTable
}

// The scope columns (id / familyId / userId) are resolved dynamically by name,
// which the specific PgTable column maps don't expose via index signature.
// This reads a column by key for use in a `where` clause.
function column(table: PgTable, key: string): PgColumn {
  return (table as unknown as Record<string, PgColumn>)[key]
}

const REGISTRY: Record<string, TableEntry> = {
  users: { scope: "self", table: users },
  families: { scope: "primaryFamily", table: families },
  family_members: { scope: "familyId", table: familyMembers },
  incomes_beta: { scope: "familyId", table: incomesBeta },
  expenses: { scope: "familyId", table: expenses },
  daily_expenses: { scope: "familyId", table: dailyExpenses },
  expense_categories: { scope: "familyId", table: expenseCategories },
  expense_subcategories: { scope: "familyId", table: expenseSubcategories },
  budget_shifts: { scope: "familyId", table: budgetShifts },
  assets: { scope: "familyId", table: assets },
  property_assets: { scope: "familyId", table: propertyAssets },
  vehicle_assets: { scope: "familyId", table: vehicleAssets },
  current_holdings: { scope: "familyId", table: currentHoldings },
  holding_amount_history: { scope: "familyId", table: holdingAmountHistory },
  investment_policies: { scope: "familyId", table: investmentPolicies },
  policies: { scope: "familyId", table: policies },
  insurance_providers: { scope: "familyId", table: insuranceProviders },
  goals: { scope: "familyId", table: goals },
  quick_links: { scope: "userId", table: quickLinks },
  user_chunks: { scope: "userId", table: userChunks },
  kb_chunks: { scope: "global", table: kbChunks }
}

function assertDevMode() {
  if (!IS_DEV) {
    throw new Error("Developer Mode is only available in development.")
  }
}

export async function getTableRows(
  tableName: string
): Promise<TableRowsResult> {
  assertDevMode()

  const { userId, familyId } = await getCurrentUserAndFamily()

  const entry = REGISTRY[tableName]
  if (!entry) throw new Error(`Unknown table: ${tableName}`)

  const { table, scope } = entry
  let rows: Array<Record<string, unknown>> = []
  let totalForScope = 0

  if (scope === "self") {
    rows = (await db
      .select()
      .from(table)
      .where(eq(column(table, "id"), userId))) as Array<Record<string, unknown>>
    totalForScope = rows.length
  } else if (scope === "primaryFamily") {
    rows = (await db
      .select()
      .from(table)
      .where(eq(column(table, "id"), familyId))) as Array<
      Record<string, unknown>
    >
    totalForScope = rows.length
  } else if (scope === "familyId") {
    const countResult = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(table)
      .where(eq(column(table, "familyId"), familyId))
    totalForScope = countResult[0]?.n ?? 0
    rows = (await db
      .select()
      .from(table)
      .where(eq(column(table, "familyId"), familyId))
      .limit(ROW_LIMIT)) as Array<Record<string, unknown>>
  } else if (scope === "userId") {
    const countResult = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(table)
      .where(eq(column(table, "userId"), userId))
    totalForScope = countResult[0]?.n ?? 0
    rows = (await db
      .select()
      .from(table)
      .where(eq(column(table, "userId"), userId))
      .limit(ROW_LIMIT)) as Array<Record<string, unknown>>
  } else {
    // global
    const countResult = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(table)
    totalForScope = countResult[0]?.n ?? 0
    rows = (await db.select().from(table).limit(ROW_LIMIT)) as Array<
      Record<string, unknown>
    >
  }

  const columns = rows[0] ? Object.keys(rows[0]) : []
  const safeRows = rows.map(serializeRow)

  return {
    scope,
    columns,
    rows: safeRows,
    returned: safeRows.length,
    totalForScope,
    truncated: totalForScope > safeRows.length
  }
}

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    out[k] = serializeValue(v)
  }
  return out
}

function serializeValue(v: unknown): unknown {
  if (v === null || v === undefined) return v
  if (v instanceof Date) return v.toISOString()
  if (Array.isArray(v)) {
    // pgvector returns number[] for embeddings — collapse so we don't ship
    // megabytes of floats to the client.
    if (v.length > 32 && v.every((x) => typeof x === "number")) {
      return `[${v.length} dims]`
    }
    return v.map(serializeValue)
  }
  if (typeof v === "object") {
    try {
      return JSON.parse(JSON.stringify(v))
    } catch {
      return String(v)
    }
  }
  return v
}
