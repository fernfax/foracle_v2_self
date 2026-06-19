"use client"

import React from "react"
import { format } from "date-fns"
import {
  Building2,
  Calendar,
  Check,
  Home,
  TrendingUp,
  Wallet,
  X
} from "lucide-react"
import { useTheme } from "next-themes"

import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"

interface PropertyAsset {
  id: string
  propertyName: string
  purchaseDate: string
  originalPurchasePrice: string
  loanAmountTaken: string | null
  outstandingLoan: string
  monthlyLoanPayment: string
  interestRate: string
  principalCpfWithdrawn: string | null
  housingGrantTaken: string | null
  accruedInterestToDate: string | null
  linkedExpenseId: string | null
  paidByCpf: boolean | null
}

interface PropertyDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  property: PropertyAsset | null
}

export function PropertyDetailsModal({
  open,
  onOpenChange,
  property
}: PropertyDetailsModalProps) {
  const { resolvedTheme } = useTheme()
  if (!property) return null

  // The whitescape backdrop + metric cards were hardcoded light, so in dark mode
  // the theme-aware `text-foreground` (light) sat on a light surface = invisible.
  const isDark = resolvedTheme === "dark"
  const surfaceOverlay = isDark
    ? "rgba(18,28,27,0.92)"
    : "rgba(255,255,255,0.82)"
  const cardBg = isDark ? "hsl(var(--card))" : "#F0EBE0"

  const loanTaken = parseFloat(property.loanAmountTaken || "0")
  const outstanding = parseFloat(property.outstandingLoan)
  const loanRepaid = loanTaken - outstanding
  const progress = loanTaken > 0 ? (loanRepaid / loanTaken) * 100 : 100

  const interestRepayment =
    (outstanding * (parseFloat(property.interestRate) / 100)) / 12
  const principalRepayment =
    parseFloat(property.monthlyLoanPayment) - interestRepayment

  const cpfWithdrawn = parseFloat(property.principalCpfWithdrawn || "0")
  const housingGrant = parseFloat(property.housingGrantTaken || "0")
  const accruedInterest = parseFloat(property.accruedInterestToDate || "0")
  const cpfReturn = cpfWithdrawn + housingGrant + accruedInterest

  // Calculate estimated payoff
  const monthsRemaining =
    principalRepayment > 0 ? Math.ceil(outstanding / principalRepayment) : 0
  const yearsRemaining = Math.floor(monthsRemaining / 12)
  const monthsRemainingAfterYears = monthsRemaining % 12

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[80vh] max-w-4xl overflow-y-auto"
        style={{
          backgroundImage: `linear-gradient(${surfaceOverlay}, ${surfaceOverlay}), url(/whitescape-property.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-brand-terracotta/[0.1] flex h-12 w-12 items-center justify-center rounded-xl">
              <Home className="text-on-brand h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {property.propertyName}
              </DialogTitle>
              <p className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
                <Calendar className="h-3 w-3" />
                Purchased{" "}
                {format(new Date(property.purchaseDate), "MMMM d, yyyy")}
              </p>
              <Badge
                variant="outline"
                className={`mt-2 text-xs font-medium ${property.linkedExpenseId ? "text-on-success border-brand-teal/[0.25]" : "text-muted-foreground border-border"}`}>
                {property.linkedExpenseId ? (
                  <Check className="mr-1 h-3 w-3" />
                ) : (
                  <X className="mr-1 h-3 w-3" />
                )}
                {property.linkedExpenseId ? "In Expenses" : "Not in Expenses"}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className="border-border rounded-lg border p-4"
              style={{ backgroundColor: cardBg }}>
              <div className="text-muted-foreground mb-1 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="text-sm">Purchase Price</span>
              </div>
              <p className="text-foreground text-2xl font-semibold tabular-nums">
                ${parseFloat(property.originalPurchasePrice).toLocaleString()}
              </p>
            </div>
            <div
              className="border-border rounded-lg border p-4"
              style={{ backgroundColor: cardBg }}>
              <div className="text-muted-foreground mb-1 flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span className="text-sm">Loan Amount</span>
              </div>
              <p className="text-foreground text-2xl font-semibold tabular-nums">
                ${loanTaken.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Progress Section */}
          {loanTaken > 0 && (
            <div
              className="border-border rounded-xl border p-5"
              style={{ backgroundColor: "hsl(var(--card))" }}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-foreground font-semibold">Loan Progress</h3>
                <Badge
                  variant="secondary"
                  className="text-on-success bg-brand-teal/[0.12] dark:bg-brand-teal/[0.18] dark:text-brand-teal-light">
                  {progress.toFixed(1)}% Complete
                </Badge>
              </div>
              <div className="bg-muted dark:bg-foreground/80 mb-3 h-4 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, #00C4AA 0%, #5A9470 100%)`
                  }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <span className="text-muted-foreground">Repaid: </span>
                  <span className="text-on-success font-semibold">
                    ${loanRepaid.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Remaining: </span>
                  <span className="text-on-warning font-semibold">
                    ${outstanding.toLocaleString()}
                  </span>
                </div>
              </div>
              {monthsRemaining > 0 && (
                <p className="text-muted-foreground mt-2 text-center text-xs">
                  Estimated payoff:{" "}
                  {yearsRemaining > 0 ? `${yearsRemaining} years ` : ""}
                  {monthsRemainingAfterYears > 0
                    ? `${monthsRemainingAfterYears} months`
                    : ""}
                </p>
              )}
            </div>
          )}

          {/* Monthly Payment Breakdown */}
          <div className="space-y-3">
            <h3 className="text-foreground flex items-center gap-2 font-semibold">
              <TrendingUp className="h-4 w-4" />
              Monthly Payment Breakdown
            </h3>
            <div
              className="border-border space-y-3 rounded-lg border p-4"
              style={{ backgroundColor: "hsl(var(--card))" }}>
              <div className="flex items-center justify-between">
                <span className="text-foreground font-medium">
                  Total Monthly Payment
                </span>
                <span className="text-foreground text-xl font-semibold">
                  ${parseFloat(property.monthlyLoanPayment).toLocaleString()}
                </span>
              </div>
              <div className="bg-muted h-px" />
              <div className="flex items-center justify-between">
                <span className="text-foreground">Principal Repayment</span>
                <span className="text-on-success font-medium">
                  $
                  {principalRepayment.toLocaleString(undefined, {
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Interest Payment</span>
                <span className="text-on-warning font-medium">
                  $
                  {interestRepayment.toLocaleString(undefined, {
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-foreground">Interest Rate</span>
                <span className="text-foreground font-medium">
                  {parseFloat(property.interestRate).toFixed(2)}% p.a.
                </span>
              </div>
            </div>
          </div>

          {/* CPF Details */}
          {(cpfWithdrawn > 0 || housingGrant > 0 || accruedInterest > 0) && (
            <div className="space-y-3">
              <h3 className="text-foreground font-semibold">CPF & Grants</h3>
              <div
                className="border-border space-y-3 rounded-lg border p-4"
                style={{ backgroundColor: "hsl(var(--card))" }}>
                {cpfWithdrawn > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">
                      Principal CPF Withdrawn
                    </span>
                    <span className="text-foreground font-medium">
                      ${cpfWithdrawn.toLocaleString()}
                    </span>
                  </div>
                )}
                {housingGrant > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">Housing Grant Taken</span>
                    <span className="text-foreground font-medium">
                      ${housingGrant.toLocaleString()}
                    </span>
                  </div>
                )}
                {accruedInterest > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">
                      Accrued Interest to Date
                    </span>
                    <span className="text-foreground font-medium">
                      ${accruedInterest.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="bg-muted h-px" />
                <div className="flex items-center justify-between">
                  <span className="text-on-brand font-medium">
                    Amount to Return to CPF
                  </span>
                  <span className="text-on-brand font-semibold">
                    ${cpfReturn.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
