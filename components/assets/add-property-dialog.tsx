"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooterSticky,
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
import { createPropertyAsset, updatePropertyAsset } from "@/lib/actions/property-assets";

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
}

interface AddPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: PropertyAsset | null;
  onSuccess?: () => void;
}

export function AddPropertyDialog({
  open,
  onOpenChange,
  property,
  onSuccess,
}: AddPropertyDialogProps) {
  // Property Information
  const [propertyName, setPropertyName] = useState(property?.propertyName || "");
  const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(
    property?.purchaseDate ? new Date(property.purchaseDate) : undefined
  );
  const [purchaseDateOpen, setPurchaseDateOpen] = useState(false);

  // Purchase Details
  const [originalPurchasePrice, setOriginalPurchasePrice] = useState(
    property?.originalPurchasePrice || ""
  );
  const [loanAmountTaken, setLoanAmountTaken] = useState(
    property?.loanAmountTaken || ""
  );

  // Loan Repayment
  const [outstandingLoan, setOutstandingLoan] = useState(
    property?.outstandingLoan || ""
  );
  const [monthlyLoanPayment, setMonthlyLoanPayment] = useState(
    property?.monthlyLoanPayment || ""
  );
  const [interestRate, setInterestRate] = useState(property?.interestRate || "");

  // Additional Details
  const [principalCpfWithdrawn, setPrincipalCpfWithdrawn] = useState(
    property?.principalCpfWithdrawn || ""
  );
  const [housingGrantTaken, setHousingGrantTaken] = useState(
    property?.housingGrantTaken || ""
  );
  const [accruedInterestToDate, setAccruedInterestToDate] = useState(
    property?.accruedInterestToDate || ""
  );

  // CPF Integration
  const [paidByCpf, setPaidByCpf] = useState(!!property?.paidByCpf);

  // Expenditure Integration
  const [addToExpenditures, setAddToExpenditures] = useState(
    !!property?.linkedExpenseId
  );
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [expenditureAmount, setExpenditureAmount] = useState("");
  const [validationError, setValidationError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculated fields
  const loanAmountRepaid = useMemo(() => {
    const taken = parseFloat(loanAmountTaken) || 0;
    const outstanding = parseFloat(outstandingLoan) || 0;
    return taken - outstanding;
  }, [loanAmountTaken, outstandingLoan]);

  const interestRepayment = useMemo(() => {
    const outstanding = parseFloat(outstandingLoan) || 0;
    const rate = parseFloat(interestRate) || 0;
    return (outstanding * (rate / 100)) / 12;
  }, [outstandingLoan, interestRate]);

  const principalRepayment = useMemo(() => {
    const monthly = parseFloat(monthlyLoanPayment) || 0;
    return monthly - interestRepayment;
  }, [monthlyLoanPayment, interestRepayment]);

  const amountToBeReturnedToCpf = useMemo(() => {
    const principal = parseFloat(principalCpfWithdrawn) || 0;
    const grant = parseFloat(housingGrantTaken) || 0;
    const accrued = parseFloat(accruedInterestToDate) || 0;
    return principal + grant + accrued;
  }, [principalCpfWithdrawn, housingGrantTaken, accruedInterestToDate]);

  const resetForm = () => {
    setPropertyName("");
    setPurchaseDate(undefined);
    setOriginalPurchasePrice("");
    setLoanAmountTaken("");
    setOutstandingLoan("");
    setMonthlyLoanPayment("");
    setInterestRate("");
    setPrincipalCpfWithdrawn("");
    setHousingGrantTaken("");
    setAccruedInterestToDate("");
    setPaidByCpf(false);
    setAddToExpenditures(false);
    setConfirmationModalOpen(false);
    setExpenseName("");
    setExpenditureAmount("");
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
      // Generate default expense name and set initial expenditure amount
      setExpenseName(propertyName ? `${propertyName} - Loan Payment` : "Property Loan Payment");
      setExpenditureAmount(monthlyLoanPayment);
      setConfirmationModalOpen(true);
    } else {
      setAddToExpenditures(false);
      setExpenseName("");
      setExpenditureAmount("");
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

  // Update form fields when property prop changes (for edit mode)
  useEffect(() => {
    if (property) {
      setPropertyName(property.propertyName);
      setPurchaseDate(new Date(property.purchaseDate));
      setOriginalPurchasePrice(property.originalPurchasePrice);
      setLoanAmountTaken(property.loanAmountTaken || "");
      setOutstandingLoan(property.outstandingLoan);
      setMonthlyLoanPayment(property.monthlyLoanPayment);
      setInterestRate(property.interestRate);
      setPrincipalCpfWithdrawn(property.principalCpfWithdrawn || "");
      setHousingGrantTaken(property.housingGrantTaken || "");
      setAccruedInterestToDate(property.accruedInterestToDate || "");
      setPaidByCpf(!!property.paidByCpf);
      setAddToExpenditures(!!property.linkedExpenseId);
    }
  }, [property]);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!propertyName || !purchaseDate || !originalPurchasePrice || !outstandingLoan || !monthlyLoanPayment || !interestRate) {
      return;
    }

    setIsSubmitting(true);

    try {
      const data = {
        propertyName,
        purchaseDate: format(purchaseDate, "yyyy-MM-dd"),
        originalPurchasePrice: parseFloat(originalPurchasePrice),
        loanAmountTaken: loanAmountTaken ? parseFloat(loanAmountTaken) : undefined,
        outstandingLoan: parseFloat(outstandingLoan),
        monthlyLoanPayment: parseFloat(monthlyLoanPayment),
        interestRate: parseFloat(interestRate),
        principalCpfWithdrawn: principalCpfWithdrawn ? parseFloat(principalCpfWithdrawn) : undefined,
        housingGrantTaken: housingGrantTaken ? parseFloat(housingGrantTaken) : undefined,
        accruedInterestToDate: accruedInterestToDate ? parseFloat(accruedInterestToDate) : undefined,
        paidByCpf,
        addToExpenditures,
        expenseName: addToExpenditures ? expenseName : undefined,
        expenditureAmount: addToExpenditures && expenditureAmount ? parseFloat(expenditureAmount) : undefined,
      };

      if (property) {
        await updatePropertyAsset(property.id, data);
      } else {
        await createPropertyAsset(data);
      }

      handleClose(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to save property:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = propertyName && purchaseDate && originalPurchasePrice && outstandingLoan && monthlyLoanPayment && interestRate;

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {property ? "Edit Property" : "Add Property"}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
        <div className="space-y-6 py-4">
          {/* Property Information */}
          <div className="space-y-4">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Property Information</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyName">
                    Property Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="propertyName"
                    placeholder="e.g. Fernvale HDB"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
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
                  <Label htmlFor="outstandingLoan">
                    Outstanding Loan <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="outstandingLoan"
                      type="number"
                      placeholder="0"
                      value={outstandingLoan}
                      onChange={(e) => setOutstandingLoan(e.target.value)}
                      min="0"
                      step="0.01"
                      className="bg-white pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loanAmountRepaid">Loan Amount Repaid</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="loanAmountRepaid"
                      type="number"
                      value={loanAmountRepaid.toFixed(2)}
                      disabled
                      className="bg-gray-100 pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Auto populated: Loan Amount Taken - Outstanding Loan
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyLoanPayment">
                    Monthly Loan Payment <span className="text-red-500">*</span>
                  </Label>
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
                  <p className="text-xs text-muted-foreground">
                    You pay this amount monthly
                  </p>
                  <div className="flex items-center justify-between mt-3 p-2.5 bg-white border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <Label htmlFor="paidByCpf" className="text-xs font-semibold text-gray-900">
                        Paid by CPF?
                      </Label>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Deduct from CPF OA projection, split across all CPF-contributing members
                      </p>
                    </div>
                    <Switch
                      id="paidByCpf"
                      checked={paidByCpf}
                      onCheckedChange={setPaidByCpf}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interestRate">
                    Interest Rate <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    <Input
                      id="interestRate"
                      type="number"
                      placeholder="0.00"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      min="0"
                      step="0.01"
                      className="bg-white pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your interest rate with HDB/Bank
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interestRepayment">
                    Interest Repayment
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="interestRepayment"
                      type="number"
                      value={interestRepayment.toFixed(2)}
                      disabled
                      className="bg-gray-100 pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Auto calculated: Outstanding Loan x (Interest Rate / 100) / 12
                    <br />
                    This amount is used to pay off the interest rate
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="principalRepayment">
                    Principal Repayment
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="principalRepayment"
                      type="number"
                      value={principalRepayment.toFixed(2)}
                      disabled
                      className="bg-gray-100 pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Auto calculated: Monthly Loan Payment - Interest Repayment
                    <br />
                    This amount is used to pay off your outstanding loan
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <div className="pb-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Additional Details</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="principalCpfWithdrawn">Principal CPF Withdrawn</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="principalCpfWithdrawn"
                      type="number"
                      placeholder="0.00"
                      value={principalCpfWithdrawn}
                      onChange={(e) => setPrincipalCpfWithdrawn(e.target.value)}
                      min="0"
                      step="0.01"
                      className="bg-white pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="housingGrantTaken">Housing Grant Taken</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="housingGrantTaken"
                      type="number"
                      placeholder="0.00"
                      value={housingGrantTaken}
                      onChange={(e) => setHousingGrantTaken(e.target.value)}
                      min="0"
                      step="0.01"
                      className="bg-white pl-7"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accruedInterestToDate">Accrued Interest to Date</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="accruedInterestToDate"
                      type="number"
                      placeholder="0.00"
                      value={accruedInterestToDate}
                      onChange={(e) => setAccruedInterestToDate(e.target.value)}
                      min="0"
                      step="0.01"
                      className="bg-white pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amountToBeReturnedToCpf">Amount to be returned to CPF</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      id="amountToBeReturnedToCpf"
                      type="number"
                      value={amountToBeReturnedToCpf.toFixed(2)}
                      disabled
                      className="bg-gray-100 pl-7"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Auto calculated: Principal CPF Withdrawn + Housing Grant Taken + Accrued Interest to Date
                  </p>
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
                    Automatically track this property's monthly loan payment as a recurring expenditure
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
        </DialogBody>

        {/* Footer */}
        <DialogFooterSticky>
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isFormValid || isSubmitting}>
            {isSubmitting ? "Saving..." : property ? "Update Property" : "Add Property"}
          </Button>
        </DialogFooterSticky>
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

          {/* Monthly Payment Input - Editable */}
          <div className="space-y-2">
            <Label htmlFor="expenditureAmount" className="text-sm font-medium">
              Monthly Payment
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="expenditureAmount"
                type="number"
                value={expenditureAmount}
                onChange={(e) => setExpenditureAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Defaults to your monthly loan payment. Adjust if needed.
            </p>
          </div>

          {/* Display-only Details */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-600">Property:</div>
            <div className="font-medium">{propertyName || "-"}</div>

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
