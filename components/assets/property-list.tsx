"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Home, MoreHorizontal, Pencil, Trash2, Plus, TrendingUp } from "lucide-react";
import { format } from "date-fns";
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
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PropertyListProps {
  initialProperties: PropertyAsset[];
}

export function PropertyList({ initialProperties }: PropertyListProps) {
  const [properties, setProperties] = useState<PropertyAsset[]>(initialProperties);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyAsset | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<PropertyAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyAsset | null>(null);

  const handleDelete = async () => {
    if (!propertyToDelete) return;

    setIsDeleting(true);
    try {
      await deletePropertyAsset(propertyToDelete.id);
      setProperties((prev) => prev.filter((p) => p.id !== propertyToDelete.id));
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
    } catch (error) {
      console.error("Failed to delete property:", error);
    } finally {
      setIsDeleting(false);
    }
  };

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

  const calculateCpfReturn = (property: PropertyAsset) => {
    const principal = parseFloat(property.principalCpfWithdrawn || "0");
    const grant = parseFloat(property.housingGrantTaken || "0");
    const accrued = parseFloat(property.accruedInterestToDate || "0");
    return principal + grant + accrued;
  };

  if (properties.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Home className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No properties yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Add your first property to start tracking your real estate assets and loan progress.
          </p>
          <Button
            variant="outline"
            onClick={() => setAddDialogOpen(true)}
            className="h-8 px-4 text-sm font-medium bg-transparent border-border/60 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-border rounded-full transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        </div>

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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {properties.length} {properties.length === 1 ? "property" : "properties"}
          </p>
          <Button
            variant="outline"
            onClick={() => setAddDialogOpen(true)}
            className="h-8 px-4 text-sm font-medium bg-transparent border-border/60 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-border rounded-full transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {properties.map((property) => {
            const progress = calculateProgress(property);
            const interestRepayment = calculateInterestRepayment(property);
            const principalRepayment = calculatePrincipalRepayment(property);
            const cpfReturn = calculateCpfReturn(property);
            const loanRepaid = parseFloat(property.loanAmountTaken || "0") - parseFloat(property.outstandingLoan);

            return (
              <Card
                key={property.id}
                className="relative overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedProperty(property)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100">
                        <Home className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{property.propertyName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Purchased {format(new Date(property.purchaseDate), "MMM yyyy")}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setEditingProperty(property);
                          }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPropertyToDelete(property);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Purchase Price</p>
                      <p className="text-2xl font-semibold tabular-nums">
                        ${parseFloat(property.originalPurchasePrice).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Outstanding Loan</p>
                      <p className="text-2xl font-semibold tabular-nums text-amber-600">
                        ${parseFloat(property.outstandingLoan).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {property.loanAmountTaken && parseFloat(property.loanAmountTaken) > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Loan Progress</span>
                        <span className="font-medium text-emerald-600">{progress.toFixed(1)}% paid</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${progress}%`,
                            background: `linear-gradient(90deg, #10b981 0%, #34d399 100%)`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>${loanRepaid.toLocaleString()} repaid</span>
                        <span>${parseFloat(property.loanAmountTaken).toLocaleString()} total</span>
                      </div>
                    </div>
                  )}

                  {/* Monthly Payment Details */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Payment</p>
                      <p className="text-lg font-semibold tabular-nums">
                        ${parseFloat(property.monthlyLoanPayment).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Interest Rate</p>
                      <p className="text-lg font-semibold tabular-nums">
                        {parseFloat(property.interestRate).toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {/* Footer with breakdown */}
                  <div className="pt-3 border-t bg-gray-50/50 -mx-6 -mb-6 px-6 py-3 rounded-b-xl">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-muted-foreground">Principal:</span>{" "}
                          <span className="font-medium text-emerald-600">
                            ${principalRepayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Interest:</span>{" "}
                          <span className="font-medium text-amber-600">
                            ${interestRepayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                      {cpfReturn > 0 && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-blue-500" />
                          <span className="text-muted-foreground">CPF Return:</span>{" "}
                          <span className="font-medium text-blue-600">
                            ${cpfReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{propertyToDelete?.propertyName}"?
              {propertyToDelete?.linkedExpenseId && (
                <span className="block mt-2 text-amber-600">
                  This will also remove the linked monthly expense.
                </span>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Property Details Modal */}
      <PropertyDetailsModal
        open={!!selectedProperty}
        onOpenChange={(open) => !open && setSelectedProperty(null)}
        property={selectedProperty}
      />
    </>
  );
}
