"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Info } from "lucide-react";
import { format, parse } from "date-fns";
import { cn } from "@/lib/utils";
import { updateIncome } from "@/lib/actions/income";

interface Income {
  id: string;
  name: string;
  category: string;
  amount: string;
  frequency: string;
  subjectToCpf: boolean | null;
  bonusAmount: string | null;
  employeeCpfContribution: string | null;
  employerCpfContribution: string | null;
  netTakeHome: string | null;
  description: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface EditIncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  income: Income | null;
  onIncomeUpdated: (income: Income) => void;
}

const CATEGORIES = [
  "Salary",
  "Freelance",
  "Business",
  "Investment",
  "Rental",
  "Dividend",
  "Other",
];

const FREQUENCIES = [
  { value: "monthly", label: "Monthly", description: "Recurring every month on the same day" },
  { value: "weekly", label: "Weekly", description: "Recurring every week on the same day" },
  { value: "bi-weekly", label: "Bi-weekly", description: "Recurring every two weeks" },
  { value: "yearly", label: "Yearly", description: "Recurring once a year" },
  { value: "one-time", label: "One-time", description: "Single payment" },
];

export function EditIncomeDialog({ open, onOpenChange, income, onIncomeUpdated }: EditIncomeDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [subjectToCpf, setSubjectToCpf] = useState(false);
  const [amount, setAmount] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when income changes
  useEffect(() => {
    if (income) {
      setName(income.name);
      setCategory(income.category);
      setSubjectToCpf(income.subjectToCpf || false);
      setAmount(income.amount);
      setBonusAmount(income.bonusAmount || "");
      setFrequency(income.frequency);
      setStartDate(parse(income.startDate, "yyyy-MM-dd", new Date()));
      setEndDate(income.endDate ? parse(income.endDate, "yyyy-MM-dd", new Date()) : undefined);
      setNotes(income.description || "");
    }
  }, [income]);

  const selectedFrequency = FREQUENCIES.find((f) => f.value === frequency);

  const handleSubmit = async () => {
    if (!income || !name || !category || !amount || !startDate) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedIncome = await updateIncome(income.id, {
        name,
        category,
        amount: parseFloat(amount),
        frequency,
        subjectToCpf,
        bonusAmount: bonusAmount ? parseFloat(bonusAmount) : undefined,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: endDate ? format(endDate, "yyyy-MM-dd") : null,
        description: notes || undefined,
      });

      onIncomeUpdated(updatedIncome);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update income:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Income
            <Info className="h-4 w-4 text-muted-foreground" />
          </DialogTitle>
          <DialogDescription>Update the income source details.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Row 1: Name and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                Income Source Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                placeholder="e.g., Monthly Salary"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: CPF Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-cpf"
              checked={subjectToCpf}
              onCheckedChange={(checked) => setSubjectToCpf(checked as boolean)}
            />
            <Label htmlFor="edit-cpf" className="text-sm font-medium leading-none">
              Subject to CPF Deductions <span className="text-red-500">*</span>
            </Label>
          </div>

          {/* Row 2.5: Annual Bonus (only shown when subject to CPF) */}
          {subjectToCpf && (
            <div className="space-y-2">
              <Label htmlFor="edit-bonus">Annual Bonus (SGD)</Label>
              <Input
                id="edit-bonus"
                type="number"
                placeholder="0"
                value={bonusAmount}
                onChange={(e) => setBonusAmount(e.target.value)}
                min="0"
                step="0.01"
                className="bg-white"
              />
              <p className="text-xs text-muted-foreground">
                Enter your annual bonus amount (will be used for CPF calculations)
              </p>
            </div>
          )}

          {/* Row 3: Amount and Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">
                Amount (SGD) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-frequency">
                Payment Frequency <span className="text-red-500">*</span>
              </Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFrequency && (
                <p className="text-xs text-muted-foreground">{selectedFrequency.description}</p>
              )}
            </div>
          </div>

          {/* Row 4: Start Date and End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "MMMM do, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus fixedWeeks />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "MMMM do, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus fixedWeeks />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Leave empty for ongoing income</p>
            </div>
          </div>

          {/* Row 5: Payment Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Payment Notes</Label>
            <Textarea
              id="edit-notes"
              placeholder="e.g., Includes Q4 bonus, prorated for mid-month start..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="bg-white"
            />
            <p className="text-xs text-muted-foreground">Add any notes about this payment period</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name || !category || !amount || !startDate || isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
