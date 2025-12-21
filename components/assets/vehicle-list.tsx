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
import { Badge } from "@/components/ui/badge";
import { Car, MoreHorizontal, Pencil, Trash2, Plus, Clock } from "lucide-react";
import { format, differenceInDays, differenceInMonths, differenceInYears } from "date-fns";
import { AddVehicleDialog } from "./add-vehicle-dialog";
import { VehicleDetailsModal } from "./vehicle-details-modal";
import { deleteVehicleAsset } from "@/lib/actions/vehicle-assets";

interface VehicleAsset {
  id: string;
  vehicleName: string;
  purchaseDate: string;
  coeExpiryDate: string | null;
  originalPurchasePrice: string;
  loanAmountTaken: string | null;
  loanAmountRepaid: string | null;
  monthlyLoanPayment: string | null;
  linkedExpenseId: string | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface VehicleListProps {
  initialVehicles: VehicleAsset[];
}

export function VehicleList({ initialVehicles }: VehicleListProps) {
  const [vehicles, setVehicles] = useState<VehicleAsset[]>(initialVehicles);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleAsset | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<VehicleAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleAsset | null>(null);

  const handleDelete = async () => {
    if (!vehicleToDelete) return;

    setIsDeleting(true);
    try {
      await deleteVehicleAsset(vehicleToDelete.id);
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleToDelete.id));
      setDeleteDialogOpen(false);
      setVehicleToDelete(null);
    } catch (error) {
      console.error("Failed to delete vehicle:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const calculateProgress = (vehicle: VehicleAsset) => {
    const loanTaken = parseFloat(vehicle.loanAmountTaken || "0");
    const loanRepaid = parseFloat(vehicle.loanAmountRepaid || "0");
    if (loanTaken === 0) return 100; // Fully paid or no loan
    return Math.min(100, Math.max(0, (loanRepaid / loanTaken) * 100));
  };

  const getCoeCountdown = (coeExpiryDate: string | null) => {
    if (!coeExpiryDate) return null;

    const expiryDate = new Date(coeExpiryDate);
    const today = new Date();

    if (expiryDate <= today) {
      return { expired: true, text: "Expired", days: 0 };
    }

    const days = differenceInDays(expiryDate, today);
    const months = differenceInMonths(expiryDate, today);
    const years = differenceInYears(expiryDate, today);

    if (years > 0) {
      const remainingMonths = months - (years * 12);
      return {
        expired: false,
        text: `${years}y ${remainingMonths}m`,
        days
      };
    } else if (months > 0) {
      return { expired: false, text: `${months}m`, days };
    } else {
      return { expired: false, text: `${days}d`, days };
    }
  };

  if (vehicles.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Car className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Add your first vehicle to start tracking your vehicle assets and loan progress.
          </p>
          <Button
            variant="outline"
            onClick={() => setAddDialogOpen(true)}
            className="h-8 px-4 text-sm font-medium bg-transparent border-border/60 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-border rounded-full transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        </div>

        <AddVehicleDialog
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
            {vehicles.length} {vehicles.length === 1 ? "vehicle" : "vehicles"}
          </p>
          <Button
            variant="outline"
            onClick={() => setAddDialogOpen(true)}
            className="h-8 px-4 text-sm font-medium bg-transparent border-border/60 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-border rounded-full transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {vehicles.map((vehicle) => {
            const progress = calculateProgress(vehicle);
            const loanTaken = parseFloat(vehicle.loanAmountTaken || "0");
            const loanRepaid = parseFloat(vehicle.loanAmountRepaid || "0");
            const outstandingLoan = Math.max(0, loanTaken - loanRepaid);
            const coeCountdown = getCoeCountdown(vehicle.coeExpiryDate);

            return (
              <Card
                key={vehicle.id}
                className="relative overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedVehicle(vehicle)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950">
                        <Car className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{vehicle.vehicleName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Purchased {format(new Date(vehicle.purchaseDate), "MMM yyyy")}
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
                            setEditingVehicle(vehicle);
                          }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setVehicleToDelete(vehicle);
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
                        ${parseFloat(vehicle.originalPurchasePrice).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Outstanding Loan</p>
                      <p className="text-2xl font-semibold tabular-nums text-amber-600">
                        ${outstandingLoan.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* COE Expiry Badge */}
                  {coeCountdown && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">COE:</span>
                      <Badge
                        variant="secondary"
                        className={coeCountdown.expired
                          ? "bg-red-100 text-red-700"
                          : coeCountdown.days < 365
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }
                      >
                        {coeCountdown.expired ? "Expired" : `${coeCountdown.text} left`}
                      </Badge>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {loanTaken > 0 && (
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
                            background: `linear-gradient(90deg, #a855f7 0%, #c084fc 100%)`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>${loanRepaid.toLocaleString()} repaid</span>
                        <span>${loanTaken.toLocaleString()} total</span>
                      </div>
                    </div>
                  )}

                  {/* Footer with Monthly Payment */}
                  {vehicle.monthlyLoanPayment && parseFloat(vehicle.monthlyLoanPayment) > 0 && (
                    <div className="pt-3 border-t bg-gray-50/50 -mx-6 -mb-6 px-6 py-3 rounded-b-xl">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Monthly Payment:</span>
                        <span className="font-semibold text-gray-900">
                          ${parseFloat(vehicle.monthlyLoanPayment).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{vehicleToDelete?.vehicleName}"?
              {vehicleToDelete?.linkedExpenseId && (
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

      {/* Vehicle Details Modal */}
      <VehicleDetailsModal
        open={!!selectedVehicle}
        onOpenChange={(open) => !open && setSelectedVehicle(null)}
        vehicle={selectedVehicle}
      />
    </>
  );
}
