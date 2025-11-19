"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Settings2,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Link2,
} from "lucide-react";
import { AddIncomeDialog } from "./add-income-dialog";
import { EditIncomeDialog } from "./edit-income-dialog";
import { deleteIncome, toggleIncomeStatus } from "@/lib/actions/income";
import { format } from "date-fns";

type Income = {
  id: string;
  name: string;
  category: string;
  amount: string;
  frequency: string;
  subjectToCpf: boolean | null;
  bonusAmount: string | null;
  employeeCpfContribution: string | null;
  employerCpfContribution: string | null;
  netTakeHome: string | null;
  description: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean | null;
  familyMemberId: string | null;
  familyMember: {
    id: string;
    name: string;
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
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [incomeToEdit, setIncomeToEdit] = useState<Income | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<string | null>(null);

  // Filter and sort incomes
  const filteredAndSortedIncomes = useMemo(() => {
    let filtered = incomes.filter(
      (income) =>
        income.name.toLowerCase().includes(search.toLowerCase()) ||
        income.category.toLowerCase().includes(search.toLowerCase())
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
  }, [incomes, search, sortKey, sortDirection]);

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
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
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
    setIncomes([newIncome, ...incomes]);
  };

  const handleEditClick = (income: Income) => {
    setIncomeToEdit(income);
    setIsEditDialogOpen(true);
  };

  const handleIncomeUpdated = (updatedIncome: Income) => {
    setIncomes(incomes.map((i) => (i.id === updatedIncome.id ? updatedIncome : i)));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Income List</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings2 className="h-4 w-4 mr-2" />
            Manage Categories
          </Button>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Income
          </Button>
        </div>
      </div>

      {/* Search and Info */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search income..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="max-w-sm"
        />
        <p className="text-sm text-muted-foreground">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedIncomes.length)} of{" "}
          {filteredAndSortedIncomes.length} results
        </p>
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
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("startDate")}
                  className="h-auto p-0 font-semibold"
                >
                  Period
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Linked To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedIncomes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No income records found. Add your first income to get started.
                </TableCell>
              </TableRow>
            ) : (
              paginatedIncomes.map((income) => (
                <React.Fragment key={income.id}>
                  <TableRow className={income.familyMember ? "bg-blue-50/50" : ""}>
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
                    <TableCell>{formatPeriod(income.startDate, income.endDate)}</TableCell>
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
                        {income.isActive ? "Active" : "Inactive"}
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
                  {expandedRows.has(income.id) && (
                    <TableRow className={income.familyMember ? "bg-blue-50/50" : ""}>
                      <TableCell colSpan={9} className="bg-muted/50">
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="font-medium">Subject to CPF:</span>{" "}
                              {income.subjectToCpf ? "Yes" : "No"}
                            </div>
                            {income.bonusAmount && (
                              <div>
                                <span className="font-medium">Annual Bonus:</span>{" "}
                                ${parseFloat(income.bonusAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </div>
                            )}
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
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="default" size="sm" className="min-w-[40px]">
            {currentPage}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AddIncomeDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onIncomeAdded={handleIncomeAdded}
      />

      <EditIncomeDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        income={incomeToEdit}
        onIncomeUpdated={handleIncomeUpdated}
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
    </div>
  );
}
