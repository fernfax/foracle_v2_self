"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  getExpenseCategories,
  type ExpenseCategory
} from "@/actions/expense-categories"
import { deleteExpense } from "@/actions/expenses"
import {
  ArrowUpDown,
  Car,
  ChevronLeft,
  ChevronRight,
  Home,
  Plus,
  Receipt,
  Settings2,
  Shield,
  Target
} from "lucide-react"

import { getCategoryColor } from "@/lib/expense-calculator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { RowActions } from "@/components/ui/row-actions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog"
import { EditExpenseDialog } from "@/components/expenses/edit-expense-dialog"
import { ExpenseBreakdownModal } from "@/components/expenses/expense-breakdown-modal"
import { ExpenseStatBand } from "@/components/expenses/expense-stat-band"
import { ManageCategoriesDialog } from "@/components/expenses/manage-categories-dialog"
import { TopCategoryModal } from "@/components/expenses/top-category-modal"

interface Expense {
  id: string
  userId?: string
  linkedPolicyId?: string | null
  linkedPropertyId?: string | null
  linkedVehicleId?: string | null
  linkedGoalId?: string | null
  name: string
  category: string
  expenseCategory: string | null
  amount: string
  frequency: string
  customMonths: string | null
  startDate: string | null
  endDate: string | null
  description: string | null
  isActive: boolean | null
  createdAt: Date
  updatedAt: Date
}

// Helper function to check if expense is linked to any integration
const isLinkedExpense = (expense: Expense) => {
  return !!(
    expense.linkedPolicyId ||
    expense.linkedPropertyId ||
    expense.linkedVehicleId ||
    expense.linkedGoalId
  )
}

// Helper function to get the integration icon and tooltip
const getIntegrationInfo = (expense: Expense) => {
  if (expense.linkedPolicyId) {
    return {
      icon: Shield,
      color: "text-on-brand",
      tooltip: "Linked to insurance policy"
    }
  }
  if (expense.linkedPropertyId) {
    return {
      icon: Home,
      color: "text-on-success",
      tooltip: "Linked to property asset"
    }
  }
  if (expense.linkedVehicleId) {
    return {
      icon: Car,
      color: "text-on-warning",
      tooltip: "Linked to vehicle asset"
    }
  }
  if (expense.linkedGoalId) {
    return {
      icon: Target,
      color: "text-on-brand",
      tooltip: "Linked to savings goal"
    }
  }
  return null
}

interface ExpenseListProps {
  initialExpenses: Expense[]
}

type SortKey = "name" | "category" | "amount" | "frequency"
type SortDirection = "asc" | "desc"

export function ExpenseList({ initialExpenses }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedFrequency, setSelectedFrequency] = useState<string | null>(
    null
  )
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false)
  const [isTopCategoryModalOpen, setIsTopCategoryModalOpen] = useState(false)
  const [breakdownSortBy, _setBreakdownSortBy] = useState<
    "amount" | "category" | "count"
  >("amount")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Current month — the summary + modals are scoped to it. (The old in-card
  // month navigator was dropped when the bespoke summary cards became the
  // shared stat band; the breakdown lives in modals now.)
  const [selectedMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // Format month display
  const formatMonthDisplay = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      const data = await getExpenseCategories()
      setCategories(data)
    }
    loadCategories()
  }, [])

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    expenses.forEach((expense) => {
      counts[expense.category] = (counts[expense.category] || 0) + 1
    })
    return counts
  }, [expenses])

  // Calculate frequency counts
  const frequencyCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    expenses.forEach((expense) => {
      const freq = expense.frequency.toLowerCase()
      counts[freq] = (counts[freq] || 0) + 1
    })
    return counts
  }, [expenses])

  // Calculate summary statistics for selected month
  const summaryStats = useMemo(() => {
    const selectedYear = selectedMonth.getFullYear()
    const selectedMonthNum = selectedMonth.getMonth() + 1 // 1-12

    // Create start and end of selected month for date comparisons
    const monthStart = new Date(selectedYear, selectedMonth.getMonth(), 1)
    const monthEnd = new Date(selectedYear, selectedMonth.getMonth() + 1, 0) // Last day of month

    const categoryTotals: Record<string, number> = {}
    let selectedMonthExpenses = 0
    let totalActiveCategories = 0

    // Calculate expenses that apply to selected month
    const selectedMonthCategoryTotals: Record<string, number> = {}

    expenses.forEach((expense) => {
      if (!expense.isActive) return

      const amount = parseFloat(expense.amount)
      // For recurring expenses (current-recurring), startDate may be null - treat as always valid
      const startDate = expense.startDate ? new Date(expense.startDate) : null
      const endDate = expense.endDate ? new Date(expense.endDate) : null

      // Check if expense is valid for selected month
      // Expense must have started by the end of selected month (skip check if no startDate - always valid)
      if (startDate && startDate > monthEnd) return
      // Expense must not have ended before selected month started
      if (endDate && endDate < monthStart) return

      // Check if expense applies to selected month based on frequency (case-insensitive)
      let appliesThisMonth = false
      const frequency = expense.frequency.toLowerCase()

      if (frequency === "monthly") {
        appliesThisMonth = true
      } else if (frequency === "custom" && expense.customMonths) {
        try {
          const customMonths = JSON.parse(expense.customMonths)
          appliesThisMonth = customMonths.includes(selectedMonthNum)
        } catch {
          appliesThisMonth = false
        }
      } else if (frequency === "one-time" && startDate) {
        // Check if one-time expense is in selected month
        const expenseMonth = startDate.getMonth() + 1
        const expenseYear = startDate.getFullYear()
        appliesThisMonth =
          expenseMonth === selectedMonthNum && expenseYear === selectedYear
      }

      if (appliesThisMonth) {
        selectedMonthExpenses += amount
        selectedMonthCategoryTotals[expense.category] =
          (selectedMonthCategoryTotals[expense.category] || 0) + amount
      }

      // Count all active categories
      categoryTotals[expense.category] =
        (categoryTotals[expense.category] || 0) + amount
    })

    const sortedSelectedMonthCategories = Object.entries(
      selectedMonthCategoryTotals
    ).sort((a, b) => b[1] - a[1])
    const topCategory = sortedSelectedMonthCategories[0] || null
    totalActiveCategories = Object.keys(categoryTotals).length

    return {
      topCategory: topCategory
        ? {
            name: topCategory[0],
            amount: topCategory[1],
            percentage: (topCategory[1] / selectedMonthExpenses) * 100
          }
        : null,
      currentMonthExpenses: selectedMonthExpenses,
      activeCategories: totalActiveCategories
    }
  }, [expenses, selectedMonth])

  // Calculate breakdown details for expanded view (uses selectedMonth)
  const breakdownDetails = useMemo(() => {
    const selectedYear = selectedMonth.getFullYear()
    const selectedMonthNum = selectedMonth.getMonth() + 1

    // Create start and end of selected month for date comparisons
    const monthStart = new Date(selectedYear, selectedMonth.getMonth(), 1)
    const monthEnd = new Date(selectedYear, selectedMonth.getMonth() + 1, 0) // Last day of month

    const monthlyExpenses: Expense[] = []
    const customExpenses: Expense[] = []
    const oneTimeExpenses: Expense[] = []
    const categoryBreakdown: Record<
      string,
      { amount: number; count: number; expenses: Expense[] }
    > = {}

    expenses.forEach((expense) => {
      if (!expense.isActive) return

      const amount = parseFloat(expense.amount)
      // For recurring expenses (current-recurring), startDate may be null - treat as always valid
      const startDate = expense.startDate ? new Date(expense.startDate) : null
      const endDate = expense.endDate ? new Date(expense.endDate) : null

      // Check if expense is valid for selected month (skip check if no startDate - always valid)
      if (startDate && startDate > monthEnd) return
      if (endDate && endDate < monthStart) return

      let appliesThisMonth = false
      let frequencyType: "monthly" | "custom" | "one-time" | null = null
      const frequency = expense.frequency.toLowerCase()

      if (frequency === "monthly") {
        appliesThisMonth = true
        frequencyType = "monthly"
      } else if (frequency === "custom" && expense.customMonths) {
        try {
          const customMonths = JSON.parse(expense.customMonths)
          if (customMonths.includes(selectedMonthNum)) {
            appliesThisMonth = true
            frequencyType = "custom"
          }
        } catch {}
      } else if (frequency === "one-time" && startDate) {
        const expenseMonth = startDate.getMonth() + 1
        const expenseYear = startDate.getFullYear()
        if (expenseMonth === selectedMonthNum && expenseYear === selectedYear) {
          appliesThisMonth = true
          frequencyType = "one-time"
        }
      }

      if (appliesThisMonth && frequencyType) {
        // Add to frequency groups
        if (frequencyType === "monthly") monthlyExpenses.push(expense)
        else if (frequencyType === "custom") customExpenses.push(expense)
        else if (frequencyType === "one-time") oneTimeExpenses.push(expense)

        // Add to category breakdown
        if (!categoryBreakdown[expense.category]) {
          categoryBreakdown[expense.category] = {
            amount: 0,
            count: 0,
            expenses: []
          }
        }
        categoryBreakdown[expense.category].amount += amount
        categoryBreakdown[expense.category].count += 1
        categoryBreakdown[expense.category].expenses.push(expense)
      }
    })

    // Calculate totals
    const monthlyTotal = monthlyExpenses.reduce(
      (sum, e) => sum + parseFloat(e.amount),
      0
    )
    const customTotal = customExpenses.reduce(
      (sum, e) => sum + parseFloat(e.amount),
      0
    )
    const oneTimeTotal = oneTimeExpenses.reduce(
      (sum, e) => sum + parseFloat(e.amount),
      0
    )

    // Convert category breakdown to sorted array
    const categoriesArray = Object.entries(categoryBreakdown).map(
      ([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage:
          (data.amount / (monthlyTotal + customTotal + oneTimeTotal)) * 100,
        avgPerExpense: data.count > 0 ? data.amount / data.count : 0,
        color: getCategoryColor(category)
      })
    )

    // Sort based on selected sort option
    if (breakdownSortBy === "amount") {
      categoriesArray.sort((a, b) => b.amount - a.amount)
    } else if (breakdownSortBy === "category") {
      categoriesArray.sort((a, b) => a.category.localeCompare(b.category))
    } else if (breakdownSortBy === "count") {
      categoriesArray.sort((a, b) => b.count - a.count)
    }

    return {
      monthly: { expenses: monthlyExpenses, total: monthlyTotal },
      custom: { expenses: customExpenses, total: customTotal },
      oneTime: { expenses: oneTimeExpenses, total: oneTimeTotal },
      categories: categoriesArray,
      topCategories: categoriesArray.slice(0, 5)
    }
  }, [expenses, breakdownSortBy, selectedMonth])

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    let filtered = expenses

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(
        (expense) => expense.category === selectedCategory
      )
    }

    // Apply frequency filter
    if (selectedFrequency) {
      filtered = filtered.filter(
        (expense) =>
          expense.frequency.toLowerCase() === selectedFrequency.toLowerCase()
      )
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (expense) =>
          expense.name.toLowerCase().includes(searchLower) ||
          expense.category.toLowerCase().includes(searchLower)
      )
    }

    // Sort the data
    filtered = [...filtered].sort((a, b) => {
      let aVal: string | number = a[sortKey]
      let bVal: string | number = b[sortKey]

      // Convert amount to number for proper sorting
      if (sortKey === "amount") {
        aVal = parseFloat(a.amount)
        bVal = parseFloat(b.amount)
      }

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [
    expenses,
    search,
    selectedCategory,
    selectedFrequency,
    sortKey,
    sortDirection
  ])

  // Pagination logic
  const totalPages = Math.ceil(filteredExpenses.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedCategory, selectedFrequency, rowsPerPage])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const handleExpenseAdded = () => {
    // Refresh the page to show new expense
    window.location.reload()
  }

  const handleExpenseUpdated = (updatedExpense: Expense) => {
    setExpenses(
      expenses.map((e) => (e.id === updatedExpense.id ? updatedExpense : e))
    )
  }

  const handleDeleteClick = (expense: Expense) => {
    setExpenseToDelete(expense)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!expenseToDelete) return

    try {
      await deleteExpense(expenseToDelete.id)
      setExpenses(expenses.filter((e) => e.id !== expenseToDelete.id))
      setDeleteDialogOpen(false)
      setExpenseToDelete(null)
    } catch (error) {
      console.error("Failed to delete expense:", error)
    }
  }

  const handleEditClick = (expense: Expense) => {
    setSelectedExpense(expense)
    setEditDialogOpen(true)
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(amount))
  }

  return (
    <div className="space-y-6">
      {/* Summary stat band — Expected/Top Category open detail modals on click */}
      <ExpenseStatBand
        expenses={expenses}
        onExpectedClick={() => setIsBreakdownModalOpen(true)}
        onTopCategoryClick={() => setIsTopCategoryModalOpen(true)}
      />

      {/* Expense List Header */}
      <h2 className="pt-4 text-2xl font-semibold">Expense List</h2>

      {/* Search Bar */}
      <div className="flex items-center">
        <Input
          placeholder="Search expenses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-background max-w-sm"
        />
      </div>

      {/* Filter Dropdowns and Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap items-center gap-3"
          data-tour="expense-filters">
          {/* Category Filter */}
          <Select
            value={selectedCategory || "all"}
            onValueChange={(value) =>
              setSelectedCategory(value === "all" ? null : value)
            }>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                All Categories ({expenses.length})
              </SelectItem>
              {categories.map((category) => {
                const count = categoryCounts[category.name] || 0
                if (count === 0) return null
                return (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name} ({count})
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          {/* Frequency Filter */}
          <Select
            value={selectedFrequency || "all"}
            onValueChange={(value) =>
              setSelectedFrequency(value === "all" ? null : value)
            }>
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
                setSelectedCategory(null)
                setSelectedFrequency(null)
              }}>
              Clear filters
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setManageCategoriesOpen(true)}
            className="border-border/60 hover:bg-muted hover:border-border h-8 rounded-full bg-transparent px-4 text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-sm dark:hover:bg-white/10"
            data-tour="manage-categories-btn">
            <Settings2 className="mr-1.5 h-4 w-4" />
            Manage Categories
          </Button>
          <Button
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            data-tour="add-expense-btn">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Expenses Table */}
      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses yet"
          description="Add your first expense to start tracking your spending."
          action={{
            label: "Add expense",
            onClick: () => setAddDialogOpen(true)
          }}
        />
      ) : filteredExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border py-12 text-center">
          <p className="text-muted-foreground">
            No results found for &quot;{search}&quot;
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border" data-tour="expense-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("name")}
                    className="h-auto p-0 font-semibold">
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("category")}
                    className="h-auto p-0 font-semibold">
                    Category
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("amount")}
                    className="h-auto p-0 font-semibold">
                    Amount
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("frequency")}
                    className="h-auto p-0 font-semibold">
                    Frequency
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExpenses.map((expense) => {
                const integrationInfo = getIntegrationInfo(expense)
                const isLinked = isLinkedExpense(expense)

                return (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {expense.name}
                        {integrationInfo && (
                          <span title={integrationInfo.tooltip}>
                            <integrationInfo.icon
                              className={`h-3.5 w-3.5 ${integrationInfo.color}`}
                            />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="capitalize">
                      {expense.frequency}
                    </TableCell>
                    <TableCell>
                      <RowActions
                        onEdit={() => handleEditClick(expense)}
                        onDelete={
                          isLinked
                            ? undefined
                            : () => handleDeleteClick(expense)
                        }
                        editLabel={isLinked ? "View expense" : "Edit expense"}
                        deleteLabel="Delete expense"
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Results count and Pagination */}
      {expenses.length > 0 && filteredExpenses.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Showing {startIndex + 1} to{" "}
            {Math.min(endIndex, filteredExpenses.length)} of{" "}
            {filteredExpenses.length} results
          </p>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                Rows per page
              </span>
              <Select
                value={rowsPerPage.toString()}
                onValueChange={(value) => {
                  setRowsPerPage(parseInt(value))
                  setCurrentPage(1)
                }}>
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
                disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-muted-foreground px-2 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}>
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
              This will permanently delete the expense &quot;
              {expenseToDelete?.name}&quot;. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-brand-alert-red hover:bg-brand-alert-red">
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

      {/* Expense Breakdown Modal - opened from the Expected Expenses stat card */}
      <ExpenseBreakdownModal
        open={isBreakdownModalOpen}
        onOpenChange={setIsBreakdownModalOpen}
        expenses={expenses}
        currentMonthTotal={summaryStats.currentMonthExpenses}
        selectedMonth={selectedMonth}
      />

      {/* Top Category Modal - opened from the Top Category stat card */}
      <TopCategoryModal
        open={isTopCategoryModalOpen}
        onOpenChange={setIsTopCategoryModalOpen}
        topCategory={summaryStats.topCategory}
        topCategories={breakdownDetails.topCategories}
        monthLabel={formatMonthDisplay(selectedMonth)}
      />
    </div>
  )
}
