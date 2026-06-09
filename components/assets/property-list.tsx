"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Building2, Home } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Toolbar } from "@/components/ui/toolbar";
import { RowActions } from "@/components/ui/row-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/portfolio/progress";
import { ConfirmDialog } from "@/components/portfolio/confirm-dialog";
import { formatBudgetCurrency } from "@/lib/budget-utils";
import { AddPropertyDialog } from "./add-property-dialog";
import { PropertyDetailsModal } from "./property-details-modal";
import { deletePropertyAsset } from "@/lib/actions/property-assets";

interface PropertyAsset {
  id: string;
  propertyName: string;
  purchaseDate: string;
  originalPurchasePrice: string;
  loanAmountTaken: string | null;
  outstandingLoan: string;
  monthlyLoanPayment: string;
  interestRate: string;
  principalCpfWithdrawn: string | null;
  housingGrantTaken: string | null;
  accruedInterestToDate: string | null;
  linkedExpenseId: string | null;
  paidByCpf: boolean | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PropertyListProps {
  initialProperties: PropertyAsset[];
}

// Brand tint for the property avatar tile (terracotta).
const PROPERTY_TINT = "rgba(184,98,42,0.12)";
const PROPERTY_ICON = "#7A3A0A";

export function PropertyList({ initialProperties }: PropertyListProps) {
  const [properties, setProperties] = useState<PropertyAsset[]>(initialProperties);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyAsset | null>(null);
  const [propertyToDelete, setPropertyToDelete] = useState<PropertyAsset | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyAsset | null>(null);

  const handleDelete = async () => {
    if (!propertyToDelete) return;
    const target = propertyToDelete;
    setPropertyToDelete(null);
    try {
      await deletePropertyAsset(target.id);
      setProperties((prev) => prev.filter((p) => p.id !== target.id));
      toast.success("Property deleted");
    } catch (error) {
      console.error("Failed to delete property:", error);
      toast.error("Could not delete property. Please try again.");
    }
  };

  // --- Derivation (reused from the original list) ---
  const calculateProgress = (property: PropertyAsset) => {
    const loanTaken = parseFloat(property.loanAmountTaken || "0");
    const outstanding = parseFloat(property.outstandingLoan);
    if (loanTaken === 0) return 100; // Fully paid or no loan
    const repaid = loanTaken - outstanding;
    return Math.min(100, Math.max(0, (repaid / loanTaken) * 100));
  };

  const calculateInterestRepayment = (property: PropertyAsset) => {
    const outstanding = parseFloat(property.outstandingLoan);
    const rate = parseFloat(property.interestRate);
    return (outstanding * (rate / 100)) / 12;
  };

  const calculatePrincipalRepayment = (property: PropertyAsset) => {
    const monthly = parseFloat(property.monthlyLoanPayment);
    const interest = calculateInterestRepayment(property);
    return monthly - interest;
  };

  if (properties.length === 0) {
    return (
      <>
        <EmptyState
          icon={Home}
          title="No properties yet"
          description="Add your first property to start tracking your real estate assets and loan progress."
          action={{ label: "Add property", onClick: () => setAddDialogOpen(true) }}
        />

        <AddPropertyDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={() => window.location.reload()}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-5">
        <Toolbar
          count={{ value: properties.length, label: properties.length === 1 ? "property" : "properties" }}
          primaryAction={{ label: "Add property", onClick: () => setAddDialogOpen(true) }}
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {properties.map((property) => {
            const loanTaken = parseFloat(property.loanAmountTaken || "0");
            const hasLoan = loanTaken > 0;
            const progress = calculateProgress(property);
            const outstanding = parseFloat(property.outstandingLoan);
            const loanRepaid = loanTaken - outstanding;
            const interestRepayment = calculateInterestRepayment(property);
            const principalRepayment = calculatePrincipalRepayment(property);
            // CPF used (refundable to CPF on sale) — principal CPF + housing grant + accrued interest.
            const cpfUsed =
              parseFloat(property.principalCpfWithdrawn || "0") +
              parseFloat(property.housingGrantTaken || "0") +
              parseFloat(property.accruedInterestToDate || "0");
            // Only surface when there's an actual amount — avoids a noisy "CPF used $0.00".
            const hasCpf = cpfUsed > 0;

            return (
              <Card
                key={property.id}
                interactive
                className="flex cursor-pointer flex-col overflow-hidden"
                onClick={() => setSelectedProperty(property)}
              >
                <div className="flex flex-col gap-4 p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
                        style={{ background: PROPERTY_TINT, color: PROPERTY_ICON }}
                      >
                        <Building2 className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-base font-semibold tracking-tight">
                          {property.propertyName}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Purchased {format(new Date(property.purchaseDate), "MMM yyyy")}
                        </p>
                      </div>
                    </div>
                    <RowActions
                      onEdit={() => setEditingProperty(property)}
                      onDelete={() => setPropertyToDelete(property)}
                    />
                  </div>

                  {/* Purchase price / Outstanding loan */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Purchase price</p>
                      <p className="font-display text-2xl font-semibold tabular-nums">
                        {formatBudgetCurrency(parseFloat(property.originalPurchasePrice))}
                      </p>
                    </div>
                    {hasLoan ? (
                      <div>
                        <p className="text-sm text-muted-foreground">Outstanding loan</p>
                        <p className="font-display text-2xl font-semibold tabular-nums text-[#7A5A00] dark:text-[#D4A843]">
                          {formatBudgetCurrency(outstanding)}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-center">
                        <p className="text-sm text-muted-foreground">Loan</p>
                        <p className="font-display text-lg font-semibold text-[#007A68] dark:text-[#00C4AA]">
                          Owned outright
                        </p>
                      </div>
                    )}
                  </div>

                  {hasLoan && (
                    <>
                      {/* Loan progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Loan progress</span>
                          <span className="font-medium text-[#007A68] dark:text-[#00C4AA]">
                            {progress.toFixed(1)}% paid
                          </span>
                        </div>
                        <ProgressBar
                          value={progress}
                          color="linear-gradient(90deg, #00C4AA 0%, #5A9470 100%)"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                          <span>{formatBudgetCurrency(loanRepaid)} repaid</span>
                          <span>{formatBudgetCurrency(loanTaken)} total</span>
                        </div>
                      </div>

                      {/* Monthly payment / Interest rate */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Monthly payment</p>
                          <p className="text-lg font-semibold tabular-nums">
                            {formatBudgetCurrency(parseFloat(property.monthlyLoanPayment))}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Interest rate</p>
                          <p className="text-lg font-semibold tabular-nums">
                            {parseFloat(property.interestRate).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer: principal / interest split (loan) + CPF used (when CPF-funded) */}
                {(hasLoan || hasCpf) && (
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border/40 bg-muted/60 px-5 py-3 text-sm dark:bg-[rgba(240,235,224,0.04)]">
                    {hasLoan && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Principal </span>
                          <span className="font-medium tabular-nums text-[#007A68] dark:text-[#00C4AA]">
                            {formatBudgetCurrency(principalRepayment)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Interest </span>
                          <span className="font-medium tabular-nums text-[#7A5A00] dark:text-[#D4A843]">
                            {formatBudgetCurrency(interestRepayment)}
                          </span>
                        </div>
                      </>
                    )}
                    {hasCpf && (
                      <div>
                        <span className="text-muted-foreground">CPF used </span>
                        <span className="font-medium tabular-nums">
                          {formatBudgetCurrency(cpfUsed)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Add Property Dialog */}
      <AddPropertyDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => window.location.reload()}
      />

      {/* Edit Property Dialog */}
      <AddPropertyDialog
        open={!!editingProperty}
        onOpenChange={(open) => !open && setEditingProperty(null)}
        property={editingProperty}
        onSuccess={() => window.location.reload()}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={propertyToDelete !== null}
        onOpenChange={(open) => !open && setPropertyToDelete(null)}
        title="Delete this property?"
        description={
          <>
            &ldquo;{propertyToDelete?.propertyName}&rdquo; will be removed. This can&rsquo;t be undone.
            {propertyToDelete?.linkedExpenseId && " The linked monthly expense will also be removed."}
          </>
        }
        confirmLabel="Delete property"
        onConfirm={handleDelete}
      />

      {/* Property Details Modal */}
      <PropertyDetailsModal
        open={!!selectedProperty}
        onOpenChange={(open) => !open && setSelectedProperty(null)}
        property={selectedProperty}
      />
    </>
  );
}
