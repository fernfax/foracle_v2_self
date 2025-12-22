"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceDot, LabelList } from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  MoreHorizontal,
  Plus,
  ChevronLeft,
  Link2,
  DollarSign,
  Briefcase,
  Expand,
} from "lucide-react";
import { IncomeModal } from "./income-modal";
import { AddCpfDetailsDialog } from "./add-cpf-details-dialog";
import { IncomeBreakdownModal } from "./income-breakdown-modal";
import { deleteIncome, toggleIncomeStatus, updateIncome } from "@/lib/actions/income";
import { calculateCPF } from "@/lib/cpf-calculator";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

type Income = {
  id: string;
  userId: string;
  name: string;
  category: string;
  incomeCategory: string | null;
  amount: string;
  frequency: string;
  customMonths: string | null;
  subjectToCpf: boolean | null;
  accountForBonus: boolean | null;
  bonusGroups: string | null;
  employeeCpfContribution: string | null;
  employerCpfContribution: string | null;
  netTakeHome: string | null;
  cpfOrdinaryAccount: string | null;
  cpfSpecialAccount: string | null;
  cpfMedisaveAccount: string | null;
  description: string | null;
  startDate: string;
  endDate: string | null;
  pastIncomeHistory: string | null;
  futureMilestones: string | null;
  isActive: boolean | null;
  familyMemberId: string | null;
  familyMember?: {
    id: string;
    name: string;
    relationship: string | null;
    dateOfBirth: string | null;
    isContributing: boolean | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

type SortKey = "name" | "category" | "amount" | "frequency" | "startDate" | "isActive";
type SortDirection = "asc" | "desc";

interface IncomeListProps {
  initialIncomes: Income[];
}

export function IncomeList({ initialIncomes }: IncomeListProps) {
  const [incomes, setIncomes] = useState<Income[]>(initialIncomes);
  const [search, setSearch] = useState("");
  const [selectedFrequency, setSelectedFrequency] = useState<string>("All");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [incomeToEdit, setIncomeToEdit] = useState<Income | null>(null);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<string | null>(null);

  // CPF details flow states
  const [isCpfDetailsDialogOpen, setIsCpfDetailsDialogOpen] = useState(false);
  const [pendingIncomeData, setPendingIncomeData] = useState<any>(null);
  const [pendingIncomeFormData, setPendingIncomeFormData] = useState<any>(null);
  const [pendingCpfData, setPendingCpfData] = useState<{oa?: number; sa?: number; ma?: number} | null>(null);
  const [totalCpfForDialog, setTotalCpfForDialog] = useState(0);
  const [cpfInitialValues, setCpfInitialValues] = useState<{oa?: number; sa?: number; ma?: number}>({});

  // Get unique frequencies with counts
  const frequencyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    incomes.forEach((income) => {
      counts[income.frequency] = (counts[income.frequency] || 0) + 1;
    });
    return counts;
  }, [incomes]);

  // Filter and sort incomes
  const filteredAndSortedIncomes = useMemo(() => {
    let filtered = incomes.filter(
      (income) =>
        (income.name.toLowerCase().includes(search.toLowerCase()) ||
        income.category.toLowerCase().includes(search.toLowerCase())) &&
        (selectedFrequency === "All" || income.frequency === selectedFrequency)
    );

    filtered.sort((a, b) => {
      let aVal: string | number | boolean | null;
      let bVal: string | number | boolean | null;

      switch (sortKey) {
        case "amount":
          aVal = parseFloat(a.amount);
          bVal = parseFloat(b.amount);
          break;
        case "isActive":
          aVal = a.isActive ? 1 : 0;
          bVal = b.isActive ? 1 : 0;
          break;
        default:
          aVal = a[sortKey];
          bVal = b[sortKey];
      }

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [incomes, search, sortKey, sortDirection, selectedFrequency]);

  // Calculate annual income summary stats
  const incomeSummaryStats = useMemo(() => {
    let grossAnnualIncome = 0;
    let netAnnualIncome = 0;
    let totalBonuses = 0;
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
          // For custom, count months in customMonths array
          if (income.customMonths) {
            try {
              const customMonths = JSON.parse(income.customMonths);
              annualAmount = amount * customMonths.length;
            } catch {
              annualAmount = amount * 12; // Default to monthly if parse fails
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
        // Employee CPF is monthly, so annualize it
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

      // Track bonuses separately
      if (income.accountForBonus && income.bonusGroups) {
        try {
          const bonusGroups = JSON.parse(income.bonusGroups);
          bonusGroups.forEach((bonus: { month: number; amount: string }) => {
            const bonusAmount = parseFloat(bonus.amount) * amount;
            totalBonuses += bonusAmount;
          });
        } catch {}
      }
    });

    // Convert category breakdown to sorted array
    const categoriesArray = Object.entries(categoryBreakdown)
      .map(([category, data]) => ({
        category,
        gross: data.gross,
        net: data.net,
        count: data.count,
        percentage: grossAnnualIncome > 0 ? (data.gross / grossAnnualIncome) * 100 : 0,
      }))
      .sort((a, b) => b.gross - a.gross);

    // Convert family member breakdown to sorted array
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
      totalBonuses,
      activeIncomeCount: incomes.filter(i => i.isActive).length,
      categoriesArray,
      familyMembersArray,
    };
  }, [incomes]);

  // Calculate monthly CPF contributions
  const cpfSummaryStats = useMemo(() => {
    let monthlyEmployeeCpf = 0;
    let monthlyEmployerCpf = 0;
    let cpfSubjectIncomeCount = 0;

    incomes.forEach((income) => {
      if (!income.isActive || !income.subjectToCpf) return;

      if (income.employeeCpfContribution) {
        monthlyEmployeeCpf += parseFloat(income.employeeCpfContribution.toString());
      }

      if (income.employerCpfContribution) {
        monthlyEmployerCpf += parseFloat(income.employerCpfContribution.toString());
      }

      cpfSubjectIncomeCount += 1;
    });

    const totalMonthlyCpf = monthlyEmployeeCpf + monthlyEmployerCpf;
    const annualCpf = totalMonthlyCpf * 12;

    return {
      monthlyEmployeeCpf,
      monthlyEmployerCpf,
      totalMonthlyCpf,
      annualCpf,
      cpfSubjectIncomeCount,
    };
  }, [incomes]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedIncomes.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedIncomes = filteredAndSortedIncomes.slice(startIndex, endIndex);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set<string>();
    if (!expandedRows.has(id)) {
      // Only open the clicked row, close all others
      newExpanded.add(id);
    }
    // If clicking the same row that's open, it closes (set remains empty)
    setExpandedRows(newExpanded);
  };

  const handleDeleteClick = (id: string) => {
    setIncomeToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteConfirm = async () => {
    if (!incomeToDelete) return;
    try {
      await deleteIncome(incomeToDelete);
      setIncomes(incomes.filter((i) => i.id !== incomeToDelete));
      setDeleteConfirmOpen(false);
      setIncomeToDelete(null);
      setDeleteError(null);
    } catch (error) {
      console.error("Failed to delete income:", error);
      setDeleteError(error instanceof Error ? error.message : "Failed to delete income");
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const updated = await toggleIncomeStatus(id);
      setIncomes(incomes.map((i) => (i.id === id ? { ...i, isActive: updated.isActive } : i)));
    } catch (error) {
      console.error("Failed to toggle status:", error);
    }
  };

  const formatPeriod = (startDate: string, endDate: string | null) => {
    const start = format(new Date(startDate), "dd MMM yyyy");
    const end = endDate ? format(new Date(endDate), "dd MMM yyyy") : "Present";
    return (
      <div className="text-sm">
        <div>{start}</div>
        <div className="text-muted-foreground">→ {end}</div>
      </div>
    );
  };

  const handleIncomeAdded = (newIncome: Income) => {
    // Check if this is an update (income already exists) or a new add
    const existingIndex = incomes.findIndex(i => i.id === newIncome.id);
    if (existingIndex >= 0) {
      // Update existing income
      setIncomes(incomes.map((i) => (i.id === newIncome.id ? newIncome : i)));
    } else {
      // Add new income
      setIncomes([newIncome, ...incomes]);
    }
  };

  const handleEditClick = (income: Income) => {
    setIncomeToEdit(income);
    setIsEditDialogOpen(true);
  };

  // CPF Details Flow Handlers
  const handleCpfDetailsNeeded = (incomeData: any) => {
    // Store the raw form data for potential back navigation
    setPendingIncomeFormData(incomeData);

    // Calculate CPF contributions based on income amount and family member age
    const cpfResult = calculateCPF(incomeData.amount, incomeData.familyMemberAge || 30);

    // Store income data with calculated CPF values
    const enrichedIncomeData = {
      ...incomeData,
      employeeCpfContribution: cpfResult.employeeCpfContribution.toString(),
      employerCpfContribution: cpfResult.employerCpfContribution.toString(),
      netTakeHome: cpfResult.netTakeHome.toString(),
    };
    setPendingIncomeData(enrichedIncomeData);

    // Set total CPF for the dialog
    setTotalCpfForDialog(cpfResult.totalCpfContribution);

    // Priority 1: Use pending CPF data (from back navigation)
    if (pendingCpfData) {
      setCpfInitialValues(pendingCpfData);
    }
    // Priority 2: Extract existing CPF values if editing
    else if (incomeToEdit && incomeToEdit.cpfOrdinaryAccount) {
      setCpfInitialValues({
        oa: parseFloat(incomeToEdit.cpfOrdinaryAccount),
        sa: parseFloat(incomeToEdit.cpfSpecialAccount || '0'),
        ma: parseFloat(incomeToEdit.cpfMedisaveAccount || '0'),
      });
    }
    // Priority 3: No initial values
    else {
      setCpfInitialValues({});
    }

    // Close income dialog and open CPF dialog
    setIsEditDialogOpen(false);
    setIsCpfDetailsDialogOpen(true);
  };

  const handleCpfComplete = async (cpfDetails: { oa: number; sa: number; ma: number }) => {
    if (!pendingIncomeData || !incomeToEdit) return;

    try {
      // Update existing income with CPF details
      const savedIncome = await updateIncome(incomeToEdit.id, {
        ...pendingIncomeData,
        cpfOrdinaryAccount: cpfDetails.oa,
        cpfSpecialAccount: cpfDetails.sa,
        cpfMedisaveAccount: cpfDetails.ma,
      });

      // Update local state
      setIncomes(incomes.map((i) => (i.id === savedIncome.id ? savedIncome : i)));

      // Close dialogs and reset state
      setIsCpfDetailsDialogOpen(false);
      setIsEditDialogOpen(false);
      setPendingIncomeData(null);
      setPendingIncomeFormData(null);
      setPendingCpfData(null);
      setIncomeToEdit(null);

      // Refresh the page to show updated CPF data
      window.location.reload();
    } catch (error) {
      console.error("Failed to save income with CPF details:", error);
    }
  };

  const handleCpfBack = (cpfData?: { oa: number; sa: number; ma: number }) => {
    // Store CPF data for when user comes back to Step 3
    if (cpfData) {
      setPendingCpfData(cpfData);
    }

    // Return to income dialog from CPF dialog
    setIsCpfDetailsDialogOpen(false);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Income Details Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Income Details</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Card 1: Annual Income Summary */}
        {incomes.length > 0 ? (
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow col-span-full sm:col-span-2 relative"
            onClick={() => setIsBreakdownModalOpen(true)}
          >
            <Expand className="h-3.5 w-3.5 text-gray-400 absolute top-3 right-3" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Annual Income
              </CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950">
                <DollarSign className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-2xl font-semibold">
                ${incomeSummaryStats.grossAnnualIncome.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Net take-home: ${incomeSummaryStats.netAnnualIncome.toLocaleString()} (after CPF)
              </p>

              {incomeSummaryStats.categoriesArray.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Quick Stats</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Income Sources:</span>
                      <span className="font-semibold">{incomeSummaryStats.activeIncomeCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Categories:</span>
                      <span className="font-semibold">{incomeSummaryStats.categoriesArray.length}</span>
                    </div>
                    {incomeSummaryStats.totalBonuses > 0 && (
                      <div className="flex justify-between col-span-2">
                        <span className="text-muted-foreground">Total Bonuses:</span>
                        <span className="font-semibold">${incomeSummaryStats.totalBonuses.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="col-span-full sm:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Annual Income
              </CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950">
                <DollarSign className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-2xl font-semibold text-muted-foreground">$0</div>
              <p className="text-sm text-muted-foreground mt-3">
                No income sources added yet. Add your first income to track your annual earnings and see detailed breakdowns.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Income
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Card 2: CPF Contributions */}
        {incomes.length > 0 ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly CPF Contributions
              </CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950">
                <Briefcase className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-2xl font-semibold">
                ${cpfSummaryStats.totalMonthlyCpf.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Employee: ${cpfSummaryStats.monthlyEmployeeCpf.toLocaleString()} | Employer: ${cpfSummaryStats.monthlyEmployerCpf.toLocaleString()}
              </p>

              {cpfSummaryStats.cpfSubjectIncomeCount > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">CPF Details</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPF-subject incomes:</span>
                      <span className="font-semibold">{cpfSummaryStats.cpfSubjectIncomeCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Annual employee CPF:</span>
                      <span className="font-semibold">${(cpfSummaryStats.monthlyEmployeeCpf * 12).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Annual total CPF:</span>
                      <span className="font-semibold">${cpfSummaryStats.annualCpf.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly CPF Contributions
              </CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950">
                <Briefcase className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-2xl font-semibold text-muted-foreground">$0</div>
              <p className="text-sm text-muted-foreground mt-3">
                CPF contributions will be calculated automatically when you add income sources with CPF enabled.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Income List Header */}
      <h2 className="text-2xl font-semibold pt-4">Income List</h2>

      {/* Search */}
      <div className="flex items-center">
        <Input
          placeholder="Search income..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="max-w-sm"
        />
      </div>

      {/* Frequency Filters and Add Button */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Button
            variant={selectedFrequency === "All" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedFrequency("All");
              setCurrentPage(1);
            }}
            className={cn(
              "flex-shrink-0",
              selectedFrequency === "All" && "bg-black text-white hover:bg-black/90"
            )}
          >
            All
            <Badge variant="secondary" className="ml-2">
              {incomes.length}
            </Badge>
          </Button>
          {Object.entries(frequencyCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([frequency, count]) => (
              <Button
                key={frequency}
                variant={selectedFrequency === frequency ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedFrequency(frequency);
                  setCurrentPage(1);
                }}
                className={cn(
                  "flex-shrink-0",
                  selectedFrequency === frequency && "bg-black text-white hover:bg-black/90"
                )}
              >
                {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                <Badge variant="secondary" className="ml-2">
                  {count}
                </Badge>
              </Button>
            ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddDialogOpen(true)}
          className="h-8 px-4 text-sm font-medium bg-transparent border-border/60 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-border rounded-full transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Income
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("name")}
                  className="h-auto p-0 font-semibold"
                >
                  Income Name
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
              <TableHead>
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
              <TableHead>Family Member</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedIncomes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No income records found. Add your first income to get started.
                </TableCell>
              </TableRow>
            ) : (
              paginatedIncomes.map((income) => (
                <React.Fragment key={income.id}>
                  <TableRow>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(income.id)}
                        className="h-8 w-8 p-0"
                      >
                        {expandedRows.has(income.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{income.name}</TableCell>
                    <TableCell>{income.category}</TableCell>
                    <TableCell>${parseFloat(income.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="capitalize">{income.frequency}</TableCell>
                    <TableCell>
                      {income.familyMember ? (
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                          <Link2 className="h-3 w-3 mr-1" />
                          {income.familyMember.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={income.isActive ? "default" : "secondary"}
                        className={
                          income.isActive
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            : ""
                        }
                      >
                        {income.isActive ? "Current" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(income)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => !income.familyMember && handleDeleteClick(income.id)}
                            className={income.familyMember ? "text-muted-foreground cursor-not-allowed opacity-50" : "text-red-600"}
                            disabled={!!income.familyMember}
                          >
                            {income.familyMember ? "🔒 Linked to Family Member" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  <TableRow className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedRows.has(income.id) ? 'opacity-100' : 'opacity-0 h-0'}`}>
                    <TableCell colSpan={8} className="bg-muted/50 p-0">
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedRows.has(income.id) ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="font-medium">Subject to CPF:</span>{" "}
                              {income.subjectToCpf ? "Yes" : "No"}
                            </div>
                            {income.accountForBonus && income.bonusGroups && (() => {
                              try {
                                const bonusGroups = JSON.parse(income.bonusGroups);
                                const totalBonusMonths = bonusGroups.reduce((sum: number, group: { month: number; amount: string }) => {
                                  return sum + (parseFloat(group.amount) || 0);
                                }, 0);
                                const annualBonusAmount = parseFloat(income.amount) * totalBonusMonths;
                                return (
                                  <div>
                                    <span className="font-medium">Annual Bonus:</span>{" "}
                                    ${annualBonusAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                  </div>
                                );
                              } catch {
                                return null;
                              }
                            })()}
                          </div>
                          {income.subjectToCpf && income.employeeCpfContribution && (
                            <div className="bg-blue-50 p-3 rounded-md space-y-2">
                              <div className="font-semibold text-blue-900">CPF Breakdown (Monthly)</div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-blue-700">Employer Share (17%):</span>{" "}
                                  <div className="font-medium">${parseFloat(income.employerCpfContribution || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                                </div>
                                <div>
                                  <span className="text-blue-700">Employee Share (20%):</span>{" "}
                                  <div className="font-medium">${parseFloat(income.employeeCpfContribution).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                                </div>
                                <div>
                                  <span className="text-green-700">Nett Income:</span>{" "}
                                  <div className="font-semibold text-green-700">${parseFloat(income.netTakeHome || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                                </div>
                              </div>
                            </div>
                          )}
                          {income.description && (
                            <div>
                              <span className="font-medium">Notes:</span> {income.description}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Created:</span>{" "}
                            {format(new Date(income.createdAt), "dd MMM yyyy")}
                          </div>

                          {/* Income Timeline with Projected Growth Curve */}
                          {(() => {
                            const currentAmount = parseFloat(income.amount);
                            let milestones: { targetMonth: string; amount: number; reason?: string }[] = [];

                            // Parse future milestones
                            if (income.futureMilestones) {
                              try {
                                milestones = JSON.parse(income.futureMilestones);
                              } catch {
                                milestones = [];
                              }
                            }

                            // Build timeline data points (past + present + future)
                            const timelinePoints: { date: string; amount: number; label: string; reason?: string; isPast?: boolean; isPresent?: boolean; isExtension?: boolean }[] = [];

                            // Parse past income history
                            if (income.pastIncomeHistory) {
                              try {
                                const pastHistory = JSON.parse(income.pastIncomeHistory);
                                pastHistory.forEach((entry: { period: string; amount: number; granularity: string }) => {
                                  const label = entry.granularity === 'yearly'
                                    ? entry.period
                                    : format(new Date(entry.period + '-01'), 'MMM yyyy');
                                  timelinePoints.push({
                                    date: entry.period,
                                    amount: entry.amount,
                                    label,
                                    isPast: true,
                                  });
                                });
                              } catch {
                                // ignore
                              }
                            }

                            // Add present
                            timelinePoints.push({
                              date: format(new Date(), 'yyyy-MM'),
                              amount: currentAmount,
                              label: 'Now',
                              isPresent: true,
                            });

                            // Add future milestones
                            milestones.forEach((m) => {
                              const [year, month] = m.targetMonth.split('-');
                              timelinePoints.push({
                                date: m.targetMonth,
                                amount: m.amount,
                                label: format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMMM yyyy'),
                                reason: m.reason,
                              });
                            });

                            // Sort by date
                            timelinePoints.sort((a, b) => a.date.localeCompare(b.date));

                            // Only show if we have milestones or past data
                            if (timelinePoints.length <= 1) return null;

                            // Add extension point 6 months after the last data point
                            const lastPoint = timelinePoints[timelinePoints.length - 1];
                            const lastDate = new Date(lastPoint.date + '-01');
                            const extensionDate = new Date(lastDate);
                            extensionDate.setMonth(extensionDate.getMonth() + 6);
                            timelinePoints.push({
                              date: format(extensionDate, 'yyyy-MM'),
                              amount: lastPoint.amount,
                              label: format(extensionDate, 'MMM yyyy'),
                              isExtension: true,
                            });

                            // Find present point for the reference dot
                            const presentPoint = timelinePoints.find(p => p.isPresent);

                            // Prepare chart data with timestamp for proper time scaling
                            const chartData = timelinePoints.map((point, index) => {
                              // Check if this is a duplicate amount (same as previous)
                              const prevPoint = index > 0 ? timelinePoints[index - 1] : null;
                              const isDuplicateAmount = prevPoint && prevPoint.amount === point.amount;

                              return {
                                name: point.label,
                                amount: point.amount,
                                timestamp: new Date(point.date + '-01').getTime(),
                                isPresent: point.isPresent,
                                isPast: point.isPast,
                                isFuture: !point.isPast && !point.isPresent,
                                // Only show label if not extension and not a duplicate amount
                                displayLabel: point.isExtension || isDuplicateAmount ? '' : `$${point.amount.toLocaleString()}/mth`,
                              };
                            });

                            // Get the present point timestamp for ReferenceDot
                            const presentTimestamp = presentPoint ? new Date(presentPoint.date + '-01').getTime() : null;

                            // Create merged data with separate fields for past/present and future
                            const presentIndex = chartData.findIndex(p => p.isPresent);
                            const mergedChartData = chartData.map((p, index) => ({
                              ...p,
                              pastAmount: index <= presentIndex ? p.amount : undefined,
                              futureAmount: index >= presentIndex ? p.amount : undefined,
                              // Separate labels for each area
                              pastLabel: index <= presentIndex ? p.displayLabel : '',
                              futureLabel: index > presentIndex ? p.displayLabel : '',
                            }));

                            return (
                              <div className="mt-6 pt-4 border-t border-gray-200">
                                <div className="font-medium mb-4 text-gray-700">Income Timeline</div>
                                <div className="grid grid-cols-3 gap-8">
                                  {/* Left side - Timeline list (1/3 width) */}
                                  <div className="space-y-3">
                                    {timelinePoints.filter(p => !p.isExtension).map((point, index) => (
                                      <div key={index} className="flex items-center gap-3">
                                        <div
                                          className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                            point.isPresent
                                              ? 'bg-gray-400'
                                              : point.isPast
                                                ? 'bg-gray-300'
                                                : 'bg-violet-500'
                                          }`}
                                        />
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className={`text-sm ${point.isPresent ? 'text-gray-600' : point.isPast ? 'text-gray-500' : 'text-gray-900'}`}>
                                            {point.label}
                                          </span>
                                          <span className={`font-semibold ${point.isPresent ? 'text-gray-700' : point.isPast ? 'text-gray-600' : 'text-gray-900'}`}>
                                            ${point.amount.toLocaleString()}
                                          </span>
                                          {point.isPast && (
                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                              Past Income
                                            </span>
                                          )}
                                          {point.reason && (
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                              {point.reason.charAt(0).toUpperCase() + point.reason.slice(1)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Right side - Income Chart using Recharts (2/3 width) */}
                                  <div className="col-span-2 relative bg-gray-50 rounded-xl overflow-hidden" style={{ height: 140 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <AreaChart data={mergedChartData} margin={{ top: 20, right: 40, left: 50, bottom: 20 }}>
                                        <defs>
                                          <linearGradient id={`gradient-past-${income.id}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6b7280" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#6b7280" stopOpacity={0.05} />
                                          </linearGradient>
                                          <linearGradient id={`gradient-future-${income.id}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                                          </linearGradient>
                                        </defs>
                                        <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} hide />
                                        <YAxis hide domain={['dataMin * 0.6', 'dataMax * 1.1']} />
                                        {/* Past/Present - solid line */}
                                        <Area
                                          type="stepAfter"
                                          dataKey="pastAmount"
                                          stroke="#6b7280"
                                          strokeWidth={2}
                                          fill={`url(#gradient-past-${income.id})`}
                                          connectNulls={false}
                                        >
                                          <LabelList
                                            dataKey="pastLabel"
                                            position="top"
                                            offset={8}
                                            style={{ fontSize: 11, fontWeight: 500, fill: '#4b5563' }}
                                          />
                                        </Area>
                                        {/* Future - dashed violet line */}
                                        <Area
                                          type="stepAfter"
                                          dataKey="futureAmount"
                                          stroke="#8b5cf6"
                                          strokeWidth={2}
                                          strokeDasharray="6 4"
                                          fill={`url(#gradient-future-${income.id})`}
                                          connectNulls={false}
                                        >
                                          <LabelList
                                            dataKey="futureLabel"
                                            position="top"
                                            offset={8}
                                            style={{ fontSize: 11, fontWeight: 500, fill: '#4b5563' }}
                                          />
                                        </Area>
                                        {presentTimestamp && presentPoint && (
                                          <ReferenceDot
                                            x={presentTimestamp}
                                            y={presentPoint.amount}
                                            r={6}
                                            fill="white"
                                            stroke="#8b5cf6"
                                            strokeWidth={2}
                                            shape={(props: any) => (
                                              <circle cx={props.cx} cy={props.cy} r={6} fill="white" stroke="#8b5cf6" strokeWidth={2}>
                                                <animate
                                                  attributeName="r"
                                                  values="5;7;5"
                                                  dur="2s"
                                                  repeatCount="indefinite"
                                                />
                                                <animate
                                                  attributeName="opacity"
                                                  values="1;0.7;1"
                                                  dur="2s"
                                                  repeatCount="indefinite"
                                                />
                                              </circle>
                                            )}
                                          />
                                        )}
                                      </AreaChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>

                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedIncomes.length)} of{" "}
        {filteredAndSortedIncomes.length} results
      </p>

      {/* Pagination */}
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

      <IncomeModal
        open={isAddDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            setIncomeToEdit(null);
            setPendingIncomeFormData(null);
          }
        }}
        onIncomeAdded={handleIncomeAdded}
        income={incomeToEdit}
        pendingFormData={pendingIncomeFormData}
        onCpfDetailsNeeded={handleCpfDetailsNeeded}
        mode={isEditDialogOpen ? "edit" : "add"}
      />

      <AddCpfDetailsDialog
        open={isCpfDetailsDialogOpen}
        onOpenChange={setIsCpfDetailsDialogOpen}
        onBack={handleCpfBack}
        onComplete={handleCpfComplete}
        totalCpfContribution={totalCpfForDialog}
        familyMemberName={incomeToEdit?.familyMember?.name}
        initialOA={cpfInitialValues.oa}
        initialSA={cpfInitialValues.sa}
        initialMA={cpfInitialValues.ma}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={(open) => {
        setDeleteConfirmOpen(open);
        if (!open) setDeleteError(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteError ? "Cannot Delete Income" : "Are you absolutely sure?"}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {deleteError ? (
                <div className="space-y-2">
                  <div className="text-red-600 font-medium">{deleteError}</div>
                  <div className="text-sm">To delete this income, please delete the family member from the Family Members tab.</div>
                </div>
              ) : (
                <div>This action cannot be undone. This will permanently delete your income source and all its associated records.</div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmOpen(false);
              setDeleteError(null);
              setIncomeToDelete(null);
            }}>
              {deleteError ? "Close" : "Cancel"}
            </AlertDialogCancel>
            {!deleteError && (
              <AlertDialogAction onClick={handleDeleteConfirm}>Continue</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <IncomeBreakdownModal
        open={isBreakdownModalOpen}
        onOpenChange={setIsBreakdownModalOpen}
        incomes={incomes}
      />
    </div>
  );
}
