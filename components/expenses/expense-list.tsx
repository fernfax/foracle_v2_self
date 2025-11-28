"use client";

import React, { useState, useMemo, useEffect } from "react";
import { MoreHorizontal, Plus, ArrowUpDown, Settings2, TrendingDown, Layers, DollarSign, ChevronDown, ChevronUp, ChevronRight, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddExpenseDialog } from "./add-expense-dialog";
import { EditExpenseDialog } from "./edit-expense-dialog";
import { ManageCategoriesDialog } from "./manage-categories-dialog";
import { deleteExpense } from "@/lib/actions/expenses";
import { getExpenseCategories, type ExpenseCategory } from "@/lib/actions/expense-categories";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip, PieChart, Pie, Legend } from "recharts";
import { getCategoryColor } from "@/lib/expense-calculator";

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [breakdownSortBy, setBreakdownSortBy] = useState<"amount" | "category" | "count">("amount");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      const data = await getExpenseCategories();
      setCategories(data);
    };
    loadCategories();
  }, []);

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    expenses.forEach((expense) => {
      counts[expense.category] = (counts[expense.category] || 0) + 1;
    });
    return counts;
  }, [expenses]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12

    const categoryTotals: Record<string, number> = {};
    let currentMonthExpenses = 0;
    let totalActiveCategories = 0;

    // Calculate expenses that apply to current month
    const currentMonthCategoryTotals: Record<string, number> = {};

    expenses.forEach((expense) => {
      if (!expense.isActive) return;

      const amount = parseFloat(expense.amount);
      const startDate = new Date(expense.startDate);
      const endDate = expense.endDate ? new Date(expense.endDate) : null;

      // Check if expense is active in current month
      if (currentDate < startDate) return;
      if (endDate && currentDate > endDate) return;

      // Check if expense applies to current month based on frequency
      let appliesThisMonth = false;

      if (expense.frequency === 'monthly') {
        appliesThisMonth = true;
      } else if (expense.frequency === 'custom' && expense.customMonths) {
        try {
          const customMonths = JSON.parse(expense.customMonths);
          appliesThisMonth = customMonths.includes(currentMonth);
        } catch {
          appliesThisMonth = false;
        }
      } else if (expense.frequency === 'one-time') {
        // Check if one-time expense is in current month
        const expenseMonth = startDate.getMonth() + 1;
        const expenseYear = startDate.getFullYear();
        const currentYear = currentDate.getFullYear();
        appliesThisMonth = expenseMonth === currentMonth && expenseYear === currentYear;
      }

      if (appliesThisMonth) {
        currentMonthExpenses += amount;
        currentMonthCategoryTotals[expense.category] = (currentMonthCategoryTotals[expense.category] || 0) + amount;
      }

      // Count all active categories
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + amount;
    });

    const sortedCurrentMonthCategories = Object.entries(currentMonthCategoryTotals).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCurrentMonthCategories[0] || null;
    totalActiveCategories = Object.keys(categoryTotals).length;

    return {
      topCategory: topCategory ? {
        name: topCategory[0],
        amount: topCategory[1],
        percentage: (topCategory[1] / currentMonthExpenses) * 100
      } : null,
      currentMonthExpenses,
      activeCategories: totalActiveCategories,
    };
  }, [expenses]);

  // Calculate breakdown details for expanded view
  const breakdownDetails = useMemo(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;

    const monthlyExpenses: Expense[] = [];
    const customExpenses: Expense[] = [];
    const oneTimeExpenses: Expense[] = [];
    const categoryBreakdown: Record<string, { amount: number; count: number; expenses: Expense[] }> = {};

    expenses.forEach((expense) => {
      if (!expense.isActive) return;

      const amount = parseFloat(expense.amount);
      const startDate = new Date(expense.startDate);
      const endDate = expense.endDate ? new Date(expense.endDate) : null;

      if (currentDate < startDate) return;
      if (endDate && currentDate > endDate) return;

      let appliesThisMonth = false;
      let frequencyType: "monthly" | "custom" | "one-time" | null = null;

      if (expense.frequency === 'monthly') {
        appliesThisMonth = true;
        frequencyType = "monthly";
      } else if (expense.frequency === 'custom' && expense.customMonths) {
        try {
          const customMonths = JSON.parse(expense.customMonths);
          if (customMonths.includes(currentMonth)) {
            appliesThisMonth = true;
            frequencyType = "custom";
          }
        } catch {}
      } else if (expense.frequency === 'one-time') {
        const expenseMonth = startDate.getMonth() + 1;
        const expenseYear = startDate.getFullYear();
        const currentYear = currentDate.getFullYear();
        if (expenseMonth === currentMonth && expenseYear === currentYear) {
          appliesThisMonth = true;
          frequencyType = "one-time";
        }
      }

      if (appliesThisMonth && frequencyType) {
        // Add to frequency groups
        if (frequencyType === "monthly") monthlyExpenses.push(expense);
        else if (frequencyType === "custom") customExpenses.push(expense);
        else if (frequencyType === "one-time") oneTimeExpenses.push(expense);

        // Add to category breakdown
        if (!categoryBreakdown[expense.category]) {
          categoryBreakdown[expense.category] = { amount: 0, count: 0, expenses: [] };
        }
        categoryBreakdown[expense.category].amount += amount;
        categoryBreakdown[expense.category].count += 1;
        categoryBreakdown[expense.category].expenses.push(expense);
      }
    });

    // Calculate totals
    const monthlyTotal = monthlyExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const customTotal = customExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const oneTimeTotal = oneTimeExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    // Convert category breakdown to sorted array
    let categoriesArray = Object.entries(categoryBreakdown).map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: (data.amount / (monthlyTotal + customTotal + oneTimeTotal)) * 100,
      avgPerExpense: data.count > 0 ? data.amount / data.count : 0,
      color: getCategoryColor(category),
    }));

    // Sort based on selected sort option
    if (breakdownSortBy === "amount") {
      categoriesArray.sort((a, b) => b.amount - a.amount);
    } else if (breakdownSortBy === "category") {
      categoriesArray.sort((a, b) => a.category.localeCompare(b.category));
    } else if (breakdownSortBy === "count") {
      categoriesArray.sort((a, b) => b.count - a.count);
    }

    return {
      monthly: { expenses: monthlyExpenses, total: monthlyTotal },
      custom: { expenses: customExpenses, total: customTotal },
      oneTime: { expenses: oneTimeExpenses, total: oneTimeTotal },
      categories: categoriesArray,
      topCategories: categoriesArray.slice(0, 5),
    };
  }, [expenses, breakdownSortBy]);

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter((expense) => expense.category === selectedCategory);
    }

    // Apply search filter
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
  }, [expenses, search, selectedCategory, sortKey, sortDirection]);

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
    <div className="space-y-6">
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

      {/* Summary Cards */}
      {expenses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="cursor-pointer hover:shadow-md transition-shadow col-span-full sm:col-span-2 relative" onClick={() => setIsBreakdownModalOpen(true)}>
            <Expand className="h-3.5 w-3.5 text-gray-400 absolute top-3 right-3" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Month Expected Expenses
              </CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-2xl font-semibold">${summaryStats.currentMonthExpenses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Monthly & custom expenses for this month
              </p>

              {/* Split Layout */}
              {breakdownDetails.categories.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Categories</p>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left: Category List */}
                    <div className="max-h-[200px] overflow-y-auto pr-1 space-y-2">
                      {breakdownDetails.categories.map((cat) => (
                        <div key={cat.category} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-xs font-medium truncate">{cat.category}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-semibold">${cat.amount.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground">{cat.percentage.toFixed(1)}%</span>
                            <span className="text-xs text-muted-foreground">({cat.count})</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Right: Pie Chart */}
                    <div className="flex items-center justify-center">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={breakdownDetails.categories.map((cat) => ({
                              name: cat.category,
                              value: cat.amount,
                              color: cat.color,
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                              if (percent < 0.08) return null;
                              const RADIAN = Math.PI / 180;
                              const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                              const x = cx + radius * Math.cos(-midAngle * RADIAN);
                              const y = cy + radius * Math.sin(-midAngle * RADIAN);
                              return (
                                <text
                                  x={x}
                                  y={y}
                                  fill="white"
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  className="text-xs font-semibold"
                                >
                                  {`${(percent * 100).toFixed(0)}%`}
                                </text>
                              );
                            }}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {breakdownDetails.categories.map((cat, index) => (
                              <Cell key={`cell-${index}`} fill={cat.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-background border rounded-lg shadow-lg p-2">
                                    <p className="text-xs font-semibold">{data.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      ${data.value.toLocaleString()}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Top Category (Current Month)
              </CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950">
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              {summaryStats.topCategory ? (
                <>
                  <div className="text-2xl font-semibold">{summaryStats.topCategory.name}</div>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">
                    ${summaryStats.topCategory.amount.toLocaleString()} ({summaryStats.topCategory.percentage.toFixed(1)}%)
                  </p>

                  {/* Top 5 Categories Mini Breakdown */}
                  {breakdownDetails.topCategories.length > 1 && (
                    <div className="pt-3 border-t">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Top 5 Categories</p>
                      <div className="space-y-2">
                        {breakdownDetails.topCategories.map((cat, idx) => (
                          <div key={cat.category} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: cat.color }}
                                />
                                <span className="font-medium truncate">{cat.category}</span>
                              </div>
                              <span className="text-muted-foreground ml-2 flex-shrink-0">
                                ${cat.amount.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${cat.percentage}%`,
                                  backgroundColor: cat.color
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No expenses this month</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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

      {/* Category Filter Buttons */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "flex-shrink-0",
              selectedCategory === null && "bg-black text-white hover:bg-black/90"
            )}
          >
            All
            <Badge variant="secondary" className="ml-2">
              {expenses.length}
            </Badge>
          </Button>
          {categories.map((category) => {
            const count = categoryCounts[category.name] || 0;
            if (count === 0) return null;

            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.name ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.name)}
                className={cn(
                  "flex-shrink-0",
                  selectedCategory === category.name && "bg-black text-white hover:bg-black/90"
                )}
              >
                {category.name}
                <Badge variant="secondary" className="ml-2">
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>
      )}

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

      {/* Expense Breakdown Modal */}
      <Dialog open={isBreakdownModalOpen} onOpenChange={setIsBreakdownModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Expense Breakdown</DialogTitle>
            <DialogDescription>
              Detailed breakdown of your monthly expenses by category
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Summary Stats Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Total Monthly</p>
                <p className="text-2xl font-bold">${(summaryStats.totalMonthlyExpenses || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Expenses</p>
                <p className="text-2xl font-bold">{summaryStats.activeExpensesCount || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{breakdownDetails.categories?.length || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Top Category</p>
                <p className="text-xl font-bold">{summaryStats.topCategory?.name || 'N/A'}</p>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left: Enhanced Category List with Individual Expenses */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {breakdownDetails.categories.map((cat) => {
                  const isExpanded = expandedCategories.has(cat.category);
                  const categoryExpenses = expenses.filter(e =>
                    e.category === cat.category &&
                    e.isActive &&
                    (() => {
                      const currentDate = new Date();
                      const currentMonth = currentDate.getMonth() + 1;
                      const startDate = new Date(e.startDate);
                      const endDate = e.endDate ? new Date(e.endDate) : null;
                      if (currentDate < startDate) return false;
                      if (endDate && currentDate > endDate) return false;
                      if (e.frequency === 'monthly') return true;
                      if (e.frequency === 'custom' && e.customMonths) {
                        try {
                          const customMonths = JSON.parse(e.customMonths);
                          return customMonths.includes(currentMonth);
                        } catch { return false; }
                      }
                      if (e.frequency === 'one-time') {
                        const expenseMonth = startDate.getMonth() + 1;
                        const expenseYear = startDate.getFullYear();
                        const currentYear = currentDate.getFullYear();
                        return expenseMonth === currentMonth && expenseYear === currentYear;
                      }
                      return false;
                    })()
                  );

                  return (
                    <div key={cat.category} className="border rounded-lg overflow-hidden bg-background">
                      {/* Category Header - Clickable */}
                      <div
                        className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newExpanded = new Set(expandedCategories);
                          if (isExpanded) {
                            newExpanded.delete(cat.category);
                          } else {
                            newExpanded.add(cat.category);
                          }
                          setExpandedCategories(newExpanded);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="text-sm font-semibold truncate">{cat.category}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-sm font-bold">${cat.amount.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground">{cat.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 ml-6 text-xs text-muted-foreground">
                          <span>{cat.count} expense{cat.count !== 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      {/* Individual Expenses - Expandable */}
                      {isExpanded && categoryExpenses.length > 0 && (
                        <div className="border-t bg-muted/20">
                          {categoryExpenses.map((expense) => (
                            <div key={expense.id} className="px-3 py-2 border-b last:border-b-0 hover:bg-muted/30">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium truncate">{expense.name}</span>
                                <span className="text-xs font-semibold">${parseFloat(expense.amount).toLocaleString()}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {expense.frequency}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right: Larger Interactive Pie Chart */}
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={breakdownDetails.categories.map((cat) => ({
                        name: cat.category,
                        value: cat.amount,
                        color: cat.color,
                        percentage: cat.percentage,
                        count: cat.count,
                        avgPerExpense: cat.avgPerExpense,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        if (percent < 0.08) return null;
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="text-sm font-bold"
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                      outerRadius={140}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {breakdownDetails.categories.map((cat, index) => (
                        <Cell key={`cell-${index}`} fill={cat.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border rounded-lg shadow-lg p-3">
                              <p className="text-sm font-bold mb-2">{data.name}</p>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Total:</span>
                                  <span className="font-semibold">${data.value.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Percentage:</span>
                                  <span className="font-semibold">{data.percentage.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Count:</span>
                                  <span className="font-semibold">{data.count}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Average:</span>
                                  <span className="font-semibold">${data.avgPerExpense.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
