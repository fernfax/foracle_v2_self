"use server";

import { auth } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  families,
  familyMembers,
  incomes,
  expenseCategories,
  expenseSubcategories,
  insuranceProviders,
  expenses,
  dailyExpenses,
  assets,
  propertyAssets,
  vehicleAssets,
  policies,
  goals,
  currentHoldings,
  holdingAmountHistory,
  quickLinks,
  investmentPolicies,
  budgetShifts,
  kbChunks,
  userChunks,
  incomesBeta,
} from "@/db/schema";
import type { DeveloperTableScope, TableRowsResult } from "@/lib/developer-tables";

const ROW_LIMIT = 100;

type TableEntry = {
  scope: DeveloperTableScope;
  table: any;
};

const REGISTRY: Record<string, TableEntry> = {
  users: { scope: "self", table: users },
  families: { scope: "primaryFamily", table: families },
  family_members: { scope: "userId", table: familyMembers },
  incomes: { scope: "userId", table: incomes },
  incomes_beta: { scope: "userId", table: incomesBeta },
  expenses: { scope: "userId", table: expenses },
  daily_expenses: { scope: "userId", table: dailyExpenses },
  expense_categories: { scope: "userId", table: expenseCategories },
  expense_subcategories: { scope: "userId", table: expenseSubcategories },
  budget_shifts: { scope: "userId", table: budgetShifts },
  assets: { scope: "userId", table: assets },
  property_assets: { scope: "userId", table: propertyAssets },
  vehicle_assets: { scope: "userId", table: vehicleAssets },
  current_holdings: { scope: "userId", table: currentHoldings },
  holding_amount_history: { scope: "userId", table: holdingAmountHistory },
  investment_policies: { scope: "userId", table: investmentPolicies },
  policies: { scope: "userId", table: policies },
  insurance_providers: { scope: "userId", table: insuranceProviders },
  goals: { scope: "userId", table: goals },
  quick_links: { scope: "userId", table: quickLinks },
  user_chunks: { scope: "userId", table: userChunks },
  kb_chunks: { scope: "global", table: kbChunks },
};

function assertDevMode() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Developer Mode is only available in development.");
  }
}

export async function getTableRows(tableName: string): Promise<TableRowsResult> {
  assertDevMode();

  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const entry = REGISTRY[tableName];
  if (!entry) throw new Error(`Unknown table: ${tableName}`);

  const { table, scope } = entry;
  let rows: Array<Record<string, unknown>> = [];
  let totalForScope = 0;

  if (scope === "self") {
    rows = (await db.select().from(table).where(eq(table.id, userId))) as any;
    totalForScope = rows.length;
  } else if (scope === "primaryFamily") {
    const me = await db
      .select({ familyId: users.familyId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const familyId = me[0]?.familyId ?? null;
    if (familyId) {
      rows = (await db.select().from(table).where(eq(table.id, familyId))) as any;
    }
    totalForScope = rows.length;
  } else if (scope === "userId") {
    const countResult = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(table)
      .where(eq(table.userId, userId));
    totalForScope = countResult[0]?.n ?? 0;
    rows = (await db
      .select()
      .from(table)
      .where(eq(table.userId, userId))
      .limit(ROW_LIMIT)) as any;
  } else {
    // global
    const countResult = await db.select({ n: sql<number>`count(*)::int` }).from(table);
    totalForScope = countResult[0]?.n ?? 0;
    rows = (await db.select().from(table).limit(ROW_LIMIT)) as any;
  }

  const columns = rows[0] ? Object.keys(rows[0]) : [];
  const safeRows = rows.map(serializeRow);

  return {
    scope,
    columns,
    rows: safeRows,
    returned: safeRows.length,
    totalForScope,
    truncated: totalForScope > safeRows.length,
  };
}

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = serializeValue(v);
  }
  return out;
}

function serializeValue(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) {
    // pgvector returns number[] for embeddings — collapse so we don't ship
    // megabytes of floats to the client.
    if (v.length > 32 && v.every((x) => typeof x === "number")) {
      return `[${v.length} dims]`;
    }
    return v.map(serializeValue);
  }
  if (typeof v === "object") {
    try {
      return JSON.parse(JSON.stringify(v));
    } catch {
      return String(v);
    }
  }
  return v;
}
