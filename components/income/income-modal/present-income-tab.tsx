"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BonusGroup, INCOME_CATEGORIES, MONTHS } from "./types";

const FREQUENCIES = [
  { value: "monthly", label: "Monthly", description: "Recurring every month on the same day" },
  { value: "custom", label: "Custom", description: "Select specific months" },
  { value: "one-time", label: "One-time", description: "Single payment" },
];

interface PresentIncomeTabProps {
  // Basic fields
  name: string;
  setName: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  frequency: string;
  setFrequency: (value: string) => void;
  selectedMonths: number[];
  setSelectedMonths: (value: number[]) => void;
  incomeCategory: string;
  setIncomeCategory: (value: string) => void;

  // Dates
  startDate: Date | undefined;
  setStartDate: (value: Date | undefined) => void;
  endDate: Date | undefined;
  setEndDate: (value: Date | undefined) => void;

  // CPF
  subjectToCpf: boolean;
  setSubjectToCpf: (value: boolean) => void;

  // Bonus
  accountForBonus: boolean;
  setAccountForBonus: (value: boolean) => void;
  bonusGroups: BonusGroup[];
  setBonusGroups: (value: BonusGroup[]) => void;

  // Notes
  notes: string;
  setNotes: (value: string) => void;

  // Family member context
  familyMemberAge?: number;
}

export function PresentIncomeTab({
  name,
  setName,
  category,
  setCategory,
  amount,
  setAmount,
  frequency,
  setFrequency,
  selectedMonths,
  setSelectedMonths,
  incomeCategory,
  setIncomeCategory,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  subjectToCpf,
  setSubjectToCpf,
  accountForBonus,
  setAccountForBonus,
  bonusGroups,
  setBonusGroups,
  notes,
  setNotes,
  familyMemberAge,
}: PresentIncomeTabProps) {
  const [startDateOpen, setStartDateOpen] = React.useState(false);
  const [endDateOpen, setEndDateOpen] = React.useState(false);

  const selectedFrequency = FREQUENCIES.find((f) => f.value === frequency);

  const toggleMonth = (month: number) => {
    setSelectedMonths(
      selectedMonths.includes(month)
        ? selectedMonths.filter((m) => m !== month)
        : [...selectedMonths, month].sort((a, b) => a - b)
    );
  };

  const addBonusGroup = () => {
    setBonusGroups([...bonusGroups, { month: 1, amount: "" }]);
  };

  const removeBonusGroup = (index: number) => {
    setBonusGroups(bonusGroups.filter((_, i) => i !== index));
  };

  const updateBonusGroup = (index: number, field: "month" | "amount", value: number | string) => {
    const updated = [...bonusGroups];
    if (field === "month") {
      updated[index].month = value as number;
    } else {
      updated[index].amount = value as string;
    }
    setBonusGroups(updated);
  };

  // Initialize bonus groups when checkbox is first checked
  React.useEffect(() => {
    if (accountForBonus && bonusGroups.length === 0) {
      setBonusGroups([{ month: 1, amount: "" }]);
    } else if (!accountForBonus) {
      setBonusGroups([]);
    }
  }, [accountForBonus, bonusGroups.length, setBonusGroups]);

  // Clear Start and End Date when "Current Recurring Income" is selected
  React.useEffect(() => {
    if (incomeCategory === "current-recurring") {
      setStartDate(undefined);
      setEndDate(undefined);
    }
  }, [incomeCategory, setStartDate, setEndDate]);

  return (
    <div className="space-y-6">
      {/* Income Type Selector */}
      <div className="space-y-2">
        <Label htmlFor="income-type">Income Type</Label>
        <Select value={incomeCategory} onValueChange={setIncomeCategory}>
          <SelectTrigger className="bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current-recurring">Recurring Income</SelectItem>
            <SelectItem value="one-off">One-off Income</SelectItem>
          </SelectContent>
        </Select>
        {incomeCategory === "current-recurring" && (
          <p className="text-xs text-muted-foreground">Income that repeats regularly (e.g., monthly salary)</p>
        )}
        {incomeCategory === "one-off" && (
          <p className="text-xs text-muted-foreground">One-time income that does not repeat (e.g., tax refund, gift)</p>
        )}
      </div>

      {/* Group 1: Basic Income Details */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div className="pb-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Basic Income Details</h3>
          <p className="text-xs text-gray-500 mt-1">Core information about the income source including amount, frequency, and CPF status</p>
        </div>

        {/* Row 1: Name and Category */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Income Source Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Monthly Salary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">
              Income Category <span className="text-red-500">*</span>
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {INCOME_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Amount and Frequency */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">
              Income Amount <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                className="bg-white pl-7"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="frequency">
              Income Frequency <span className="text-red-500">*</span>
            </Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.filter(freq =>
                  incomeCategory !== "current-recurring" || freq.value !== "one-time"
                ).map((freq) => (
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

        {/* Custom Month Selector */}
        {frequency === "custom" && (
          <div className="space-y-2">
            <Label>
              Select Months <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-6 gap-2">
              {MONTHS.map((month) => (
                <Button
                  key={month.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggleMonth(month.value)}
                  className={cn(
                    "h-10 font-medium",
                    selectedMonths.includes(month.value)
                      ? "bg-black text-white hover:bg-black/90 border-black"
                      : "bg-white hover:bg-gray-50"
                  )}
                >
                  {month.label.slice(0, 3)}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Selected: {selectedMonths.length > 0
                ? selectedMonths.map((m) => MONTHS.find(mo => mo.value === m)?.label).join(", ")
                : "None"}
            </p>
          </div>
        )}

        {/* Start Date and End Date - Shown for One-off Income */}
        {incomeCategory !== "current-recurring" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
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
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      setStartDateOpen(false);
                    }}
                    initialFocus
                    fixedWeeks
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
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
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date);
                      setEndDateOpen(false);
                    }}
                    initialFocus
                    fixedWeeks
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">Leave empty for ongoing income</p>
            </div>
          </div>
        )}

        {/* CPF Checkbox */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cpf"
              checked={subjectToCpf}
              onCheckedChange={(checked) => setSubjectToCpf(checked as boolean)}
            />
            <Label htmlFor="cpf" className="text-sm font-medium leading-none">
              Subject to CPF Deductions <span className="text-red-500">*</span>
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-6">Enable if this income has CPF contributions (typically for Singapore employment income)</p>
        </div>
      </div>

      {/* Group 2: Bonus Configuration */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div className="pb-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Income Bonus Details</h3>
          <p className="text-xs text-gray-500 mt-1">Set up bonus payments for specific months (e.g., 13th month bonus in December)</p>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="account-for-bonus"
            checked={accountForBonus}
            onCheckedChange={(checked) => setAccountForBonus(checked as boolean)}
          />
          <Label htmlFor="account-for-bonus" className="text-sm font-medium leading-none cursor-pointer">
            Account for Bonus
          </Label>
        </div>

        {/* Bonus Groups - Shown when Account for Bonus is checked */}
        {accountForBonus && (
          <div className="space-y-3">
            {/* Labels - shown once at the top */}
            <div className="flex gap-3 items-center">
              <div className="flex-1">
                <Label className="text-sm font-medium">Bonus Month</Label>
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium">Bonus (No. of Months)</Label>
              </div>
              <div className="w-[66px]"></div>
            </div>

            {bonusGroups.map((group, index) => (
              <div key={index} className="flex gap-3 items-center">
                {/* Bonus Month */}
                <Select
                  value={group.month.toString()}
                  onValueChange={(value) => updateBonusGroup(index, "month", parseInt(value))}
                >
                  <SelectTrigger className="bg-white flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label.slice(0, 3)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Bonus (No. of Months) */}
                <Input
                  id={`bonus-amount-${index}`}
                  type="number"
                  placeholder="e.g., 1.5"
                  value={group.amount}
                  onChange={(e) => updateBonusGroup(index, "amount", e.target.value)}
                  min="0"
                  step="0.1"
                  className="bg-white flex-1"
                />
                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeBonusGroup(index)}
                  disabled={index === 0 && bonusGroups.length === 1}
                  className="h-10 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBonusGroup}
              className="w-full"
            >
              + Add Bonus
            </Button>

            {/* Bonus Summary */}
            {bonusGroups.length > 0 && amount && (
              <div className="pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-600 space-y-1">
                  <div>
                    <span className="font-medium">Total Bonus Months:</span>{" "}
                    <span className="font-bold">{bonusGroups.reduce((sum, group) => sum + (parseFloat(group.amount) || 0), 0).toFixed(2)} months</span>
                  </div>
                  <div>
                    <span className="font-medium">Total Bonus Gross:</span>{" "}
                    <span className="font-bold">${(bonusGroups.reduce((sum, group) => sum + (parseFloat(group.amount) || 0), 0) * parseFloat(amount)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Group 3: Additional Information */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <div className="pb-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Additional Information</h3>
          <p className="text-xs text-gray-500 mt-1">Optional notes and details about this income source</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Payment Notes</Label>
          <Textarea
            id="notes"
            placeholder="e.g., Includes Q4 bonus, prorated for mid-month start..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="bg-white"
          />
          <p className="text-xs text-muted-foreground">Add any notes about this payment period</p>
        </div>
      </div>
    </div>
  );
}
