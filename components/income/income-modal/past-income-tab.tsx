"use client";

import React, { useState } from "react";
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
import { Trash2, Plus, History } from "lucide-react";
import { PastIncomeEntry, MONTHS } from "./types";

interface PastIncomeTabProps {
  pastIncomeHistory: PastIncomeEntry[];
  setPastIncomeHistory: (value: PastIncomeEntry[]) => void;
}

export function PastIncomeTab({
  pastIncomeHistory,
  setPastIncomeHistory,
}: PastIncomeTabProps) {
  const currentYear = new Date().getFullYear();
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newEntry, setNewEntry] = useState<PastIncomeEntry>({
    period: "",
    granularity: "monthly",
    amount: 0,
    notes: "",
  });

  // Generate months for the past 5 years (excluding current month)
  const getAvailableMonths = () => {
    const months: { value: string; label: string }[] = [];
    const currentMonth = new Date().getMonth() + 1;
    for (let year = currentYear; year >= currentYear - 5; year--) {
      for (let month = 12; month >= 1; month--) {
        // Skip current and future months
        if (year === currentYear && month >= currentMonth) continue;

        const period = `${year}-${String(month).padStart(2, "0")}`;
        const monthName = MONTHS.find(m => m.value === month)?.label || "";
        months.push({
          value: period,
          label: `${monthName} ${year}`,
        });
      }
    }
    return months;
  };

  const startAddEntry = () => {
    setNewEntry({
      period: "",
      granularity: "monthly",
      amount: 0,
      notes: "",
    });
    setIsAddingNew(true);
  };

  const saveNewEntry = () => {
    if (!newEntry.period) return;
    setPastIncomeHistory([newEntry, ...pastIncomeHistory]);
    setIsAddingNew(false);
    setNewEntry({
      period: "",
      granularity: "monthly",
      amount: 0,
      notes: "",
    });
  };

  const cancelAddEntry = () => {
    setIsAddingNew(false);
    setNewEntry({
      period: "",
      granularity: "monthly",
      amount: 0,
      notes: "",
    });
  };

  const confirmRemoveEntry = (index: number) => {
    setDeleteIndex(index);
  };

  const removeEntry = () => {
    if (deleteIndex !== null) {
      setPastIncomeHistory(pastIncomeHistory.filter((_, i) => i !== deleteIndex));
      setDeleteIndex(null);
    }
  };

  const updateEntry = (index: number, field: keyof PastIncomeEntry, value: string | number) => {
    const updated = [...pastIncomeHistory];
    if (field === "amount") {
      updated[index].amount = parseFloat(value as string) || 0;
    } else if (field === "period") {
      updated[index].period = value as string;
    } else if (field === "notes") {
      updated[index].notes = value as string;
    }
    setPastIncomeHistory(updated);
  };


  // Sort entries by period (newest first)
  const sortedEntries = [...pastIncomeHistory].sort((a, b) => b.period.localeCompare(a.period));

  // Check if a period is already used
  const isUsedPeriod = (period: string, currentIndex?: number) => {
    return pastIncomeHistory.some((entry, i) => (currentIndex === undefined || i !== currentIndex) && entry.period === period);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50">
          <History className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Historical Income</h3>
          <p className="text-sm text-gray-500">Track your past income to see trends over time</p>
        </div>
      </div>

      {/* New Entry Form */}
      {isAddingNew && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="text-sm font-medium text-blue-800 mb-2">New Entry</div>
          <div className="flex gap-3">
            {/* Period Selector */}
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-gray-500">Month</Label>
              <Select
                value={newEntry.period}
                onValueChange={(value) => setNewEntry({ ...newEntry, period: value })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto">
                  {getAvailableMonths().map((month) => (
                    <SelectItem
                      key={month.value}
                      value={month.value}
                      disabled={isUsedPeriod(month.value)}
                    >
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount Input */}
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-gray-500">Monthly Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newEntry.amount || ""}
                  onChange={(e) => setNewEntry({ ...newEntry, amount: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  className="bg-white pl-7"
                />
              </div>
            </div>
          </div>

          {/* Notes Input */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Notes (Optional)</Label>
            <Input
              placeholder="e.g., First year at company, included bonus..."
              value={newEntry.notes || ""}
              onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
              className="bg-white text-sm"
            />
          </div>

          {/* Save/Cancel Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelAddEntry}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={saveNewEntry}
              disabled={!newEntry.period}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Save Entry
            </Button>
          </div>
        </div>
      )}

      {/* Entries List */}
      {sortedEntries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg bg-gray-50">
          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No historical data</p>
          <p className="text-sm">Add entries to track your income history</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedEntries.map((entry, displayIndex) => {
            // Find the actual index in the original array
            const actualIndex = pastIncomeHistory.findIndex(e => e === entry);

            return (
              <div
                key={`${entry.period}-${actualIndex}`}
                className="bg-gray-50 rounded-lg p-4 space-y-3"
              >
                <div className="flex gap-3">
                  {/* Period Selector */}
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-gray-500">Month</Label>
                    <Select
                      value={entry.period}
                      onValueChange={(value) => updateEntry(actualIndex, "period", value)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        {getAvailableMonths().map((month) => (
                          <SelectItem
                            key={month.value}
                            value={month.value}
                            disabled={isUsedPeriod(month.value, actualIndex)}
                          >
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount Input */}
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-gray-500">Monthly Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={entry.amount || ""}
                        onChange={(e) => updateEntry(actualIndex, "amount", e.target.value)}
                        min="0"
                        step="0.01"
                        className="bg-white pl-7"
                      />
                    </div>
                  </div>

                  {/* Delete Button */}
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => confirmRemoveEntry(actualIndex)}
                      className="h-10 w-10 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Notes Input */}
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Notes (Optional)</Label>
                  <Input
                    placeholder="e.g., First year at company, included bonus..."
                    value={entry.notes || ""}
                    onChange={(e) => updateEntry(actualIndex, "notes", e.target.value)}
                    className="bg-white text-sm"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Entry Button */}
      <Button
        type="button"
        variant="outline"
        onClick={startAddEntry}
        disabled={isAddingNew}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Historical Entry
      </Button>

      {/* Summary */}
      {sortedEntries.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-800">
            <div className="font-medium mb-1">Summary</div>
            <div className="flex justify-between">
              <span>Total Entries:</span>
              <span className="font-semibold">{sortedEntries.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Average Monthly Income:</span>
              <span className="font-semibold">
                ${(sortedEntries.reduce((sum, e) => sum + e.amount, 0) / sortedEntries.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteIndex !== null} onOpenChange={(open) => !open && setDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this historical income entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removeEntry} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
