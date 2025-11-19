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
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Lock,
} from "lucide-react";
import { AddFamilyMemberDialog } from "./add-family-member-dialog";
import { EditFamilyMemberDialog } from "./edit-family-member-dialog";
import { AddIncomeDialog } from "@/components/income/add-income-dialog";
import { AddCpfDetailsDialog } from "@/components/income/add-cpf-details-dialog";
import { deleteFamilyMember, getFamilyMemberIncomes, updateFamilyMember } from "@/lib/actions/family-members";
import { createIncome, updateIncome } from "@/lib/actions/income";
import { calculateCPF } from "@/lib/cpf-calculator";
import { format, differenceInYears } from "date-fns";

type FamilyMember = {
  id: string;
  name: string;
  relationship: string | null;
  dateOfBirth: string | null;
  isContributing: boolean | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

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
  cpfOrdinaryAccount: string | null;
  cpfSpecialAccount: string | null;
  cpfMedisaveAccount: string | null;
  description: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean | null;
  familyMemberId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SortKey = "name" | "relationship" | "age" | "dateOfBirth";
type SortDirection = "asc" | "desc";

interface FamilyMemberListProps {
  initialMembers: FamilyMember[];
  incomes?: Income[];
}

export function FamilyMemberList({ initialMembers, incomes = [] }: FamilyMemberListProps) {
  const [members, setMembers] = useState<FamilyMember[]>(initialMembers);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<FamilyMember | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [memberToDeleteName, setMemberToDeleteName] = useState<string>("");
  const [linkedIncomesForDelete, setLinkedIncomesForDelete] = useState<Array<{id: string; name: string; amount: string; category: string}>>([]);
  const [isAddIncomeDialogOpen, setIsAddIncomeDialogOpen] = useState(false);
  const [contributingMemberForIncome, setContributingMemberForIncome] = useState<FamilyMember | null>(null);
  const [incomeToEdit, setIncomeToEdit] = useState<Income | null>(null);
  const [pendingFamilyMemberData, setPendingFamilyMemberData] = useState<{id?: string; name: string; relationship: string; dateOfBirth: string; isContributing: boolean; notes: string} | null>(null);
  const [isCpfDetailsDialogOpen, setIsCpfDetailsDialogOpen] = useState(false);
  const [pendingIncomeData, setPendingIncomeData] = useState<any>(null);
  const [pendingIncomeFormData, setPendingIncomeFormData] = useState<any>(null);
  const [pendingCpfData, setPendingCpfData] = useState<{oa?: number; sa?: number; ma?: number} | null>(null);
  const [totalCpfForDialog, setTotalCpfForDialog] = useState(0);
  const [cpfInitialValues, setCpfInitialValues] = useState<{oa?: number; sa?: number; ma?: number}>({});

  const calculateAge = (dateOfBirth: string | null): number | null => {
    if (!dateOfBirth) return null;
    return differenceInYears(new Date(), new Date(dateOfBirth));
  };

  const getMemberGrossSalary = (memberId: string): number => {
    const memberIncomes = incomes.filter((income) => income.familyMemberId === memberId);
    return memberIncomes.reduce((total, income) => total + parseFloat(income.amount), 0);
  };

  // Filter and sort members
  const filteredAndSortedMembers = useMemo(() => {
    let filtered = members.filter(
      (member) =>
        member.name.toLowerCase().includes(search.toLowerCase()) ||
        (member.relationship && member.relationship.toLowerCase().includes(search.toLowerCase()))
    );

    filtered.sort((a, b) => {
      let aVal: string | number | null;
      let bVal: string | number | null;

      switch (sortKey) {
        case "age":
          aVal = calculateAge(a.dateOfBirth);
          bVal = calculateAge(b.dateOfBirth);
          break;
        case "dateOfBirth":
          aVal = a.dateOfBirth;
          bVal = b.dateOfBirth;
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
  }, [members, search, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedMembers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedMembers = filteredAndSortedMembers.slice(startIndex, endIndex);

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

  const handleDeleteClick = async (member: FamilyMember) => {
    setMemberToDelete(member.id);
    setMemberToDeleteName(member.name);

    // Fetch linked incomes
    try {
      const linkedIncomes = await getFamilyMemberIncomes(member.id);
      setLinkedIncomesForDelete(linkedIncomes);
    } catch (error) {
      console.error("Failed to fetch linked incomes:", error);
      setLinkedIncomesForDelete([]);
    }

    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!memberToDelete) return;
    try {
      await deleteFamilyMember(memberToDelete);
      setMembers(members.filter((m) => m.id !== memberToDelete));
    } catch (error) {
      console.error("Failed to delete family member:", error);
    } finally {
      setDeleteConfirmOpen(false);
      setMemberToDelete(null);
    }
  };

  const handleMemberAdded = (newMember: FamilyMember) => {
    setMembers([newMember, ...members]);
  };

  const handleContributingMemberAdded = (newMember: FamilyMember) => {
    setMembers([newMember, ...members]);
    // Open income dialog for contributing member
    setContributingMemberForIncome(newMember);
    setIsAddIncomeDialogOpen(true);
  };

  const handleIncomeAdded = () => {
    setContributingMemberForIncome(null);
  };

  // CPF Wizard Handlers
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
    setIsAddIncomeDialogOpen(false);
    setIsCpfDetailsDialogOpen(true);
  };

  const handleCpfComplete = async (cpfDetails: { oa: number; sa: number; ma: number }) => {
    if (!pendingIncomeData) return;

    try {
      // Step 1: Save family member data first (if pending)
      if (pendingFamilyMemberData && pendingFamilyMemberData.id) {
        const updatedMember = await updateFamilyMember(pendingFamilyMemberData.id, {
          name: pendingFamilyMemberData.name,
          relationship: pendingFamilyMemberData.relationship,
          dateOfBirth: pendingFamilyMemberData.dateOfBirth || null,
          isContributing: pendingFamilyMemberData.isContributing,
          notes: pendingFamilyMemberData.notes || null,
        });

        // Update local state
        setMembers(members.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
      }

      // Step 2: Save or update income with CPF details
      if (incomeToEdit && incomeToEdit.id) {
        // Update existing income
        await updateIncome(incomeToEdit.id, {
          ...pendingIncomeData,
          cpfOrdinaryAccount: cpfDetails.oa,
          cpfSpecialAccount: cpfDetails.sa,
          cpfMedisaveAccount: cpfDetails.ma,
        });
      } else {
        // Create new income
        await createIncome({
          ...pendingIncomeData,
          cpfOrdinaryAccount: cpfDetails.oa,
          cpfSpecialAccount: cpfDetails.sa,
          cpfMedisaveAccount: cpfDetails.ma,
        });
      }

      // Close CPF dialog and clear all pending state
      setIsCpfDetailsDialogOpen(false);
      setPendingIncomeData(null);
      setPendingIncomeFormData(null);
      setPendingCpfData(null);
      setPendingFamilyMemberData(null);
      setContributingMemberForIncome(null);
      setIncomeToEdit(null);
    } catch (error) {
      console.error("Failed to save data:", error);
    }
  };

  const handleIncomeBack = () => {
    // Close income dialog and reopen edit dialog with the family member
    setIsAddIncomeDialogOpen(false);

    // If we have pending family member data, use that; otherwise use contributingMemberForIncome
    if (pendingFamilyMemberData && contributingMemberForIncome) {
      // Merge pending data with the contributing member
      const mergedMember = {
        ...contributingMemberForIncome,
        name: pendingFamilyMemberData.name,
        relationship: pendingFamilyMemberData.relationship,
        dateOfBirth: pendingFamilyMemberData.dateOfBirth,
        isContributing: pendingFamilyMemberData.isContributing,
        notes: pendingFamilyMemberData.notes,
      };
      setMemberToEdit(mergedMember);
      setIsEditDialogOpen(true);
    } else if (contributingMemberForIncome) {
      setMemberToEdit(contributingMemberForIncome);
      setIsEditDialogOpen(true);
    }
  };

  const handleCpfBack = (cpfData?: { oa: number; sa: number; ma: number }) => {
    // Store CPF data for when user comes back to Step 3
    if (cpfData) {
      setPendingCpfData(cpfData);
    }

    // Return to income dialog from CPF dialog
    setIsCpfDetailsDialogOpen(false);
    setIsAddIncomeDialogOpen(true);
  };

  const handleEditClick = (member: FamilyMember) => {
    setMemberToEdit(member);
    setIsEditDialogOpen(true);
  };

  const handleMemberUpdated = (updatedMember: FamilyMember) => {
    setMembers(members.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
  };

  const handleContributingMemberUpdated = async (updatedMember: FamilyMember) => {
    // Store the pending family member data (not saved to DB yet)
    setPendingFamilyMemberData({
      id: updatedMember.id,
      name: updatedMember.name,
      relationship: updatedMember.relationship || "",
      dateOfBirth: updatedMember.dateOfBirth || "",
      isContributing: updatedMember.isContributing || false,
      notes: updatedMember.notes || "",
    });

    // Fetch existing income for this family member
    try {
      const linkedIncomes = await getFamilyMemberIncomes(updatedMember.id);
      if (linkedIncomes.length > 0) {
        // Convert the linked income to full Income type
        const existingIncome = incomes.find(inc => inc.id === linkedIncomes[0].id);
        if (existingIncome) {
          setIncomeToEdit(existingIncome);
        }
      } else {
        setIncomeToEdit(null);
      }
    } catch (error) {
      console.error("Failed to fetch existing income:", error);
      setIncomeToEdit(null);
    }

    // Close edit dialog and open income dialog for contributing member
    setIsEditDialogOpen(false);
    setContributingMemberForIncome(updatedMember);
    setIsAddIncomeDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Family Members</h2>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Search and Info */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search family members..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
          className="max-w-sm"
        />
        <p className="text-sm text-muted-foreground">
          Showing {filteredAndSortedMembers.length > 0 ? startIndex + 1 : 0} to{" "}
          {Math.min(endIndex, filteredAndSortedMembers.length)} of {filteredAndSortedMembers.length} results
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
                  Full Name
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("relationship")}
                  className="h-auto p-0 font-semibold"
                >
                  Relationship
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("age")}
                  className="h-auto p-0 font-semibold"
                >
                  Age
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("dateOfBirth")}
                  className="h-auto p-0 font-semibold"
                >
                  Date of Birth
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMembers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No family members found. Add your first family member to get started.
                </TableCell>
              </TableRow>
            ) : (
              paginatedMembers.map((member) => (
                <React.Fragment key={member.id}>
                  <TableRow className={member.relationship === "Self" ? "bg-blue-50/50" : ""}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(member.id)}
                        className="h-8 w-8 p-0 hover:!bg-gray-200"
                      >
                        {expandedRows.has(member.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>
                      {member.relationship === "Self" ? (
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                          <Lock className="h-3 w-3 mr-1" />
                          {member.relationship}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{member.relationship || "Not specified"}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {calculateAge(member.dateOfBirth) !== null
                        ? `${calculateAge(member.dateOfBirth)} years`
                        : "Not specified"}
                    </TableCell>
                    <TableCell>
                      {member.dateOfBirth
                        ? format(new Date(member.dateOfBirth), "dd MMM yyyy")
                        : "Not specified"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:!bg-gray-200">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(member)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => member.relationship !== "Self" && handleDeleteClick(member)}
                            className={member.relationship === "Self" ? "text-muted-foreground cursor-not-allowed opacity-50" : "text-red-600"}
                            disabled={member.relationship === "Self"}
                          >
                            {member.relationship === "Self" ? "🔒 Cannot Delete Primary User" : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(member.id) && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/50">
                        <div className="p-4 space-y-2">
                          {getMemberGrossSalary(member.id) > 0 && (
                            <div>
                              <span className="font-medium">Gross Salary:</span>{" "}
                              <span className="text-green-600 font-semibold">
                                ${getMemberGrossSalary(member.id).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                              <span className="text-muted-foreground text-sm ml-1">/month</span>
                            </div>
                          )}
                          {member.notes ? (
                            <div>
                              <span className="font-medium">Notes:</span> {member.notes}
                            </div>
                          ) : (
                            <div className="text-muted-foreground">No additional notes</div>
                          )}
                          <div>
                            <span className="font-medium">Added:</span>{" "}
                            {format(new Date(member.createdAt), "dd MMM yyyy")}
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

      <AddFamilyMemberDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onMemberAdded={handleMemberAdded}
        onContributingMemberAdded={handleContributingMemberAdded}
      />

      <EditFamilyMemberDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        member={memberToEdit}
        onMemberUpdated={handleMemberUpdated}
        onContributingMemberUpdated={handleContributingMemberUpdated}
      />

      {contributingMemberForIncome && (
        <AddIncomeDialog
          open={isAddIncomeDialogOpen}
          onOpenChange={setIsAddIncomeDialogOpen}
          onIncomeAdded={handleIncomeAdded}
          familyMember={contributingMemberForIncome}
          income={incomeToEdit || undefined}
          pendingFormData={pendingIncomeFormData}
          onBack={handleIncomeBack}
          onCpfDetailsNeeded={handleCpfDetailsNeeded}
        />
      )}

      <AddCpfDetailsDialog
        open={isCpfDetailsDialogOpen}
        onOpenChange={setIsCpfDetailsDialogOpen}
        onBack={handleCpfBack}
        onComplete={handleCpfComplete}
        totalCpfContribution={totalCpfForDialog}
        familyMemberName={contributingMemberForIncome?.name}
        initialOA={cpfInitialValues.oa}
        initialSA={cpfInitialValues.sa}
        initialMA={cpfInitialValues.ma}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {memberToDeleteName}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div>This action cannot be undone. This will permanently delete this family member.</div>

                {linkedIncomesForDelete.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-red-900">
                      ⚠️ This family member has {linkedIncomesForDelete.length} linked income{linkedIncomesForDelete.length > 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-red-800">
                      The following income records will also be permanently deleted:
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-800 space-y-1 max-h-48 overflow-y-auto">
                      {linkedIncomesForDelete.map((income) => (
                        <li key={income.id}>
                          <span className="font-medium">{income.name}</span> ({income.category}) - ${parseFloat(income.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              {linkedIncomesForDelete.length > 0
                ? `Delete Member & ${linkedIncomesForDelete.length} Income${linkedIncomesForDelete.length > 1 ? 's' : ''}`
                : "Delete Member"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
