"use client"

import React, { useState } from "react"
import { deleteVehicleAsset } from "@/actions/vehicle-assets"
import {
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  format
} from "date-fns"
import { Car, Clock } from "lucide-react"
import { toast } from "sonner"

import { formatBudgetCurrency } from "@/lib/budget-utils"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { RowActions } from "@/components/ui/row-actions"
import { Toolbar } from "@/components/ui/toolbar"
import { AddVehicleDialog } from "@/components/assets/add-vehicle-dialog"
import { VehicleDetailsModal } from "@/components/assets/vehicle-details-modal"
import { ConfirmDialog } from "@/components/portfolio/confirm-dialog"
import { ProgressBar } from "@/components/portfolio/progress"

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
  isActive: boolean | null
  createdAt: Date
  updatedAt: Date
}

interface VehicleListProps {
  initialVehicles: VehicleAsset[]
}

// Brand tint for the vehicle avatar tile (kaya gold).
const VEHICLE_TINT = "rgba(212,168,67,0.16)"
const VEHICLE_ICON = "#7A5A00"

export function VehicleList({ initialVehicles }: VehicleListProps) {
  const [vehicles, setVehicles] = useState<VehicleAsset[]>(initialVehicles)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<VehicleAsset | null>(
    null
  )
  const [vehicleToDelete, setVehicleToDelete] = useState<VehicleAsset | null>(
    null
  )
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleAsset | null>(
    null
  )

  const handleDelete = async () => {
    if (!vehicleToDelete) return
    const target = vehicleToDelete
    setVehicleToDelete(null)
    try {
      await deleteVehicleAsset(target.id)
      setVehicles((prev) => prev.filter((v) => v.id !== target.id))
      toast.success("Vehicle deleted")
    } catch (error) {
      console.error("Failed to delete vehicle:", error)
      toast.error("Could not delete vehicle. Please try again.")
    }
  }

  // --- Derivation (reused from the original list) ---
  const calculateOutstandingLoan = (vehicle: VehicleAsset): number => {
    const principal = parseFloat(vehicle.loanAmountTaken || "0")
    const totalMonths =
      (vehicle.loanTenureYears ?? 0) * 12 + (vehicle.loanTenureMonths ?? 0)
    if (principal > 0 && totalMonths > 0) {
      const monthsElapsed = Math.max(
        0,
        differenceInMonths(new Date(), new Date(vehicle.purchaseDate))
      )
      const k = Math.min(monthsElapsed, totalMonths)
      return Math.max(0, (principal * (totalMonths - k)) / totalMonths)
    }
    const loanRepaid = parseFloat(vehicle.loanAmountRepaid || "0")
    return Math.max(0, principal - loanRepaid)
  }

  const calculateProgress = (vehicle: VehicleAsset) => {
    const loanTaken = parseFloat(vehicle.loanAmountTaken || "0")
    if (loanTaken === 0) return 100
    const outstanding = calculateOutstandingLoan(vehicle)
    return Math.min(
      100,
      Math.max(0, ((loanTaken - outstanding) / loanTaken) * 100)
    )
  }

  const getCoeCountdown = (coeExpiryDate: string | null) => {
    if (!coeExpiryDate) return null

    const expiryDate = new Date(coeExpiryDate)
    const today = new Date()

    if (expiryDate <= today) {
      return { expired: true, text: "Expired", days: 0 }
    }

    const days = differenceInDays(expiryDate, today)
    const months = differenceInMonths(expiryDate, today)
    const years = differenceInYears(expiryDate, today)

    if (years > 0) {
      const remainingMonths = months - years * 12
      return { expired: false, text: `${years}y ${remainingMonths}m`, days }
    } else if (months > 0) {
      return { expired: false, text: `${months}m`, days }
    } else {
      return { expired: false, text: `${days}d`, days }
    }
  }

  if (vehicles.length === 0) {
    return (
      <>
        <EmptyState
          icon={Car}
          title="No vehicles yet"
          description="Add your first vehicle to start tracking your vehicle assets and loan progress."
          action={{
            label: "Add vehicle",
            onClick: () => setAddDialogOpen(true)
          }}
        />

        <AddVehicleDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={() => window.location.reload()}
        />
      </>
    )
  }

  return (
    <>
      <div className="space-y-5">
        <Toolbar
          count={{
            value: vehicles.length,
            label: vehicles.length === 1 ? "vehicle" : "vehicles"
          }}
          primaryAction={{
            label: "Add vehicle",
            onClick: () => setAddDialogOpen(true)
          }}
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {vehicles.map((vehicle) => {
            const loanTaken = parseFloat(vehicle.loanAmountTaken || "0")
            const hasLoan = loanTaken > 0
            const progress = calculateProgress(vehicle)
            const outstandingLoan = calculateOutstandingLoan(vehicle)
            const repaid =
              vehicle.loanAmountRepaid != null
                ? parseFloat(vehicle.loanAmountRepaid)
                : loanTaken - outstandingLoan
            const monthlyPayment = parseFloat(vehicle.monthlyLoanPayment || "0")
            const rate = parseFloat(vehicle.loanInterestRate || "0")
            // Interest ≈ outstanding × rate/100/12; principal = payment − interest.
            const interestRepayment = (outstandingLoan * (rate / 100)) / 12
            const principalRepayment = monthlyPayment - interestRepayment
            const showSplit = hasLoan && monthlyPayment > 0 && rate > 0
            const coeCountdown = getCoeCountdown(vehicle.coeExpiryDate)

            return (
              <Card
                key={vehicle.id}
                interactive
                className="flex cursor-pointer flex-col overflow-hidden"
                onClick={() => setSelectedVehicle(vehicle)}>
                <div className="flex flex-col gap-4 p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
                        style={{
                          background: VEHICLE_TINT,
                          color: VEHICLE_ICON
                        }}>
                        <Car className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-display truncate text-base font-semibold tracking-tight">
                          {vehicle.vehicleName}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          Purchased{" "}
                          {format(new Date(vehicle.purchaseDate), "MMM yyyy")}
                        </p>
                      </div>
                    </div>
                    <RowActions
                      onEdit={() => setEditingVehicle(vehicle)}
                      onDelete={() => setVehicleToDelete(vehicle)}
                    />
                  </div>

                  {/* Purchase price / Outstanding loan */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Purchase price
                      </p>
                      <p className="font-display text-2xl font-semibold tabular-nums">
                        {formatBudgetCurrency(
                          parseFloat(vehicle.originalPurchasePrice)
                        )}
                      </p>
                    </div>
                    {hasLoan ? (
                      <div>
                        <p className="text-muted-foreground text-sm">
                          Outstanding loan
                        </p>
                        <p className="font-display text-2xl font-semibold text-[#7A5A00] tabular-nums dark:text-[#D4A843]">
                          {formatBudgetCurrency(outstandingLoan)}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-center">
                        <p className="text-muted-foreground text-sm">Loan</p>
                        <p className="font-display text-lg font-semibold text-[#007A68] dark:text-[#00C4AA]">
                          Owned outright
                        </p>
                      </div>
                    )}
                  </div>

                  {/* COE expiry badge (kept feature) */}
                  {coeCountdown && (
                    <div className="flex items-center gap-2">
                      <Clock className="text-muted-foreground size-4" />
                      <span className="text-muted-foreground text-sm">COE</span>
                      <Badge
                        variant={
                          coeCountdown.expired
                            ? "danger"
                            : coeCountdown.days < 365
                              ? "warning"
                              : "success"
                        }>
                        {coeCountdown.expired
                          ? "Expired"
                          : `${coeCountdown.text} left`}
                      </Badge>
                    </div>
                  )}

                  {hasLoan && (
                    <>
                      {/* Loan progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Loan progress
                          </span>
                          <span className="font-medium text-[#007A68] dark:text-[#00C4AA]">
                            {progress.toFixed(1)}% paid
                          </span>
                        </div>
                        <ProgressBar
                          value={progress}
                          color="linear-gradient(90deg, #00C4AA 0%, #5A9470 100%)"
                        />
                        <div className="text-muted-foreground flex justify-between text-xs tabular-nums">
                          <span>
                            {formatBudgetCurrency(Math.max(0, repaid))} repaid
                          </span>
                          <span>{formatBudgetCurrency(loanTaken)} total</span>
                        </div>
                      </div>

                      {/* Monthly payment / Interest rate */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-muted-foreground text-sm">
                            Monthly payment
                          </p>
                          <p className="text-lg font-semibold tabular-nums">
                            {monthlyPayment > 0
                              ? formatBudgetCurrency(monthlyPayment)
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">
                            Interest rate
                          </p>
                          <p className="text-lg font-semibold tabular-nums">
                            {rate > 0 ? `${rate.toFixed(2)}%` : "—"}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer: principal / interest split (loan only, when computable) */}
                {showSplit && (
                  <div className="border-border/40 bg-muted/60 flex items-center gap-5 border-t px-5 py-3 text-sm dark:bg-[rgba(240,235,224,0.04)]">
                    <div>
                      <span className="text-muted-foreground">Principal </span>
                      <span className="font-medium text-[#007A68] tabular-nums dark:text-[#00C4AA]">
                        {formatBudgetCurrency(Math.max(0, principalRepayment))}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Interest </span>
                      <span className="font-medium text-[#7A5A00] tabular-nums dark:text-[#D4A843]">
                        {formatBudgetCurrency(interestRepayment)}
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Add Vehicle Dialog */}
      <AddVehicleDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => window.location.reload()}
      />

      {/* Edit Vehicle Dialog */}
      <AddVehicleDialog
        open={!!editingVehicle}
        onOpenChange={(open) => !open && setEditingVehicle(null)}
        vehicle={editingVehicle}
        onSuccess={() => window.location.reload()}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={vehicleToDelete !== null}
        onOpenChange={(open) => !open && setVehicleToDelete(null)}
        title="Delete this vehicle?"
        description={
          <>
            &ldquo;{vehicleToDelete?.vehicleName}&rdquo; will be removed. This
            can&rsquo;t be undone.
            {vehicleToDelete?.linkedExpenseId &&
              " The linked monthly expense will also be removed."}
          </>
        }
        confirmLabel="Delete vehicle"
        onConfirm={handleDelete}
      />

      {/* Vehicle Details Modal */}
      <VehicleDetailsModal
        open={!!selectedVehicle}
        onOpenChange={(open) => !open && setSelectedVehicle(null)}
        vehicle={selectedVehicle}
      />
    </>
  )
}
