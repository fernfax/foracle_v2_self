"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ArrowUpDown,
  MoreHorizontal,
  Plus,
  Wallet,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddCurrentHoldingDialog } from "./add-current-holding-dialog";
import { deleteCurrentHolding, CurrentHolding } from "@/lib/actions/current-holdings";

type SortKey = "bankName" | "holdingAmount" | "familyMemberName";
type SortDirection = "asc" | "desc";

interface CurrentHoldingListProps {
  initialHoldings: CurrentHolding[];
}

export function CurrentHoldingList({ initialHoldings }: CurrentHoldingListProps) {
  const [holdings, setHoldings] = useState<CurrentHolding[]>(initialHoldings);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("familyMemberName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [holdingToEdit, setHoldingToEdit] = useState<CurrentHolding | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [holdingToDelete, setHoldingToDelete] = useState<string | null>(null);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalHoldings = holdings.reduce((sum, h) => sum + parseFloat(h.holdingAmount || "0"), 0);
    const uniqueBanks = new Set(holdings.map(h => h.bankName)).size;
    const uniqueHolders = new Set(holdings.filter(h => h.familyMemberName).map(h => h.familyMemberName)).size;

    // Bank breakdown
    const bankBreakdown: Record<string, number> = {};
    holdings.forEach(h => {
      bankBreakdown[h.bankName] = (bankBreakdown[h.bankName] || 0) + parseFloat(h.holdingAmount || "0");
    });
    const topBank = Object.entries(bankBreakdown).sort((a, b) => b[1] - a[1])[0];

    return {
      totalHoldings,
      uniqueBanks,
      uniqueHolders,
      accountCount: holdings.length,
      topBank: topBank ? { name: topBank[0], amount: topBank[1] } : null,
    };
  }, [holdings]);

  // Filter and sort holdings
  const filteredData = useMemo(() => {
    let filtered = holdings;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (holding) =>
          holding.bankName.toLowerCase().includes(searchLower) ||
          holding.familyMemberName?.toLowerCase().includes(searchLower)
      );
    }

    // Sort the data
    filtered = [...filtered].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortKey === "holdingAmount") {
        aVal = parseFloat(a[sortKey] || "0");
        bVal = parseFloat(b[sortKey] || "0");
      } else if (sortKey === "familyMemberName") {
        aVal = a.familyMemberName || "";
        bVal = b.familyMemberName || "";
      } else {
        aVal = a[sortKey];
        bVal = b[sortKey];
      }

      if (aVal === null || aVal === undefined || aVal === "") return 1;
      if (bVal === null || bVal === undefined || bVal === "") return -1;

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [holdings, search, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const handleHoldingAdded = (holding: CurrentHolding) => {
    if (holdingToEdit) {
      // Update existing holding
      setHoldings((prev) =>
        prev.map((h) => (h.id === holding.id ? holding : h))
      );
      setHoldingToEdit(null);
    } else {
      // Add new holding
      setHoldings((prev) => [holding, ...prev]);
    }
  };

  const handleEditClick = (holding: CurrentHolding) => {
    setHoldingToEdit(holding);
    setIsAddDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setHoldingToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!holdingToDelete) return;

    try {
      await deleteCurrentHolding(holdingToDelete);
      setHoldings((prev) => prev.filter((h) => h.id !== holdingToDelete));
      setDeleteConfirmOpen(false);
      setHoldingToDelete(null);
    } catch (error) {
      console.error("Failed to delete holding:", error);
      alert("Failed to delete holding. Please try again.");
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(amount || "0"));
  };

  const totalResults = holdings.length;
  const filteredResults = filteredData.length;

  return (
    <div className="space-y-4">
      {/* Holdings Details Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Holdings Details</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Card 1: Total Holdings */}
        {holdings.length > 0 ? (
          <Card className="col-span-full sm:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Holdings
              </CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950">
                <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-2xl font-semibold">{formatCurrency(summaryStats.totalHoldings.toString())}</div>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Across {summaryStats.accountCount} account{summaryStats.accountCount !== 1 ? 's' : ''} at {summaryStats.uniqueBanks} bank{summaryStats.uniqueBanks !== 1 ? 's' : ''}
              </p>

              <div className="pt-3 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Quick Stats</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Accounts:</span>
                    <span className="font-semibold">{summaryStats.accountCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Banks:</span>
                    <span className="font-semibold">{summaryStats.uniqueBanks}</span>
                  </div>
                  {summaryStats.uniqueHolders > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Holders:</span>
                      <span className="font-semibold">{summaryStats.uniqueHolders}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="col-span-full sm:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Holdings
              </CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950">
                <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-2xl font-semibold text-muted-foreground">$0</div>
              <p className="text-sm text-muted-foreground mt-3">
                No holdings added yet. Add your bank accounts and investments to track your total assets.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Holding
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Card 2: Top Bank */}
        {holdings.length > 0 ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Top Bank
              </CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              {summaryStats.topBank ? (
                <>
                  <div className="text-2xl font-semibold">{summaryStats.topBank.name}</div>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    {formatCurrency(summaryStats.topBank.amount.toString())} ({((summaryStats.topBank.amount / summaryStats.totalHoldings) * 100).toFixed(1)}%)
                  </p>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No holdings yet</div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Top Bank
              </CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950">
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-2xl font-semibold text-muted-foreground">—</div>
              <p className="text-sm text-muted-foreground mt-3">
                Your top bank by holdings will appear here once you add accounts.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Current Holdings Header */}
      <h2 className="text-2xl font-semibold pt-4">Current Holdings</h2>

      {/* Search Bar and Add Button */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search holdings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setHoldingToEdit(null);
            setIsAddDialogOpen(true);
          }}
          className="h-8 px-4 text-sm font-medium bg-transparent border-border/60 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-border rounded-full transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Holding
        </Button>
      </div>

      {/* Empty State */}
      {holdings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed">
          <p className="text-muted-foreground mb-4">
            No current holdings yet. Add your first holding to get started.
          </p>
          <Button
            variant="outline"
            onClick={() => setIsAddDialogOpen(true)}
            className="h-8 px-4 text-sm font-medium bg-transparent border-border/60 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-border rounded-full transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Holding
          </Button>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            No results found for "{search}"
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("familyMemberName")}
                    className="h-auto p-0 font-semibold"
                  >
                    Account Holder
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("bankName")}
                    className="h-auto p-0 font-semibold"
                  >
                    Bank Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("holdingAmount")}
                    className="h-auto p-0 font-semibold"
                  >
                    Holding Amount
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((holding) => (
                <TableRow key={holding.id}>
                  <TableCell className="font-medium">
                    {holding.familyMemberName || <span className="text-muted-foreground italic">Not specified</span>}
                  </TableCell>
                  <TableCell>{holding.bankName}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(holding.holdingAmount)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(holding)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(holding.id)}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Results count */}
      {holdings.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredResults === 0 ? 0 : 1} to {filteredResults} of {totalResults} results
        </p>
      )}

      {/* Add/Edit Dialog */}
      <AddCurrentHoldingDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setHoldingToEdit(null);
        }}
        onHoldingAdded={handleHoldingAdded}
        holding={holdingToEdit}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the holding record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
