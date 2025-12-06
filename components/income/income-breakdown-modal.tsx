"use client";

import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Income {
  id: string;
  name: string;
  category: string;
  amount: string;
  frequency: string;
  customMonths?: string | null;
  subjectToCpf: boolean | null;
  employeeCpfContribution: string | null;
  employerCpfContribution: string | null;
  isActive: boolean | null;
  familyMemberId: string | null;
  familyMember?: {
    id: string;
    name: string;
  } | null;
}

interface IncomeBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incomes: Income[];
}

export function IncomeBreakdownModal({
  open,
  onOpenChange,
  incomes,
}: IncomeBreakdownModalProps) {
  // Calculate breakdown details
  const breakdownDetails = useMemo(() => {
    let grossAnnualIncome = 0;
    let netAnnualIncome = 0;
    const categoryBreakdown: Record<string, { gross: number; net: number; count: number }> = {};
    const familyMemberBreakdown: Record<string, { gross: number; net: number; count: number; name: string }> = {};

    incomes.forEach((income) => {
      if (!income.isActive) return;

      const amount = parseFloat(income.amount);
      let annualAmount = 0;

      // Calculate annual amount based on frequency
      switch (income.frequency) {
        case "monthly":
          annualAmount = amount * 12;
          break;
        case "yearly":
          annualAmount = amount;
          break;
        case "weekly":
          annualAmount = amount * 52;
          break;
        case "bi-weekly":
          annualAmount = amount * 26;
          break;
        case "one-time":
          annualAmount = amount;
          break;
        case "custom":
          if (income.customMonths) {
            try {
              const customMonths = JSON.parse(income.customMonths);
              annualAmount = amount * customMonths.length;
            } catch {
              annualAmount = amount * 12;
            }
          } else {
            annualAmount = amount * 12;
          }
          break;
        default:
          annualAmount = amount * 12;
      }

      grossAnnualIncome += annualAmount;

      // Calculate net (after employee CPF if applicable)
      let netAmount = annualAmount;
      if (income.subjectToCpf && income.employeeCpfContribution) {
        const employeeCpf = parseFloat(income.employeeCpfContribution.toString());
        netAmount = annualAmount - (employeeCpf * 12);
      }
      netAnnualIncome += netAmount;

      // Add to category breakdown
      if (!categoryBreakdown[income.category]) {
        categoryBreakdown[income.category] = { gross: 0, net: 0, count: 0 };
      }
      categoryBreakdown[income.category].gross += annualAmount;
      categoryBreakdown[income.category].net += netAmount;
      categoryBreakdown[income.category].count += 1;

      // Add to family member breakdown
      const familyMemberId = income.familyMemberId || 'user';
      const familyMemberName = income.familyMember?.name || 'You';
      if (!familyMemberBreakdown[familyMemberId]) {
        familyMemberBreakdown[familyMemberId] = { gross: 0, net: 0, count: 0, name: familyMemberName };
      }
      familyMemberBreakdown[familyMemberId].gross += annualAmount;
      familyMemberBreakdown[familyMemberId].net += netAmount;
      familyMemberBreakdown[familyMemberId].count += 1;
    });

    // Convert to sorted arrays
    const categoriesArray = Object.entries(categoryBreakdown)
      .map(([category, data]) => ({
        category,
        gross: data.gross,
        net: data.net,
        count: data.count,
        percentage: grossAnnualIncome > 0 ? (data.gross / grossAnnualIncome) * 100 : 0,
      }))
      .sort((a, b) => b.gross - a.gross);

    const familyMembersArray = Object.entries(familyMemberBreakdown)
      .map(([id, data]) => ({
        id,
        name: data.name,
        gross: data.gross,
        net: data.net,
        count: data.count,
        percentage: grossAnnualIncome > 0 ? (data.gross / grossAnnualIncome) * 100 : 0,
      }))
      .sort((a, b) => b.gross - a.gross);

    return {
      grossAnnualIncome,
      netAnnualIncome,
      activeIncomeCount: incomes.filter(i => i.isActive).length,
      categoriesArray,
      familyMembersArray,
    };
  }, [incomes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Income Breakdown</DialogTitle>
          <DialogDescription>
            Detailed breakdown of your annual income by category and family member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Gross Annual Income</p>
              <p className="text-2xl font-semibold">${breakdownDetails.grossAnnualIncome.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Annual Income (after CPF)</p>
              <p className="text-2xl font-semibold">${breakdownDetails.netAnnualIncome.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Income Sources</p>
              <p className="text-lg font-semibold">{breakdownDetails.activeIncomeCount}</p>
            </div>
          </div>

          {/* Family Member Breakdown */}
          {breakdownDetails.familyMembersArray.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">By Family Member</h3>
              <div className="space-y-3">
                {breakdownDetails.familyMembersArray.map((member) => (
                  <div key={member.id} className="border rounded-lg p-4 bg-background">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{member.name}</h4>
                        <p className="text-xs text-muted-foreground">{member.count} income source{member.count !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">${member.gross.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{member.percentage.toFixed(1)}% of total</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gross Annual:</span>
                      <span className="font-semibold">${member.gross.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Net Annual:</span>
                      <span className="font-semibold">${member.net.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          {breakdownDetails.categoriesArray.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">By Category</h3>
              <div className="space-y-3">
                {breakdownDetails.categoriesArray.map((cat) => (
                  <div key={cat.category} className="border rounded-lg p-4 bg-background">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{cat.category}</h4>
                        <p className="text-xs text-muted-foreground">{cat.count} income source{cat.count !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">${cat.gross.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{cat.percentage.toFixed(1)}% of total</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Gross Annual:</span>
                      <span className="font-semibold">${cat.gross.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Net Annual:</span>
                      <span className="font-semibold">${cat.net.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {breakdownDetails.activeIncomeCount === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No active income sources found.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
