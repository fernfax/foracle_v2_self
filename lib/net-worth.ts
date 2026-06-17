/**
 * Household net worth = assets − liabilities, with per-class composition.
 *
 * Pure function — no DB, no React. Called server-side in
 * app/(app)/user/page.tsx after the rows are fetched, then passed to the
 * Holdings (Net Worth) view as a prop. Mirrors the shape of
 * lib/household-summary.ts.
 *
 * v1 valuation notes (no schema changes):
 *  - Property & vehicle use originalPurchasePrice (no market-value field
 *    exists) — overstates property, ignores vehicle depreciation.
 *  - CPF balances come from lib/cpf-balances.ts (onboarding-entered seeds).
 *  - Generic `assets` table is excluded (no server action yet).
 */

export type AssetClassKey =
  | "cash"
  | "property"
  | "vehicle"
  | "investments"
  | "insurance"
  | "cpf"
export type LiabilityClassKey = "propertyLoan" | "vehicleLoan"
export type ClassKey = AssetClassKey | LiabilityClassKey

const CLASS_META: Record<ClassKey, { label: string; color: string }> = {
  cash: { label: "Cash & Deposits", color: "#00C4AA" },
  property: { label: "Property", color: "#3A6B52" },
  vehicle: { label: "Vehicle", color: "#D4845A" },
  investments: { label: "Investments", color: "#B8622A" },
  insurance: { label: "Insurance Cash Value", color: "#D4A843" },
  cpf: { label: "CPF Balances", color: "#5A9470" },
  propertyLoan: { label: "Home Loan", color: "#E05555" },
  vehicleLoan: { label: "Car Loan", color: "#8B0000" }
}

/** A per-class aggregate (powers the composition bar and asset-class chips). */
export interface NetWorthLine {
  key: ClassKey
  label: string
  amount: number
  color: string
  count: number
}

/** A per-item row (powers the Assets / Liabilities tables). */
export interface NetWorthRow {
  id: string
  classKey: ClassKey
  classLabel: string
  label: string
  sublabel?: string
  value: number
  color: string
  /** Only cash is managed on this page; everything else links out. */
  editable: boolean
  manageHref?: string
}

export interface CompositionSegment {
  key: ClassKey
  label: string
  amount: number
  color: string
  pct: number
}

export interface NetWorthSummary {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  assetClasses: NetWorthLine[]
  liabilityClasses: NetWorthLine[]
  composition: CompositionSegment[]
  assetRows: NetWorthRow[]
  liabilityRows: NetWorthRow[]
}

// ---- minimal input shapes (callers pass full DB rows) ----------------------

export interface NetWorthInput {
  holdings: { id: string; bankName: string; holdingAmount: string }[]
  properties: {
    id: string
    propertyName: string
    originalPurchasePrice: string
    outstandingLoan: string
    isActive: boolean | null
  }[]
  vehicles: {
    id: string
    vehicleName: string
    originalPurchasePrice: string
    loanAmountTaken: string | null
    loanAmountRepaid: string | null
    isActive: boolean | null
  }[]
  investments: {
    id: string
    name: string
    currentCapital: string
    isActive: boolean | null
  }[]
  policies: {
    id: string
    provider: string
    planName: string | null
    cashValue: string | null
    isActive: boolean | null
  }[]
  /** Per-member CPF balances, precomputed via lib/cpf-balances.ts. */
  cpf: { id: string; name: string; balance: number }[]
}

const toNum = (s: string | null | undefined): number => {
  const n = parseFloat(s ?? "")
  return Number.isFinite(n) ? n : 0
}

const isActive = (a: boolean | null): boolean => a !== false

export function computeNetWorth(input: NetWorthInput): NetWorthSummary {
  const assetRows: NetWorthRow[] = []
  const liabilityRows: NetWorthRow[] = []

  // Cash — the only class managed in-place on this page.
  for (const h of input.holdings) {
    assetRows.push({
      id: h.id,
      classKey: "cash",
      classLabel: CLASS_META.cash.label,
      label: h.bankName,
      sublabel: "Bank account",
      value: toNum(h.holdingAmount),
      color: CLASS_META.cash.color,
      editable: true
    })
  }

  // Property — asset at purchase price, loan as a liability.
  for (const p of input.properties.filter((p) => isActive(p.isActive))) {
    assetRows.push({
      id: p.id,
      classKey: "property",
      classLabel: CLASS_META.property.label,
      label: p.propertyName,
      sublabel: "Purchase price",
      value: toNum(p.originalPurchasePrice),
      color: CLASS_META.property.color,
      editable: false,
      manageHref: "/assets"
    })
    const loan = toNum(p.outstandingLoan)
    if (loan > 0) {
      liabilityRows.push({
        id: p.id,
        classKey: "propertyLoan",
        classLabel: CLASS_META.propertyLoan.label,
        label: `${p.propertyName} — outstanding loan`,
        value: loan,
        color: CLASS_META.propertyLoan.color,
        editable: false,
        manageHref: "/assets"
      })
    }
  }

  // Vehicle — asset at purchase price, outstanding = taken − repaid.
  for (const v of input.vehicles.filter((v) => isActive(v.isActive))) {
    assetRows.push({
      id: v.id,
      classKey: "vehicle",
      classLabel: CLASS_META.vehicle.label,
      label: v.vehicleName,
      sublabel: "Purchase price",
      value: toNum(v.originalPurchasePrice),
      color: CLASS_META.vehicle.color,
      editable: false,
      manageHref: "/assets"
    })
    const loan = Math.max(
      0,
      toNum(v.loanAmountTaken) - toNum(v.loanAmountRepaid)
    )
    if (loan > 0) {
      liabilityRows.push({
        id: v.id,
        classKey: "vehicleLoan",
        classLabel: CLASS_META.vehicleLoan.label,
        label: `${v.vehicleName} — outstanding loan`,
        value: loan,
        color: CLASS_META.vehicleLoan.color,
        editable: false,
        manageHref: "/assets"
      })
    }
  }

  // Investments.
  for (const inv of input.investments.filter((i) => isActive(i.isActive))) {
    assetRows.push({
      id: inv.id,
      classKey: "investments",
      classLabel: CLASS_META.investments.label,
      label: inv.name,
      sublabel: "Portfolio value",
      value: toNum(inv.currentCapital),
      color: CLASS_META.investments.color,
      editable: false,
      manageHref: "/investments"
    })
  }

  // Insurance cash value — only policies that carry one.
  for (const pol of input.policies.filter((p) => isActive(p.isActive))) {
    const cv = toNum(pol.cashValue)
    if (cv <= 0) continue
    assetRows.push({
      id: pol.id,
      classKey: "insurance",
      classLabel: CLASS_META.insurance.label,
      label: pol.planName ? `${pol.provider} · ${pol.planName}` : pol.provider,
      sublabel: "Cash value",
      value: cv,
      color: CLASS_META.insurance.color,
      editable: false,
      manageHref: "/policies"
    })
  }

  // CPF balances — read-only (computed), one row per member with a balance.
  for (const m of input.cpf) {
    if (m.balance <= 0) continue
    assetRows.push({
      id: m.id,
      classKey: "cpf",
      classLabel: CLASS_META.cpf.label,
      label: `${m.name} · CPF`,
      sublabel: "OA + SA + MediSave",
      value: m.balance,
      color: CLASS_META.cpf.color,
      editable: false
    })
  }

  const classify = (rows: NetWorthRow[]): NetWorthLine[] => {
    const map = new Map<ClassKey, NetWorthLine>()
    for (const r of rows) {
      const existing = map.get(r.classKey)
      if (existing) {
        existing.amount += r.value
        existing.count += 1
      } else {
        map.set(r.classKey, {
          key: r.classKey,
          label: r.classLabel,
          amount: r.value,
          color: r.color,
          count: 1
        })
      }
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount)
  }

  const assetClasses = classify(assetRows)
  const liabilityClasses = classify(liabilityRows)

  const totalAssets = assetClasses.reduce((s, c) => s + c.amount, 0)
  const totalLiabilities = liabilityClasses.reduce((s, c) => s + c.amount, 0)
  const netWorth = totalAssets - totalLiabilities

  const composition: CompositionSegment[] = assetClasses.map((c) => ({
    key: c.key,
    label: c.label,
    amount: c.amount,
    color: c.color,
    pct: totalAssets > 0 ? c.amount / totalAssets : 0
  }))

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    assetClasses,
    liabilityClasses,
    composition,
    assetRows,
    liabilityRows
  }
}
