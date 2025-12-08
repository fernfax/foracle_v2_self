"use client";

import React, { useState, useMemo, useEffect } from "react";
import { MoreHorizontal, Plus, ArrowUpDown, Settings2, TrendingDown, Layers, DollarSign, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Expand, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ExpenseBreakdownModal } from "./expense-breakdown-modal";
import { deleteExpense } from "@/lib/actions/expenses";
import { getExpenseCategories, type ExpenseCategory } from "@/lib/actions/expense-categories";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip, PieChart, Pie, Legend } from "recharts";
import { getCategoryColor } from "@/lib/expense-calculator";

interface Expense {
  id: string;
  userId?: string;
  linkedPolicyId?: string | null;
  name: string;
  category: string;
  expenseCategory: string | null;
  amount: string;
  frequency: string;
  customMonths: string | null;
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
  const [selectedFrequency, setSelectedFrequency] = useState<string | null>(null);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [breakdownSortBy, setBreakdownSortBy] = useState<"amount" | "category" | "count">("amount");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Month navigation state (default to current month)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Month navigation handlers
  const goToPreviousMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Format month display
  const formatMonthDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

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

  // Calculate frequency counts
  const frequencyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    expenses.forEach((expense) => {
      const freq = expense.frequency.toLowerCase();
      counts[freq] = (counts[freq] || 0) + 1;
    });
    return counts;
  }, [expenses]);

  // Calculate summary statistics for selected month
  const summaryStats = useMemo(() => {
    const selectedYear = selectedMonth.getFullYear();
    const selectedMonthNum = selectedMonth.getMonth() + 1; // 1-12

    // Create start and end of selected month for date comparisons
    const monthStart = new Date(selectedYear, selectedMonth.getMonth(), 1);
    const monthEnd = new Date(selectedYear, selectedMonth.getMonth() + 1, 0); // Last day of month

    const categoryTotals: Record<string, number> = {};
    let selectedMonthExpenses = 0;
    let totalActiveCategories = 0;

    // Calculate expenses that apply to selected month
    const selectedMonthCategoryTotals: Record<string, number> = {};

    expenses.forEach((expense) => {
      if (!expense.isActive) return;

      const amount = parseFloat(expense.amount);
      const startDate = new Date(expense.startDate);
      const endDate = expense.endDate ? new Date(expense.endDate) : null;

      // Check if expense is valid for selected month
      // Expense must have started by the end of selected month
      if (startDate > monthEnd) return;
      // Expense must not have ended before selected month started
      if (endDate && endDate < monthStart) return;

      // Check if expense applies to selected month based on frequency (case-insensitive)
      let appliesThisMonth = false;
      const frequency = expense.frequency.toLowerCase();

      if (frequency === 'monthly') {
        appliesThisMonth = true;
      } else if (frequency === 'custom' && expense.customMonths) {
        try {
          const customMonths = JSON.parse(expense.customMonths);
          appliesThisMonth = customMonths.includes(selectedMonthNum);
        } catch {
          appliesThisMonth = false;
        }
      } else if (frequency === 'one-time') {
        // Check if one-time expense is in selected month
        const expenseMonth = startDate.getMonth() + 1;
        const expenseYear = startDate.getFullYear();
        appliesThisMonth = expenseMonth === selectedMonthNum && expenseYear === selectedYear;
      }

      if (appliesThisMonth) {
        selectedMonthExpenses += amount;
        selectedMonthCategoryTotals[expense.category] = (selectedMonthCategoryTotals[expense.category] || 0) + amount;
      }

      // Count all active categories
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + amount;
    });

    const sortedSelectedMonthCategories = Object.entries(selectedMonthCategoryTotals).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedSelectedMonthCategories[0] || null;
    totalActiveCategories = Object.keys(categoryTotals).length;

    return {
      topCategory: topCategory ? {
        name: topCategory[0],
        amount: topCategory[1],
        percentage: (topCategory[1] / selectedMonthExpenses) * 100
      } : null,
      currentMonthExpenses: selectedMonthExpenses,
      activeCategories: totalActiveCategories,
    };
  }, [expenses, selectedMonth]);

  // Calculate breakdown details for expanded view (uses selectedMonth)
  const breakdownDetails = useMemo(() => {
    const selectedYear = selectedMonth.getFullYear();
    const selectedMonthNum = selectedMonth.getMonth() + 1;

    // Create start and end of selected month for date comparisons
    const monthStart = new Date(selectedYear, selectedMonth.getMonth(), 1);
    const monthEnd = new Date(selectedYear, selectedMonth.getMonth() + 1, 0); // Last day of month

    const monthlyExpenses: Expense[] = [];
    const customExpenses: Expense[] = [];
    const oneTimeExpenses: Expense[] = [];
    const categoryBreakdown: Record<string, { amount: number; count: number; expenses: Expense[] }> = {};

    expenses.forEach((expense) => {
      if (!expense.isActive) return;

      const amount = parseFloat(expense.amount);
      const startDate = new Date(expense.startDate);
      const endDate = expense.endDate ? new Date(expense.endDate) : null;

      // Check if expense is valid for selected month
      if (startDate > monthEnd) return;
      if (endDate && endDate < monthStart) return;

      let appliesThisMonth = false;
      let frequencyType: "monthly" | "custom" | "one-time" | null = null;
      const frequency = expense.frequency.toLowerCase();

      if (frequency === 'monthly') {
        appliesThisMonth = true;
        frequencyType = "monthly";
      } else if (frequency === 'custom' && expense.customMonths) {
        try {
          const customMonths = JSON.parse(expense.customMonths);
          if (customMonths.includes(selectedMonthNum)) {
            appliesThisMonth = true;
            frequencyType = "custom";
          }
        } catch {}
      } else if (frequency === 'one-time') {
        const expenseMonth = startDate.getMonth() + 1;
        const expenseYear = startDate.getFullYear();
        if (expenseMonth === selectedMonthNum && expenseYear === selectedYear) {
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
  }, [expenses, breakdownSortBy, selectedMonth]);

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter((expense) => expense.category === selectedCategory);
    }

    // Apply frequency filter
    if (selectedFrequency) {
      filtered = filtered.filter((expense) =>
        expense.frequency.toLowerCase() === selectedFrequency.toLowerCase()
      );
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
  }, [expenses, search, selectedCategory, selectedFrequency, sortKey, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(filteredExpenses.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, selectedFrequency, rowsPerPage]);

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
      {/* Expense Details Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Expense Details</h2>
      </div>

      {/* Summary Cards */}
      {expenses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="cursor-pointer hover:shadow-md transition-shadow col-span-full sm:col-span-2 relative" onClick={() => setIsBreakdownModalOpen(true)}>
            <Expand className="h-3.5 w-3.5 text-gray-400 absolute top-3 right-3" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Expected Expenses
              </CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-2xl font-semibold">${summaryStats.currentMonthExpenses.toLocaleString()}</div>
              <div className="flex items-center gap-1 mt-2 mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => { e.stopPropagation(); goToPreviousMonth(); }}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-xs text-muted-foreground min-w-[100px] text-center">
                  {formatMonthDisplay(selectedMonth)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => { e.stopPropagation(); goToNextMonth(); }}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>

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
                              if (!percent || percent < 0.08 || midAngle === undefined || innerRadius === undefined || outerRadius === undefined || cx === undefined || cy === undefined) return null;
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
                                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2">
                                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{data.name}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
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
                Top Category ({formatMonthDisplay(selectedMonth)})
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

      {/* Expense List Header */}
      <h2 className="text-2xl font-semibold pt-4">Expense List</h2>

      {/* Search Bar */}
      <div className="flex items-center">
        <Input
          placeholder="Search expenses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm bg-background"
        />
      </div>

      {/* Filter Dropdowns and Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
        {/* Category Filter */}
        <Select
          value={selectedCategory || "all"}
          onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              All Categories ({expenses.length})
            </SelectItem>
            {categories.map((category) => {
              const count = categoryCounts[category.name] || 0;
              if (count === 0) return null;
              return (
                <SelectItem key={category.id} value={category.name}>
                  {category.name} ({count})
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Frequency Filter */}
        <Select
          value={selectedFrequency || "all"}
          onValueChange={(value) => setSelectedFrequency(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              All Frequencies ({expenses.length})
            </SelectItem>
            {frequencyCounts["monthly"] > 0 && (
              <SelectItem value="monthly">
                Monthly ({frequencyCounts["monthly"]})
              </SelectItem>
            )}
            {frequencyCounts["custom"] > 0 && (
              <SelectItem value="custom">
                Custom ({frequencyCounts["custom"]})
              </SelectItem>
            )}
            {frequencyCounts["one-time"] > 0 && (
              <SelectItem value="one-time">
                One-time ({frequencyCounts["one-time"]})
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        {/* Clear Filters button (only show when filters active) */}
        {(selectedCategory || selectedFrequency) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCategory(null);
              setSelectedFrequency(null);
            }}
          >
            Clear filters
          </Button>
        )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setManageCategoriesOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Manage Categories
          </Button>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
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
              {paginatedExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1.5">
                      {expense.name}
                      {expense.linkedPolicyId && (
                        <span title="Linked to insurance policy">
                          <Shield className="h-3.5 w-3.5 text-blue-600" />
                        </span>
                      )}
                    </div>
                  </TableCell>
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
                          {expense.linkedPolicyId ? "View" : "Edit"}
                        </DropdownMenuItem>
                        {!expense.linkedPolicyId && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(expense)}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Results count and Pagination */}
      {expenses.length > 0 && filteredExpenses.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredExpenses.length)} of {filteredExpenses.length} results
          </p>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page</span>
              <Select
                value={rowsPerPage.toString()}
                onValueChange={(value) => {
                  setRowsPerPage(parseInt(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
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

      {/* Expense Breakdown Modal - Using shared component */}
      <ExpenseBreakdownModal
        open={isBreakdownModalOpen}
        onOpenChange={setIsBreakdownModalOpen}
        expenses={expenses}
        currentMonthTotal={summaryStats.currentMonthExpenses}
        selectedMonth={selectedMonth}
      />
    </div>
  );
}
