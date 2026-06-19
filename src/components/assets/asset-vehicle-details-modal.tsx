"use client"

import React from "react"
import {
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  format
} from "date-fns"
import { Calendar, Car, Check, Clock, Wallet, X } from "lucide-react"
import { useTheme } from "next-themes"

import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"

interface VehicleAsset {
  id: string
  vehicleName: string
  purchaseDate: string
  coeExpiryDate: string | null
  originalPurchasePrice: string
  loanAmountTaken: string | null
  loanInterestRate: string | null
  loanTenureYears: number | null
  loanTenureMonths: number | null
  loanAmountRepaid: string | null
  monthlyLoanPayment: string | null
  linkedExpenseId: string | null
}

interface VehicleDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle: VehicleAsset | null
}

export function AssetVehicleDetailsModal({
  open,
  onOpenChange,
  vehicle
}: VehicleDetailsModalProps) {
  const { resolvedTheme } = useTheme()
  if (!vehicle) return null

  // The whitescape backdrop + metric cards were hardcoded light, so in dark mode
  // the theme-aware `text-foreground` (light) sat on a light surface = invisible.
  const isDark = resolvedTheme === "dark"
  const surfaceOverlay = isDark
    ? "rgba(18,28,27,0.92)"
    : "rgba(255,255,255,0.82)"
  const cardBg = isDark ? "hsl(var(--card))" : "#F0EBE0"

  const loanTaken = parseFloat(vehicle.loanAmountTaken || "0")
  const loanRepaid = parseFloat(vehicle.loanAmountRepaid || "0")
  const tenureYears = vehicle.loanTenureYears ?? 0
  const tenureMonthsPart = vehicle.loanTenureMonths ?? 0
  const totalMonths = tenureYears * 12 + tenureMonthsPart

  let outstandingLoan: number
  if (loanTaken > 0 && totalMonths > 0) {
    const monthsElapsed = Math.max(
      0,
      differenceInMonths(new Date(), new Date(vehicle.purchaseDate))
    )
    const k = Math.min(monthsElapsed, totalMonths)
    outstandingLoan = Math.max(0, (loanTaken * (totalMonths - k)) / totalMonths)
  } else {
    outstandingLoan = Math.max(0, loanTaken - loanRepaid)
  }

  const progress =
    loanTaken > 0 ? ((loanTaken - outstandingLoan) / loanTaken) * 100 : 100
  const monthlyPayment = parseFloat(vehicle.monthlyLoanPayment || "0")

  // Calculate estimated payoff
  const monthsRemaining =
    monthlyPayment > 0 ? Math.ceil(outstandingLoan / monthlyPayment) : 0
  const yearsRemaining = Math.floor(monthsRemaining / 12)
  const monthsRemainingAfterYears = monthsRemaining % 12

  // Calculate COE countdown
  const getCoeCountdown = () => {
    if (!vehicle.coeExpiryDate) return null

    const expiryDate = new Date(vehicle.coeExpiryDate)
    const today = new Date()

    if (expiryDate <= today) {
      return { expired: true, text: "COE Expired" }
    }

    const days = differenceInDays(expiryDate, today)
    const months = differenceInMonths(expiryDate, today)
    const years = differenceInYears(expiryDate, today)

    if (years > 0) {
      const remainingMonths = months - years * 12
      return {
        expired: false,
        text: `${years} year${years > 1 ? "s" : ""} ${remainingMonths > 0 ? `${remainingMonths} month${remainingMonths > 1 ? "s" : ""}` : ""}`,
        days
      }
    } else if (months > 0) {
      return {
        expired: false,
        text: `${months} month${months > 1 ? "s" : ""}`,
        days
      }
    } else {
      return { expired: false, text: `${days} day${days > 1 ? "s" : ""}`, days }
    }
  }

  const coeCountdown = getCoeCountdown()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[80vh] max-w-4xl overflow-y-auto"
        style={{
          backgroundImage: `linear-gradient(${surfaceOverlay}, ${surfaceOverlay}), url(/whitescape-vehicle.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-brand-gold/[0.15] flex h-12 w-12 items-center justify-center rounded-xl">
              <Car className="text-on-warning h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {vehicle.vehicleName}
              </DialogTitle>
              <p className="text-muted-foreground mt-1 flex items-center gap-1 text-sm">
                <Calendar className="h-3 w-3" />
                Purchased{" "}
                {format(new Date(vehicle.purchaseDate), "MMMM d, yyyy")}
              </p>
              <Badge
                variant="outline"
                className={`mt-2 text-xs font-medium ${vehicle.linkedExpenseId ? "text-on-success border-brand-teal/[0.25]" : "text-muted-foreground border-border"}`}>
                {vehicle.linkedExpenseId ? (
                  <Check className="mr-1 h-3 w-3" />
                ) : (
                  <X className="mr-1 h-3 w-3" />
                )}
                {vehicle.linkedExpenseId ? "In Expenses" : "Not in Expenses"}
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
                <Car className="h-4 w-4" />
                <span className="text-sm">Purchase Price</span>
              </div>
              <p className="text-foreground text-2xl font-semibold tabular-nums">
                ${parseFloat(vehicle.originalPurchasePrice).toLocaleString()}
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

          {/* COE Expiry Section */}
          {vehicle.coeExpiryDate && coeCountdown && (
            <div
              className="border-border rounded-xl border p-5"
              style={{ backgroundColor: "hsl(var(--card))" }}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-foreground flex items-center gap-2 font-semibold">
                  <Clock className="h-4 w-4" />
                  COE Expiry
                </h3>
                <Badge
                  variant="secondary"
                  className={
                    coeCountdown.expired
                      ? "text-on-danger bg-brand-alert-red/[0.12]"
                      : coeCountdown.days && coeCountdown.days < 365
                        ? "text-on-warning bg-brand-gold/[0.15]"
                        : "text-on-success bg-brand-teal/[0.12]"
                  }>
                  {coeCountdown.expired
                    ? "Expired"
                    : `${coeCountdown.text} remaining`}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <span className="text-muted-foreground">Expiry Date: </span>
                  <span className="text-foreground font-medium">
                    {format(new Date(vehicle.coeExpiryDate), "MMMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>
          )}

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
                    background: `linear-gradient(90deg, #D4845A 0%, #c084fc 100%)`
                  }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <span className="text-muted-foreground">Repaid: </span>
                  <span className="text-on-success font-semibold">
                    $
                    {loanRepaid.toLocaleString(undefined, {
                      maximumFractionDigits: 0
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Remaining: </span>
                  <span className="text-on-warning font-semibold">
                    $
                    {outstandingLoan.toLocaleString(undefined, {
                      maximumFractionDigits: 0
                    })}
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

          {/* Monthly Payment Details */}
          {monthlyPayment > 0 && (
            <div className="space-y-3">
              <h3 className="text-foreground flex items-center gap-2 font-semibold">
                Monthly Payment
              </h3>
              <div
                className="border-border space-y-3 rounded-lg border p-4"
                style={{ backgroundColor: "hsl(var(--card))" }}>
                <div className="flex items-center justify-between">
                  <span className="text-foreground font-medium">
                    Monthly Loan Payment
                  </span>
                  <span className="text-foreground text-xl font-semibold">
                    ${monthlyPayment.toLocaleString()}
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
