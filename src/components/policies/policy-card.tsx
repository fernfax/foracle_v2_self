"use client"

import { useState } from "react"
import { differenceInDays, format, parseISO } from "date-fns"
import { Check, Pencil, Shield, Trash2, X } from "lucide-react"

import { formatBudgetCurrency } from "@/lib/budget-utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { RowActions } from "@/components/ui/row-actions"

/** ~120 days = "renews soon" window for the status badge (handoff §4). */
const RENEWS_SOON_DAYS = 120

/**
 * Normalize a stored premium to a per-month number when the cadence is one we
 * can confidently convert. Returns `null` when we can't (e.g. a "Custom" cadence
 * with no parseable months) — callers must then show the stored amount with its
 * real cadence label rather than a wrong "/mo" (handoff §4).
 *
 * Shared, deterministic logic so PolicyCard and the StatBand agree.
 */
export function monthlyPremium(
  premiumAmount: string,
  premiumFrequency: string,
  customMonths: string | null
): number | null {
  const amount = parseFloat(premiumAmount)
  if (!Number.isFinite(amount)) return null
  const freq = (premiumFrequency || "").trim().toLowerCase()

  switch (freq) {
    case "monthly":
    case "month":
      return amount
    case "quarterly":
    case "quarter":
      return (amount * 4) / 12
    case "semi-annual":
    case "semiannual":
    case "semi-annually":
    case "half-yearly":
    case "biannual":
      return (amount * 2) / 12
    case "annual":
    case "annually":
    case "yearly":
    case "year":
      return amount / 12
    case "weekly":
      return (amount * 52) / 12
    case "custom": {
      // customMonths is a JSON array of month numbers the premium is paid in
      // (e.g. [1,6] → 2 payments a year). Annualize, then spread over 12.
      if (!customMonths) return null
      try {
        const months = JSON.parse(customMonths)
        if (Array.isArray(months) && months.length > 0) {
          return (amount * months.length) / 12
        }
      } catch {
        return null
      }
      return null
    }
    default:
      // Empty frequency is treated as a one-off monthly figure (legacy seed
      // rows). Anything else we genuinely don't recognize → can't normalize.
      return freq === "" ? amount : null
  }
}

/** Pretty, sentence-case label for a stored cadence (used as the "/x" suffix). */
function cadenceLabel(premiumFrequency: string): string {
  const freq = (premiumFrequency || "").trim().toLowerCase()
  switch (freq) {
    case "monthly":
    case "month":
      return "/mo"
    case "quarterly":
    case "quarter":
      return "/qtr"
    case "semi-annual":
    case "semiannual":
    case "semi-annually":
    case "half-yearly":
    case "biannual":
      return "/6mo"
    case "annual":
    case "annually":
    case "yearly":
    case "year":
      return "/yr"
    case "weekly":
      return "/wk"
    case "custom":
      return " (custom)"
    default:
      return ""
  }
}

/** Title-case a raw policyType slug used as the fallback name. */
function titleCase(s: string): string {
  return s
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Status badge resolution (handoff §4):
 * - active + maturity within ~120 days → "Renews soon" (warning)
 * - active otherwise → "Active" (success)
 * - else the REAL status label (lapsed/cancelled/matured → neutral/danger) —
 *   never fake "Active".
 */
function getStatusBadge(
  status: string | null,
  maturityDate: string | null
): { label: string; variant: "success" | "warning" | "neutral" | "danger" } {
  const st = (status ?? "active").toLowerCase()

  if (st === "active") {
    if (maturityDate) {
      const days = differenceInDays(parseISO(maturityDate), new Date())
      if (days >= 0 && days <= RENEWS_SOON_DAYS) {
        return { label: "Renews soon", variant: "warning" }
      }
    }
    return { label: "Active", variant: "success" }
  }

  const label = titleCase(status ?? "")
  // Lapsed / cancelled read as a hard "danger"; everything else neutral.
  const variant: "neutral" | "danger" =
    st === "lapsed" || st === "cancelled" || st === "canceled"
      ? "danger"
      : "neutral"
  return { label: label || "Inactive", variant }
}

interface PolicyCardProps {
  policy: {
    id: string
    provider: string
    policyNumber: string | null
    policyType: string
    status: string | null
    startDate: string
    maturityDate: string | null
    coverageUntilAge: number | null
    premiumAmount: string
    premiumFrequency: string
    customMonths?: string | null
    totalPremiumDuration: number | null
    coverageOptions: string | null
    description: string | null
    isActive: boolean | null
    planName: string | null
    premiumAmountCPF: string | null
    cashValue: string | null
    cashValueDate: string | null
    linkedExpenseId: string | null
  }
  familyMemberName?: string
  onEdit?: () => void
  onDelete?: () => void
}

export function PolicyCard({
  policy,
  familyMemberName,
  onEdit,
  onDelete
}: PolicyCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const getCoverageOptions = () => {
    if (!policy.coverageOptions) return []
    try {
      const options = JSON.parse(policy.coverageOptions)
      return Object.entries(options)
        .filter(([, value]) => value && parseFloat(value as string) > 0)
        .map(([key, value]) => {
          // Convert camelCase to readable format
          const label = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim()
          return { label, amount: parseFloat(value as string) }
        })
    } catch {
      return []
    }
  }

  const coverages = getCoverageOptions()
  const isInExpenses = !!policy.linkedExpenseId

  // Derived display fields (handoff §4) — all UI-only, no schema change.
  const name = policy.planName?.trim() || titleCase(policy.policyType)
  const insurer = policy.provider
  const holder = familyMemberName || "Joint"
  const statusBadge = getStatusBadge(policy.status, policy.maturityDate)

  // Primary sum assured: largest of death / CI / TPD / … (reuse current logic).
  const primaryCoverage =
    coverages.length > 0
      ? coverages.reduce(
          (max, c) => (c.amount > max.amount ? c : max),
          coverages[0]
        )
      : null

  // Premium → per-month when confidently normalizable; otherwise show stored
  // amount with its real cadence label rather than a wrong "/mo".
  const premiumPerMonth = monthlyPremium(
    policy.premiumAmount,
    policy.premiumFrequency,
    policy.customMonths ?? null
  )
  const premiumDisplay =
    premiumPerMonth !== null
      ? { amount: premiumPerMonth, suffix: "/mo" }
      : {
          amount: parseFloat(policy.premiumAmount) || 0,
          suffix: cadenceLabel(policy.premiumFrequency)
        }

  return (
    <>
      <Card
        interactive
        className="flex cursor-pointer flex-col gap-4 p-5"
        onClick={() => setIsModalOpen(true)}>
        {/* Header: shield tile + name/insurer + status badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl"
              style={{ background: "rgba(184,98,42,0.12)", color: "#B8622A" }}>
              <Shield className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-foreground truncate text-base leading-tight font-semibold tracking-tight">
                {name}
              </h3>
              <p className="text-muted-foreground mt-0.5 truncate text-sm">
                {insurer}
              </p>
            </div>
          </div>
          <Badge variant={statusBadge.variant} className="shrink-0">
            {statusBadge.label}
          </Badge>
        </div>

        {/* Two-up: Coverage / Premium */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-label-caps text-muted-foreground uppercase">
              Coverage
            </p>
            <p className="font-display text-foreground mt-1 text-lg font-semibold tracking-tight tabular-nums">
              {primaryCoverage
                ? formatBudgetCurrency(primaryCoverage.amount)
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-label-caps text-muted-foreground uppercase">
              Premium
            </p>
            <p className="font-display text-foreground mt-1 text-lg font-semibold tracking-tight tabular-nums">
              {formatBudgetCurrency(premiumDisplay.amount)}
              {premiumDisplay.suffix && (
                <span className="text-muted-foreground ml-0.5 text-xs font-normal">
                  {premiumDisplay.suffix}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Footer: renews + holder · RowActions */}
        <div className="border-border/40 mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <p className="text-muted-foreground min-w-0 truncate text-xs">
            {policy.maturityDate
              ? `Renews ${format(parseISO(policy.maturityDate), "MMM yyyy")} · ${holder}`
              : holder}
          </p>
          <RowActions
            className="shrink-0"
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
      </Card>

      {/* Details Modal — preserved from the original card (click body to open). */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Policy Details</DialogTitle>
            <DialogDescription>
              {familyMemberName ? `${familyMemberName}'s ` : ""}
              {titleCase(policy.policyType)} Policy
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Edit Action */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsModalOpen(false)
                  onEdit?.()
                }}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Policy
              </Button>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral">{titleCase(policy.policyType)}</Badge>
              <Badge variant="brand">{policy.provider}</Badge>
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              <Badge variant={isInExpenses ? "success" : "neutral"}>
                {isInExpenses ? (
                  <Check className="mr-1 h-3 w-3" />
                ) : (
                  <X className="mr-1 h-3 w-3" />
                )}
                {isInExpenses ? "In Expenses" : "Not in Expenses"}
              </Badge>
            </div>

            {/* Policy Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Policy Information</h3>
              <div className="grid grid-cols-2 gap-4">
                {policy.planName && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-sm">Plan Name</p>
                    <p className="font-medium">{policy.planName}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-sm">Policy Number</p>
                  <p className="font-medium">{policy.policyNumber || "TBC"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Start Date</p>
                  <p className="font-medium">
                    {format(parseISO(policy.startDate), "MMMM d, yyyy")}
                  </p>
                </div>
                {policy.maturityDate && (
                  <div>
                    <p className="text-muted-foreground text-sm">End Date</p>
                    <p className="font-medium">
                      {format(parseISO(policy.maturityDate), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-sm">
                    Premium (Cash)
                  </p>
                  <p className="text-on-success dark:text-brand-teal-light font-medium">
                    {formatBudgetCurrency(parseFloat(policy.premiumAmount))} /
                    {policy.premiumFrequency.toLowerCase()}
                  </p>
                </div>
                {policy.premiumAmountCPF &&
                  parseFloat(policy.premiumAmountCPF) > 0 && (
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Premium (CPF)
                      </p>
                      <p className="font-medium">
                        {formatBudgetCurrency(
                          parseFloat(policy.premiumAmountCPF)
                        )}{" "}
                        /{policy.premiumFrequency.toLowerCase()}
                      </p>
                    </div>
                  )}
                {policy.totalPremiumDuration && (
                  <div>
                    <p className="text-muted-foreground text-sm">
                      Premium Duration
                    </p>
                    <p className="font-medium">
                      {policy.totalPremiumDuration} years
                    </p>
                  </div>
                )}
                {policy.coverageUntilAge && (
                  <div>
                    <p className="text-muted-foreground text-sm">
                      Coverage Until Age
                    </p>
                    <p className="font-medium">{policy.coverageUntilAge}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Coverage Details */}
            {coverages.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Coverage</h3>
                <div className="grid grid-cols-2 gap-4">
                  {coverages.map((coverage, index) => (
                    <div key={index}>
                      <p className="text-muted-foreground text-sm">
                        {coverage.label}
                      </p>
                      <p className="font-medium">
                        {formatBudgetCurrency(coverage.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cash Value */}
            {policy.cashValue && parseFloat(policy.cashValue) > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  Cash / Surrender Value
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-sm">Cash Value</p>
                    <p className="font-medium">
                      {formatBudgetCurrency(parseFloat(policy.cashValue))}
                    </p>
                  </div>
                  {policy.cashValueDate && (
                    <div>
                      <p className="text-muted-foreground text-sm">As At</p>
                      <p className="font-medium">
                        {format(parseISO(policy.cashValueDate), "MMMM d, yyyy")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {policy.description && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Description</h3>
                <p className="text-muted-foreground text-sm">
                  {policy.description}
                </p>
              </div>
            )}

            {/* Delete Action - at bottom */}
            <div className="border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsModalOpen(false)
                  onDelete?.()
                }}
                className="text-on-danger hover:text-on-danger dark:text-brand-alert-red-dark dark:hover:text-brand-alert-red-dark w-full">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Policy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
