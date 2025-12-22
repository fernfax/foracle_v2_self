"use client";

import React, { useState, useMemo } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Trash2, Plus, TrendingUp, Sparkles } from "lucide-react";
import { FutureMilestone, MILESTONE_REASONS, MONTHS } from "./types";
import { nanoid } from "nanoid";

interface FutureMilestonesTabProps {
  futureMilestones: FutureMilestone[];
  setFutureMilestones: (value: FutureMilestone[]) => void;
  currentAmount: string; // Current income amount for projection
}

export function FutureMilestonesTab({
  futureMilestones,
  setFutureMilestones,
  currentAmount,
}: FutureMilestonesTabProps) {
  const [growthRate, setGrowthRate] = useState(5); // For visualization only
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newMilestone, setNewMilestone] = useState<FutureMilestone>({
    id: "",
    targetMonth: "",
    amount: parseFloat(currentAmount) || 0,
    reason: "",
    notes: "",
  });

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Generate future months for the next 10 years
  const getAvailableMonths = () => {
    const months: { value: string; label: string }[] = [];
    for (let year = currentYear; year <= currentYear + 10; year++) {
      for (let month = 1; month <= 12; month++) {
        // Skip past months for current year
        if (year === currentYear && month <= currentMonth) continue;

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

  const startAddMilestone = () => {
    setNewMilestone({
      id: nanoid(),
      targetMonth: "",
      amount: parseFloat(currentAmount) || 0,
      reason: "",
      notes: "",
    });
    setIsAddingNew(true);
  };

  const saveNewMilestone = () => {
    if (!newMilestone.targetMonth) return;
    setFutureMilestones([...futureMilestones, newMilestone]);
    setIsAddingNew(false);
    setNewMilestone({
      id: "",
      targetMonth: "",
      amount: parseFloat(currentAmount) || 0,
      reason: "",
      notes: "",
    });
  };

  const cancelAddMilestone = () => {
    setIsAddingNew(false);
    setNewMilestone({
      id: "",
      targetMonth: "",
      amount: parseFloat(currentAmount) || 0,
      reason: "",
      notes: "",
    });
  };

  const confirmRemoveMilestone = (id: string) => {
    setDeleteId(id);
  };

  const removeMilestone = () => {
    if (deleteId !== null) {
      setFutureMilestones(futureMilestones.filter((m) => m.id !== deleteId));
      setDeleteId(null);
    }
  };

  const updateMilestone = (id: string, field: keyof FutureMilestone, value: string | number) => {
    const updated = futureMilestones.map((m) => {
      if (m.id !== id) return m;
      if (field === "amount") {
        return { ...m, amount: parseFloat(value as string) || 0 };
      }
      return { ...m, [field]: value };
    });
    setFutureMilestones(updated);
  };

  // Sort milestones by target month
  const sortedMilestones = [...futureMilestones].sort((a, b) =>
    a.targetMonth.localeCompare(b.targetMonth)
  );

  // Check if a period is already used
  const isUsedPeriod = (period: string, currentId?: string) => {
    return futureMilestones.some((m) => (currentId === undefined || m.id !== currentId) && m.targetMonth === period);
  };

  // Calculate projected income based on growth rate (for visualization)
  const projections = useMemo(() => {
    const baseAmount = parseFloat(currentAmount) || 0;
    if (baseAmount === 0) return [];

    const monthlyGrowthRate = growthRate / 100 / 12;
    const projectedMonths: { month: string; amount: number; isMilestone: boolean }[] = [];

    for (let i = 1; i <= 60; i++) { // 5 years
      const year = currentYear + Math.floor((currentMonth + i - 1) / 12);
      const month = ((currentMonth + i - 1) % 12) + 1;
      const period = `${year}-${String(month).padStart(2, "0")}`;

      // Check if there's a milestone for this month
      const milestone = sortedMilestones.find((m) => m.targetMonth <= period);
      const applicableMilestone = sortedMilestones
        .filter((m) => m.targetMonth <= period)
        .sort((a, b) => b.targetMonth.localeCompare(a.targetMonth))[0];

      let amount: number;
      if (applicableMilestone) {
        // Calculate growth from milestone
        const milestoneDate = new Date(applicableMilestone.targetMonth + "-01");
        const currentDate = new Date(`${year}-${String(month).padStart(2, "0")}-01`);
        const monthsSinceMilestone = (currentDate.getTime() - milestoneDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        amount = applicableMilestone.amount * Math.pow(1 + monthlyGrowthRate, monthsSinceMilestone);
      } else {
        // Calculate growth from base
        amount = baseAmount * Math.pow(1 + monthlyGrowthRate, i);
      }

      projectedMonths.push({
        month: period,
        amount,
        isMilestone: sortedMilestones.some((m) => m.targetMonth === period),
      });
    }

    return projectedMonths;
  }, [currentAmount, growthRate, sortedMilestones, currentMonth, currentYear]);

  // Format month for display
  const formatMonth = (period: string) => {
    const [year, month] = period.split("-");
    const monthName = MONTHS.find((m) => m.value === parseInt(month))?.label || "";
    return `${monthName} ${year}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50">
          <TrendingUp className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Future Income Milestones</h3>
          <p className="text-sm text-gray-500">Plan for expected income changes and growth</p>
        </div>
      </div>

      {/* New Milestone Form */}
      {isAddingNew && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
          <div className="text-sm font-medium text-purple-800 mb-2">New Milestone</div>
          <div className="flex gap-3">
            {/* Target Month */}
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-gray-500">Target Month</Label>
              <Select
                value={newMilestone.targetMonth}
                onValueChange={(value) => setNewMilestone({ ...newMilestone, targetMonth: value })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
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

            {/* New Amount */}
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-gray-500">New Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newMilestone.amount || ""}
                  onChange={(e) => setNewMilestone({ ...newMilestone, amount: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  className="bg-white pl-7"
                />
              </div>
            </div>
          </div>

          {/* Reason Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Reason</Label>
              <Select
                value={newMilestone.reason || ""}
                onValueChange={(value) => setNewMilestone({ ...newMilestone, reason: value })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {MILESTONE_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Notes (Optional)</Label>
              <Input
                placeholder="Additional details..."
                value={newMilestone.notes || ""}
                onChange={(e) => setNewMilestone({ ...newMilestone, notes: e.target.value })}
                className="bg-white text-sm"
              />
            </div>
          </div>

          {/* Save/Cancel Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelAddMilestone}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={saveNewMilestone}
              disabled={!newMilestone.targetMonth}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              Save Milestone
            </Button>
          </div>
        </div>
      )}

      {/* Milestones List */}
      {sortedMilestones.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg bg-gray-50">
          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No milestones planned</p>
          <p className="text-sm">Add milestones to plan for future income changes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedMilestones.map((milestone) => (
            <div
              key={milestone.id}
              className="bg-gray-50 rounded-lg p-4 space-y-3"
            >
              <div className="flex gap-3">
                {/* Target Month */}
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-gray-500">Target Month</Label>
                  <Select
                    value={milestone.targetMonth}
                    onValueChange={(value) => updateMilestone(milestone.id, "targetMonth", value)}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {getAvailableMonths().map((month) => (
                        <SelectItem
                          key={month.value}
                          value={month.value}
                          disabled={isUsedPeriod(month.value, milestone.id)}
                        >
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* New Amount */}
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-gray-500">New Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={milestone.amount || ""}
                      onChange={(e) => updateMilestone(milestone.id, "amount", e.target.value)}
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
                    onClick={() => confirmRemoveMilestone(milestone.id)}
                    className="h-10 w-10 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Reason Selector */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Reason</Label>
                  <Select
                    value={milestone.reason || ""}
                    onValueChange={(value) => updateMilestone(milestone.id, "reason", value)}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      {MILESTONE_REASONS.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Notes (Optional)</Label>
                  <Input
                    placeholder="Additional details..."
                    value={milestone.notes || ""}
                    onChange={(e) => updateMilestone(milestone.id, "notes", e.target.value)}
                    className="bg-white text-sm"
                  />
                </div>
              </div>

              {/* Change Summary */}
              {currentAmount && (
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                  {parseFloat(currentAmount) > 0 && (
                    <>
                      Change from current: {" "}
                      <span className={milestone.amount > parseFloat(currentAmount) ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {milestone.amount > parseFloat(currentAmount) ? "+" : ""}
                        ${(milestone.amount - parseFloat(currentAmount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {" "}
                        ({milestone.amount > parseFloat(currentAmount) ? "+" : ""}
                        {(((milestone.amount - parseFloat(currentAmount)) / parseFloat(currentAmount)) * 100).toFixed(1)}%)
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Milestone Button */}
      <Button
        type="button"
        variant="outline"
        onClick={startAddMilestone}
        disabled={isAddingNew}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Milestone
      </Button>

      {/* Growth Rate Visualization */}
      <div className="bg-purple-50 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-purple-600" />
          <Label className="text-sm font-medium text-purple-900">Expected Annual Growth Rate</Label>
          <span className="text-xs text-purple-600">(Visualization only)</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Slider
              value={[growthRate]}
              onValueChange={(value) => setGrowthRate(value[0])}
              max={20}
              min={0}
              step={0.5}
              className="flex-1"
            />
            <span className="text-lg font-semibold text-purple-700 w-16 text-right">
              {growthRate.toFixed(1)}%
            </span>
          </div>

          <div className="flex justify-between text-xs text-purple-600">
            <span>Conservative</span>
            <span>Moderate</span>
            <span>Aggressive</span>
          </div>
        </div>

        {/* Simple Projection Preview */}
        {parseFloat(currentAmount) > 0 && (
          <div className="pt-3 border-t border-purple-200">
            <div className="text-sm text-purple-800 space-y-1">
              <div className="font-medium mb-2">Projected Income (at {growthRate}% annual growth)</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white rounded p-2 text-center">
                  <div className="text-purple-600">Year 1</div>
                  <div className="font-bold">${(parseFloat(currentAmount) * (1 + growthRate / 100)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                </div>
                <div className="bg-white rounded p-2 text-center">
                  <div className="text-purple-600">Year 3</div>
                  <div className="font-bold">${(parseFloat(currentAmount) * Math.pow(1 + growthRate / 100, 3)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                </div>
                <div className="bg-white rounded p-2 text-center">
                  <div className="text-purple-600">Year 5</div>
                  <div className="font-bold">${(parseFloat(currentAmount) * Math.pow(1 + growthRate / 100, 5)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Milestones Timeline Preview */}
      {sortedMilestones.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-900 mb-3">Income Timeline</div>
          <div className="space-y-2">
            {/* Current */}
            <div className="flex items-center gap-3 text-sm">
              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              <span className="text-gray-600">Now</span>
              <span className="font-medium">${parseFloat(currentAmount || "0").toLocaleString()}</span>
            </div>

            {/* Milestones */}
            {sortedMilestones.map((milestone, index) => (
              <div key={milestone.id} className="flex items-center gap-3 text-sm">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-gray-600">{formatMonth(milestone.targetMonth)}</span>
                <span className="font-medium">${milestone.amount.toLocaleString()}</span>
                {milestone.reason && (
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                    {MILESTONE_REASONS.find(r => r.value === milestone.reason)?.label || milestone.reason}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Milestone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this future income milestone? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removeMilestone} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
