"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createVehicleAsset, updateVehicleAsset } from "@/lib/actions/vehicle-assets";

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
}

interface AddVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: VehicleAsset | null;
  onSuccess?: () => void;
}

export function AddVehicleDialog({
  open,
  onOpenChange,
  vehicle,
  onSuccess,
}: AddVehicleDialogProps) {
  // Vehicle Information
  const [vehicleName, setVehicleName] = useState(vehicle?.vehicleName || "");
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(
    vehicle?.purchaseDate ? new Date(vehicle.purchaseDate) : undefined
  );
  const [purchaseDateOpen, setPurchaseDateOpen] = useState(false);
  const [coeExpiryDate, setCoeExpiryDate] = useState<Date | undefined>(
    vehicle?.coeExpiryDate ? new Date(vehicle.coeExpiryDate) : undefined
  );
  const [coeExpiryDateOpen, setCoeExpiryDateOpen] = useState(false);

  // Purchase Details
  const [originalPurchasePrice, setOriginalPurchasePrice] = useState(
    vehicle?.originalPurchasePrice || ""
  );
  const [loanAmountTaken, setLoanAmountTaken] = useState(
    vehicle?.loanAmountTaken || ""
  );

  // Loan Repayment
  const [loanAmountRepaid, setLoanAmountRepaid] = useState(
    vehicle?.loanAmountRepaid || ""
  );
  const [monthlyLoanPayment, setMonthlyLoanPayment] = useState(
    vehicle?.monthlyLoanPayment || ""
  );

  // Expenditure Integration
  const [addToExpenditures, setAddToExpenditures] = useState(
    !!vehicle?.linkedExpenseId
  );
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [validationError, setValidationError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculated field: Outstanding Loan
  const outstandingLoan = useMemo(() => {
    const taken = parseFloat(loanAmountTaken) || 0;
    const repaid = parseFloat(loanAmountRepaid) || 0;
    return Math.max(0, taken - repaid);
  }, [loanAmountTaken, loanAmountRepaid]);

  // Calculate loan progress
  const loanProgress = useMemo(() => {
    const taken = parseFloat(loanAmountTaken) || 0;
    if (taken === 0) return 100;
    const repaid = parseFloat(loanAmountRepaid) || 0;
    return Math.min(100, Math.max(0, (repaid / taken) * 100));
  }, [loanAmountTaken, loanAmountRepaid]);

  const resetForm = () => {
    setVehicleName("");
    setPurchaseDate(undefined);
    setCoeExpiryDate(undefined);
    setOriginalPurchasePrice("");
    setLoanAmountTaken("");
    setLoanAmountRepaid("");
    setMonthlyLoanPayment("");
    setAddToExpenditures(false);
    setConfirmationModalOpen(false);
    setExpenseName("");
    setValidationError("");
  };

  // Handle toggle change with validation
  const handleToggleChange = (checked: boolean) => {
    if (checked) {
      // Validate required fields before allowing toggle
      if (!purchaseDate || !monthlyLoanPayment) {
        setValidationError("Please fill in Purchase Date and Monthly Loan Payment before adding to expenses.");
        return;
      }
      setValidationError("");
      // Generate default expense name
      setExpenseName(vehicleName ? `${vehicleName} - Loan Payment` : "Vehicle Loan Payment");
      setConfirmationModalOpen(true);
    } else {
      setAddToExpenditures(false);
      setExpenseName("");
    }
  };

  // Confirm adding to expenditures
  const handleConfirmAddToExpenditures = () => {
    setAddToExpenditures(true);
    setConfirmationModalOpen(false);
  };

  // Cancel adding to expenditures
  const handleCancelAddToExpenditures = () => {
    setConfirmationModalOpen(false);
    setExpenseName("");
  };

  // Update form fields when vehicle prop changes (for edit mode)
  useEffect(() => {
    if (vehicle) {
      setVehicleName(vehicle.vehicleName);
      setPurchaseDate(new Date(vehicle.purchaseDate));
      setCoeExpiryDate(vehicle.coeExpiryDate ? new Date(vehicle.coeExpiryDate) : undefined);
      setOriginalPurchasePrice(vehicle.originalPurchasePrice);
      setLoanAmountTaken(vehicle.loanAmountTaken || "");
      setLoanAmountRepaid(vehicle.loanAmountRepaid || "");
      setMonthlyLoanPayment(vehicle.monthlyLoanPayment || "");
      setAddToExpenditures(!!vehicle.linkedExpenseId);
    }
  }, [vehicle]);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!vehicleName || !purchaseDate || !originalPurchasePrice) {
      return;
    }

    setIsSubmitting(true);

    try {
      const data = {
        vehicleName,
        purchaseDate: format(purchaseDate, "yyyy-MM-dd"),
        coeExpiryDate: coeExpiryDate ? format(coeExpiryDate, "yyyy-MM-dd") : undefined,
        originalPurchasePrice: parseFloat(originalPurchasePrice),
        loanAmountTaken: loanAmountTaken ? parseFloat(loanAmountTaken) : undefined,
        loanAmountRepaid: loanAmountRepaid ? parseFloat(loanAmountRepaid) : undefined,
        monthlyLoanPayment: monthlyLoanPayment ? parseFloat(monthlyLoanPayment) : undefined,
        addToExpenditures,
        expenseName: addToExpenditures ? expenseName : undefined,
      };

      if (vehicle) {
        await updateVehicleAsset(vehicle.id, data);
      } else {
        await createVehicleAsset(data);
      }

      handleClose(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save vehicle:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = vehicleName && purchaseDate && originalPurchasePrice;

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {vehicle ? "Edit Vehicle" : "Add Vehicle"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Vehicle Information */}
          <div className="space-y-4">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Vehicle Information</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleName">
                    Vehicle Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="vehicleName"
                    placeholder="e.g. Honda Vezel"
                    value={vehicleName}
                    onChange={(e) => setVehicleName(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Purchase Date <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={purchaseDateOpen} onOpenChange={setPurchaseDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white",
                          !purchaseDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {purchaseDate ? format(purchaseDate, "dd/MM/yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={purchaseDate}
                        onSelect={(date) => {
                          setPurchaseDate(date);
                          setPurchaseDateOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="mt-4">
                <div className="space-y-2">
                  <Label>COE Expiry Date</Label>
                  <Popover open={coeExpiryDateOpen} onOpenChange={setCoeExpiryDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white",
                          !coeExpiryDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {coeExpiryDate ? format(coeExpiryDate, "dd/MM/yyyy") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={coeExpiryDate}
                        onSelect={(date) => {
                          setCoeExpiryDate(date);
                          setCoeExpiryDateOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Certificate of Entitlement expiry date (Singapore)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Purchase Details */}
          <div className="space-y-4">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Purchase Details</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="originalPurchasePrice">
                    Original Purchase Price <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="originalPurchasePrice"
                      type="number"
                      placeholder="0.00"
                      value={originalPurchasePrice}
                      onChange={(e) => setOriginalPurchasePrice(e.target.value)}
                      min="0"
                      step="0.01"
                      className="bg-white pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loanAmountTaken">Loan Amount Taken</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="loanAmountTaken"
                      type="number"
                      placeholder="0.00"
                      value={loanAmountTaken}
                      onChange={(e) => setLoanAmountTaken(e.target.value)}
                      min="0"
                      step="0.01"
                      className="bg-white pl-7"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loan Repayment */}
          <div className="space-y-4">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Loan Repayment</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loanAmountRepaid">Loan Amount Repaid</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="loanAmountRepaid"
                      type="number"
                      placeholder="0.00"
                      value={loanAmountRepaid}
                      onChange={(e) => setLoanAmountRepaid(e.target.value)}
                      min="0"
                      step="0.01"
                      className="bg-white pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outstandingLoan">Outstanding Loan</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="outstandingLoan"
                      type="number"
                      value={outstandingLoan.toFixed(2)}
                      disabled
                      className="bg-gray-100 pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Automatically calculated as: Loan Amount Taken - Loan Amount Repaid
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyLoanPayment">Monthly Loan Payment</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="monthlyLoanPayment"
                      type="number"
                      placeholder="0.00"
                      value={monthlyLoanPayment}
                      onChange={(e) => setMonthlyLoanPayment(e.target.value)}
                      min="0"
                      step="0.01"
                      className="bg-white pl-7"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expenditure Integration */}
          <div className="space-y-4">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Expenditure Integration</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="addToExpenditures" className="text-sm font-semibold text-gray-900">
                    Add to expenditures
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Enable this to automatically track this vehicle's monthly loan payment as a recurring expenditure
                  </p>
                </div>
                <Switch
                  id="addToExpenditures"
                  checked={addToExpenditures}
                  onCheckedChange={handleToggleChange}
                />
              </div>
              {validationError && (
                <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
                  {validationError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isFormValid || isSubmitting}>
            {isSubmitting ? "Saving..." : vehicle ? "Update Vehicle" : "Add Vehicle"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Add to Expenditures Confirmation Modal */}
    <AlertDialog open={confirmationModalOpen} onOpenChange={setConfirmationModalOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add to Expenses</AlertDialogTitle>
          <AlertDialogDescription>
            This will create an expense entry with the following details:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 my-4">
          {/* Expense Name Input - Editable */}
          <div className="space-y-2">
            <Label htmlFor="expenseName" className="text-sm font-medium">
              Expense Name
            </Label>
            <Input
              id="expenseName"
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
              placeholder="Enter expense name"
              className="w-full"
            />
          </div>

          {/* Display-only Details */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-600">Vehicle:</div>
            <div className="font-medium">{vehicleName || "-"}</div>

            <div className="text-gray-600">Monthly Payment:</div>
            <div className="font-medium">
              ${monthlyLoanPayment ? parseFloat(monthlyLoanPayment).toLocaleString() : "0"}
            </div>

            <div className="text-gray-600">Frequency:</div>
            <div className="font-medium">Monthly</div>

            <div className="text-gray-600">Start Date:</div>
            <div className="font-medium">
              {purchaseDate ? format(purchaseDate, "MMMM d, yyyy") : "-"}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelAddToExpenditures}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmAddToExpenditures}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
