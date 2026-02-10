"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerBody,
  DrawerFooter,
} from "@/components/ui/drawer";
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
import { X, ArrowRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBudgetCurrency } from "@/lib/budget-utils";
import { createBudgetShift } from "@/lib/actions/budget-shifts";
import type { BudgetVsActual } from "@/lib/actions/budget-calculator";

interface AdjustBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCategory: string; // The category receiving the budget
  budgetData: BudgetVsActual[]; // All category budgets
  year: number;
  month: number;
  onSuccess?: () => void;
}

export function AdjustBudgetModal({
  open,
  onOpenChange,
  targetCategory,
  budgetData,
  year,
  month,
  onSuccess,
}: AdjustBudgetModalProps) {
  const [sourceCategory, setSourceCategory] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSourceCategory("");
      setAmount("");
      setNote("");
      setError(null);
    }
  }, [open]);

  // Get source category options (categories with remaining budget, excluding target)
  const sourceCategoryOptions = budgetData
    .filter((b) => b.categoryName !== targetCategory && b.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);

  // Get the selected source category's budget info
  const sourceBudgetInfo = budgetData.find((b) => b.categoryName === sourceCategory);
  const maxShiftable = sourceBudgetInfo?.remaining || 0;

  // Get target category's budget info
  const targetBudgetInfo = budgetData.find((b) => b.categoryName === targetCategory);

  // Parse amount
  const shiftAmount = parseFloat(amount) || 0;
  const isValidAmount = shiftAmount > 0 && shiftAmount <= maxShiftable;

  // Handle submit
  const handleSubmit = async () => {
    if (!sourceCategory || !isValidAmount) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createBudgetShift({
        year,
        month,
        fromCategoryName: sourceCategory,
        toCategoryName: targetCategory,
        amount: shiftAmount,
        note: note || undefined,
      });

      if (result.success) {
        onOpenChange(false);
        onSuccess?.();
      } else {
        setError(result.error || "Failed to shift budget");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-lg font-semibold">
            Adjust Budget
          </DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <DrawerBody className="space-y-6">
          {/* Target Category Display */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="text-sm text-muted-foreground mb-1">
              Adding budget to
            </div>
            <div className="font-semibold text-lg">{targetCategory}</div>
            {targetBudgetInfo && (
              <div className="text-sm text-muted-foreground mt-1">
                Current: {formatBudgetCurrency(targetBudgetInfo.monthlyBudget)} budget,{" "}
                {formatBudgetCurrency(targetBudgetInfo.remaining)} remaining
              </div>
            )}
          </div>

          {/* Source Category Selector */}
          <div className="space-y-2">
            <Label>Take budget from</Label>
            {sourceCategoryOptions.length === 0 ? (
              <div className="p-4 bg-muted rounded-lg text-center text-sm text-muted-foreground">
                <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                No categories have remaining budget to shift
              </div>
            ) : (
              <Select value={sourceCategory} onValueChange={setSourceCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category..." />
                </SelectTrigger>
                <SelectContent>
                  {sourceCategoryOptions.map((cat) => (
                    <SelectItem key={cat.categoryName} value={cat.categoryName}>
                      <div className="flex justify-between items-center w-full gap-4">
                        <span>{cat.categoryName}</span>
                        <span className="text-muted-foreground text-sm">
                          {formatBudgetCurrency(cat.remaining)} available
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Amount Input */}
          {sourceCategory && (
            <div className="space-y-2">
              <Label>Amount to shift</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={maxShiftable}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Max: {formatBudgetCurrency(maxShiftable)}</span>
                {shiftAmount > maxShiftable && (
                  <span className="text-red-500">Exceeds available budget</span>
                )}
              </div>
            </div>
          )}

          {/* Preview */}
          {sourceCategory && shiftAmount > 0 && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="text-sm font-medium">Preview</div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex-1">
                  <div className="font-medium">{sourceCategory}</div>
                  <div className="text-muted-foreground">
                    {formatBudgetCurrency(sourceBudgetInfo?.monthlyBudget || 0)} →{" "}
                    <span className={cn(isValidAmount ? "text-orange-600" : "text-red-600")}>
                      {formatBudgetCurrency((sourceBudgetInfo?.monthlyBudget || 0) - shiftAmount)}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 mx-4 text-muted-foreground" />
                <div className="flex-1 text-right">
                  <div className="font-medium">{targetCategory}</div>
                  <div className="text-muted-foreground">
                    {formatBudgetCurrency(targetBudgetInfo?.monthlyBudget || 0)} →{" "}
                    <span className="text-green-600">
                      {formatBudgetCurrency((targetBudgetInfo?.monthlyBudget || 0) + shiftAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Optional Note */}
          {sourceCategory && (
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., Extra dinner budget this month"
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </DrawerBody>

        <DrawerFooter className="pb-8">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!sourceCategory || !isValidAmount || isSubmitting}
            >
              {isSubmitting ? "Shifting..." : "Shift Budget"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
