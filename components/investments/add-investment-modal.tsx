"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooterSticky,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Investment {
  id: string;
  name: string;
  type: string;
  currentCapital: string;
  projectedYield: string;
  contributionAmount: string;
  contributionFrequency: string;
  customMonths: string | null;
  isActive: boolean | null;
}

interface AddInvestmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: Investment | null;
  onSubmit: (data: {
    name: string;
    type: string;
    currentCapital: string;
    projectedYield: string;
    contributionAmount: string;
    contributionFrequency: string;
    customMonths?: string;
  }) => Promise<void>;
}

const INVESTMENT_TYPES = [
  { value: "stock", label: "Stock" },
  { value: "cash", label: "Cash" },
  { value: "bonds", label: "Bonds" },
  { value: "etf", label: "ETF" },
  { value: "crypto", label: "Crypto" },
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "reit", label: "REIT" },
];

const MONTHS = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Aug" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dec" },
];

export function AddInvestmentModal({
  open,
  onOpenChange,
  investment,
  onSubmit,
}: AddInvestmentModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("stock");
  const [currentCapital, setCurrentCapital] = useState("");
  const [projectedYield, setProjectedYield] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionFrequency, setContributionFrequency] = useState("monthly");
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes or investment changes
  useEffect(() => {
    if (open) {
      if (investment) {
        setName(investment.name);
        setType(investment.type);
        setCurrentCapital(investment.currentCapital);
        setProjectedYield(investment.projectedYield);
        setContributionAmount(investment.contributionAmount);
        setContributionFrequency(investment.contributionFrequency);
        if (investment.customMonths) {
          try {
            setSelectedMonths(JSON.parse(investment.customMonths));
          } catch {
            setSelectedMonths([]);
          }
        } else {
          setSelectedMonths([]);
        }
      } else {
        resetForm();
      }
    }
  }, [open, investment]);

  const resetForm = () => {
    setName("");
    setType("stock");
    setCurrentCapital("");
    setProjectedYield("");
    setContributionAmount("");
    setContributionFrequency("monthly");
    setSelectedMonths([]);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month)
        ? prev.filter((m) => m !== month)
        : [...prev, month].sort((a, b) => a - b)
    );
  };

  const handleSubmit = async () => {
    if (!name || !currentCapital || !projectedYield || !contributionAmount) {
      return;
    }

    if (contributionFrequency === "custom" && selectedMonths.length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        name,
        type,
        currentCapital,
        projectedYield,
        contributionAmount,
        contributionFrequency,
        customMonths:
          contributionFrequency === "custom"
            ? JSON.stringify(selectedMonths)
            : undefined,
      });
      handleClose(false);
    } catch (error) {
      console.error("Failed to save investment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    name &&
    currentCapital &&
    projectedYield &&
    contributionAmount &&
    (contributionFrequency !== "custom" || selectedMonths.length > 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {investment ? "Edit Investment" : "Add Investment"}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-6 py-4">
            {/* Basic Details */}
            <div className="space-y-4">
              <div className="pb-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Investment Details
                </h3>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Investment Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g., S&P 500 ETF, High Yield Savings"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">
                      Type <span className="text-red-500">*</span>
                    </Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {INVESTMENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-4">
              <div className="pb-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Financial Details
                </h3>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentCapital">
                      Current Portfolio Capital{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        id="currentCapital"
                        type="number"
                        placeholder="0.00"
                        value={currentCapital}
                        onChange={(e) => setCurrentCapital(e.target.value)}
                        min="0"
                        step="0.01"
                        className="bg-white pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="projectedYield">
                        Projected Annual Yield %{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <HelpCircle className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-[320px] text-xs bg-white border shadow-lg p-3"
                          >
                            <p className="font-semibold mb-2">
                              Wealth Projection Formula
                            </p>
                            <p className="mb-2">
                              <strong>With Contributions:</strong>
                              <br />
                              FV = C × (1 + r/12)<sup>n</sup> + PMT ×
                              ((1 + r/12)<sup>n</sup> - 1) / (r/12)
                            </p>
                            <p className="mb-2">
                              <strong>Without Contributions:</strong>
                              <br />
                              FV = C × (1 + r/12)<sup>n</sup>
                            </p>
                            <p className="text-muted-foreground text-[10px]">
                              Where C = capital, r = annual yield, n = months,
                              PMT = monthly contribution. Interest compounds
                              monthly.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="relative">
                      <Input
                        id="projectedYield"
                        type="number"
                        placeholder="0.00"
                        value={projectedYield}
                        onChange={(e) => setProjectedYield(e.target.value)}
                        min="0"
                        step="0.01"
                        className="bg-white pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contribution Details */}
            <div className="space-y-4">
              <div className="pb-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Contribution Details
                </h3>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contributionAmount">
                      Contribution Amount{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        id="contributionAmount"
                        type="number"
                        placeholder="0.00"
                        value={contributionAmount}
                        onChange={(e) => setContributionAmount(e.target.value)}
                        min="0"
                        step="0.01"
                        className="bg-white pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Contribution Frequency</Label>
                    <div className="flex items-center gap-4 h-10">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="frequency"
                          checked={contributionFrequency === "custom"}
                          onCheckedChange={(checked) =>
                            setContributionFrequency(
                              checked ? "custom" : "monthly"
                            )
                          }
                        />
                        <Label
                          htmlFor="frequency"
                          className="text-sm font-normal cursor-pointer"
                        >
                          {contributionFrequency === "monthly"
                            ? "Monthly"
                            : "Custom"}
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Custom Months Selector */}
                {contributionFrequency === "custom" && (
                  <div className="space-y-2 pt-2">
                    <Label>
                      Select Months <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-6 gap-2">
                      {MONTHS.map((month) => (
                        <button
                          key={month.value}
                          type="button"
                          onClick={() => toggleMonth(month.value)}
                          className={cn(
                            "px-3 py-2 text-sm rounded-md border transition-colors",
                            selectedMonths.includes(month.value)
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                          )}
                        >
                          {month.label}
                        </button>
                      ))}
                    </div>
                    {selectedMonths.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedMonths.length} contribution
                        {selectedMonths.length > 1 ? "s" : ""} per year
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooterSticky>
          <Button
            variant="ghost"
            onClick={() => handleClose(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isFormValid || isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : investment
              ? "Update Investment"
              : "Add Investment"}
          </Button>
        </DialogFooterSticky>
      </DialogContent>
    </Dialog>
  );
}
