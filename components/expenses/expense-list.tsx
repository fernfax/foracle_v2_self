"use client";

import React, { useState, useMemo } from "react";
import { MoreHorizontal, Plus, ArrowUpDown, Settings2 } from "lucide-react";
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
import { AddExpenseDialog } from "./add-expense-dialog";
import { EditExpenseDialog } from "./edit-expense-dialog";
import { ManageCategoriesDialog } from "./manage-categories-dialog";
import { deleteExpense } from "@/lib/actions/expenses";

interface Expense {
  id: string;
  name: string;
  category: string;
  amount: string;
  frequency: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ExpenseListProps {
  initialExpenses: Expense[];
}

type SortKey = "name" | "category" | "amount" | "frequency";
type SortDirection = "asc" | "desc";

export function ExpenseList({ initialExpenses }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (expense) =>
          expense.name.toLowerCase().includes(searchLower) ||
          expense.category.toLowerCase().includes(searchLower)
      );
    }

    // Sort the data
    filtered = [...filtered].sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];

      // Convert amount to number for proper sorting
      if (sortKey === "amount") {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [expenses, search, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const handleExpenseAdded = () => {
    // Refresh the page to show new expense
    window.location.reload();
  };

  const handleExpenseUpdated = (updatedExpense: Expense) => {
    setExpenses(expenses.map((e) => (e.id === updatedExpense.id ? updatedExpense : e)));
  };

  const handleDeleteClick = (expense: Expense) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!expenseToDelete) return;

    try {
      await deleteExpense(expenseToDelete.id);
      setExpenses(expenses.filter((e) => e.id !== expenseToDelete.id));
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  const handleEditClick = (expense: Expense) => {
    setSelectedExpense(expense);
    setEditDialogOpen(true);
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(amount));
  };

  const totalResults = expenses.length;
  const filteredResults = filteredExpenses.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Expense List</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setManageCategoriesOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Manage Categories
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Search Bar and Results Counter */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search expenses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredResults === 0 ? 0 : 1} to {filteredResults} of {totalResults} results
        </div>
      </div>

      {/* Expenses Table */}
      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
          <p className="text-muted-foreground mb-4">
            No expenses yet. Add your first expense to start tracking your spending.
          </p>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
          <p className="text-muted-foreground">No results found for "{search}"</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("name")}
                    className="h-auto p-0 font-semibold"
                  >
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("category")}
                    className="h-auto p-0 font-semibold"
                  >
                    Category
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("amount")}
                    className="h-auto p-0 font-semibold"
                  >
                    Amount
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("frequency")}
                    className="h-auto p-0 font-semibold"
                  >
                    Frequency
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{expense.name}</TableCell>
                  <TableCell>{expense.category}</TableCell>
                  <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                  <TableCell className="capitalize">{expense.frequency}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(expense)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(expense)}
                          className="text-red-600"
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

      {/* Add Dialog */}
      <AddExpenseDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onExpenseAdded={handleExpenseAdded}
      />

      {/* Edit Dialog */}
      <EditExpenseDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        expense={selectedExpense}
        onExpenseUpdated={handleExpenseUpdated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the expense "{expenseToDelete?.name}". This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Categories Dialog */}
      <ManageCategoriesDialog
        open={manageCategoriesOpen}
        onOpenChange={setManageCategoriesOpen}
        onCategoriesUpdated={() => {
          // Optionally reload categories or refresh page
        }}
      />
    </div>
  );
}
