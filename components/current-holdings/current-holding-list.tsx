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
} from "lucide-react";
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
  const [sortKey, setSortKey] = useState<SortKey>("bankName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [holdingToEdit, setHoldingToEdit] = useState<CurrentHolding | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [holdingToDelete, setHoldingToDelete] = useState<string | null>(null);

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
        <Button size="sm" onClick={() => {
          setHoldingToEdit(null);
          setIsAddDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Holding
        </Button>
      </div>

      {/* Empty State */}
      {holdings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-dashed">
          <p className="text-muted-foreground mb-4">
            No current holdings yet. Add your first holding to get started.
          </p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
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
