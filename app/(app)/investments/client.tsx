"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, LineChart, TrendingUp, DollarSign, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  InvestmentCard,
  AddInvestmentModal,
  WealthProjectionChart,
} from "@/components/investments";
import {
  createInvestment,
  updateInvestment,
  deleteInvestment,
  type Investment,
  type InvestmentsSummary,
} from "@/lib/actions/investments";

interface InvestmentsClientProps {
  initialInvestments: Investment[];
  initialSummary: InvestmentsSummary;
}

export function InvestmentsClient({
  initialInvestments,
  initialSummary,
}: InvestmentsClientProps) {
  const router = useRouter();
  const [investments, setInvestments] = useState<Investment[]>(initialInvestments);
  const [summary, setSummary] = useState<InvestmentsSummary>(initialSummary);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [deletingInvestment, setDeletingInvestment] = useState<Investment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Update state when props change
  useEffect(() => {
    setInvestments(initialInvestments);
    setSummary(initialSummary);
  }, [initialInvestments, initialSummary]);

  const handleAddInvestment = async (data: {
    name: string;
    type: string;
    currentCapital: string;
    projectedYield: string;
    contributionAmount: string;
    contributionFrequency: string;
    customMonths?: string;
  }) => {
    await createInvestment(data);
    router.refresh();
  };

  const handleEditInvestment = async (data: {
    name: string;
    type: string;
    currentCapital: string;
    projectedYield: string;
    contributionAmount: string;
    contributionFrequency: string;
    customMonths?: string;
  }) => {
    if (!editingInvestment) return;
    await updateInvestment(editingInvestment.id, data);
    setEditingInvestment(null);
    router.refresh();
  };

  const handleDeleteInvestment = async () => {
    if (!deletingInvestment) return;

    setIsDeleting(true);
    try {
      await deleteInvestment(deletingInvestment.id);
      setInvestments(investments.filter((i) => i.id !== deletingInvestment.id));
      setDeletingInvestment(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete investment:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const activeInvestments = investments.filter((i) => i.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-2">
            Portfolio
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Investments</h1>
          <p className="text-muted-foreground mt-1">
            Track your investment policies and projected growth
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Investment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-teal-100">
                <DollarSign className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Portfolio Value
                </p>
                <p className="text-2xl font-bold">
                  $
                  {summary.totalPortfolioValue.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Across {summary.activeCount} active{" "}
                  {summary.activeCount === 1 ? "policy" : "policies"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <Percent className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Avg. Annual Yield
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {summary.averageYield.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Weighted average
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Monthly Contribution
                </p>
                <p className="text-2xl font-bold">
                  $
                  {summary.totalMonthlyContribution.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Deducted from daily budget
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wealth Projection Chart */}
      <WealthProjectionChart investments={investments} />

      {/* Investments List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Policies & Assets</h2>
          <Button variant="outline" size="sm" onClick={() => setAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Investment
          </Button>
        </div>

        {investments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/20">
            <LineChart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No investments yet</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Start tracking your investment portfolio by adding your first
              investment policy.
            </p>
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Investment
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {investments.map((investment) => (
              <InvestmentCard
                key={investment.id}
                investment={investment}
                onEdit={() => setEditingInvestment(investment)}
                onDelete={() => setDeletingInvestment(investment)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Investment Modal */}
      <AddInvestmentModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSubmit={handleAddInvestment}
      />

      {/* Edit Investment Modal */}
      <AddInvestmentModal
        open={!!editingInvestment}
        onOpenChange={(open) => !open && setEditingInvestment(null)}
        investment={editingInvestment}
        onSubmit={handleEditInvestment}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingInvestment}
        onOpenChange={(open) => !open && setDeletingInvestment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Investment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deletingInvestment?.name}
              &rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInvestment}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
