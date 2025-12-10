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
  Lock,
  User,
  Users,
  Baby,
  Heart,
  UserCircle,
} from "lucide-react";
import { AddFamilyMemberDialog } from "./add-family-member-dialog";
import { EditFamilyMemberDialog } from "./edit-family-member-dialog";
import { AddIncomeDialog } from "@/components/income/add-income-dialog";
import { EditIncomeDialog } from "@/components/income/edit-income-dialog";
import { AddCpfDetailsDialog } from "@/components/income/add-cpf-details-dialog";
import { deleteFamilyMember, getFamilyMemberIncomes, updateFamilyMember } from "@/lib/actions/family-members";
import { createIncome, updateIncome } from "@/lib/actions/income";
import { calculateCPF } from "@/lib/cpf-calculator";
import { format, differenceInYears } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, DollarSign, Expand } from "lucide-react";
import { CpfByFamilyMember } from "@/lib/actions/cpf";
import { CurrentHolding } from "@/lib/actions/current-holdings";

type Policy = {
  id: string;
  userId: string;
  familyMemberId: string | null;
  linkedExpenseId: string | null;
  provider: string;
  policyNumber: string | null;
  policyType: string;
  status: string | null;
  startDate: string;
  maturityDate: string | null;
  coverageUntilAge: number | null;
  premiumAmount: string;
  premiumFrequency: string;
  totalPremiumDuration: number | null;
  coverageOptions: string | null;
  description: string | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

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
  futureIncomeChange: boolean | null;
  futureIncomeAmount: string | null;
  futureIncomeStartDate: string | null;
  futureIncomeEndDate: string | null;
  isActive: boolean | null;
  familyMemberId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type SortKey = "name" | "relationship" | "age" | "dateOfBirth";
type SortDirection = "asc" | "desc";

interface FamilyMemberListProps {
  initialMembers: FamilyMember[];
  incomes?: Income[];
  cpfData?: CpfByFamilyMember[];
  holdings?: CurrentHolding[];
  policies?: Policy[];
}

export function FamilyMemberList({ initialMembers, incomes = [], cpfData = [], holdings = [], policies = [] }: FamilyMemberListProps) {
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

  // Get avatar icon and color based on relationship
  const getAvatarConfig = (relationship: string | null) => {
    const rel = relationship?.toLowerCase() || '';

    switch (rel) {
      case 'self':
        return {
          icon: User,
          bgColor: 'bg-blue-100',
          iconColor: 'text-blue-600'
        };
      case 'spouse':
        return {
          icon: Heart,
          bgColor: 'bg-pink-100',
          iconColor: 'text-pink-600'
        };
      case 'child':
        return {
          icon: Baby,
          bgColor: 'bg-green-100',
          iconColor: 'text-green-600'
        };
      case 'parent':
        return {
          icon: Users,
          bgColor: 'bg-purple-100',
          iconColor: 'text-purple-600'
        };
      case 'sibling':
        return {
          icon: Users,
          bgColor: 'bg-orange-100',
          iconColor: 'text-orange-600'
        };
      default:
        return {
          icon: UserCircle,
          bgColor: 'bg-gray-100',
          iconColor: 'text-gray-600'
        };
    }
  };

  const getMemberGrossSalary = (memberId: string): number => {
    const memberIncomes = incomes.filter((income) => income.familyMemberId === memberId);
    return memberIncomes.reduce((total, income) => total + parseFloat(income.amount), 0);
  };

  // Calculate family financial overview
  const familyOverviewStats = useMemo(() => {
    // Total family members
    const totalMembers = members.length;

    // Contributing members (those with income)
    const contributingMembers = members.filter(m =>
      incomes.some(inc => inc.familyMemberId === m.id && inc.isActive)
    ).length;

    // Total household income (monthly)
    const totalHouseholdIncome = incomes
      .filter(inc => inc.isActive)
      .reduce((total, inc) => total + parseFloat(inc.amount), 0);

    // Total CPF assets (sum of all OA, SA, MA)
    const totalCpfAssets = cpfData.reduce((total, cpf) => {
      return total + cpf.monthlyOaContribution + cpf.monthlySaContribution + cpf.monthlyMaContribution;
    }, 0);

    // Total current holdings
    const totalHoldings = holdings.reduce((total, holding) => {
      return total + parseFloat(holding.holdingAmount);
    }, 0);

    // Total insurance policies count
    const totalPolicies = policies.filter(p => p.isActive).length;

    // Total monthly premiums
    const totalMonthlyPremiums = policies
      .filter(p => p.isActive && p.premiumFrequency === 'monthly')
      .reduce((total, p) => total + parseFloat(p.premiumAmount), 0);

    // Average age
    const membersWithAge = members.filter(m => m.dateOfBirth);
    const averageAge = membersWithAge.length > 0
      ? membersWithAge.reduce((sum, m) => sum + (calculateAge(m.dateOfBirth) || 0), 0) / membersWithAge.length
      : 0;

    // Per-member breakdown
    const memberBreakdown = members.map(member => {
      const memberIncome = incomes
        .filter(inc => inc.familyMemberId === member.id && inc.isActive)
        .reduce((sum, inc) => sum + parseFloat(inc.amount), 0);

      const memberCpf = cpfData.find(cpf => cpf.familyMemberId === member.id);
      const memberCpfTotal = memberCpf
        ? memberCpf.monthlyOaContribution + memberCpf.monthlySaContribution + memberCpf.monthlyMaContribution
        : 0;

      const memberHoldings = holdings
        .filter(h => h.familyMemberId === member.id)
        .reduce((sum, h) => sum + parseFloat(h.holdingAmount), 0);

      const memberPoliciesCount = policies.filter(p => p.familyMemberId === member.id && p.isActive).length;

      return {
        ...member,
        income: memberIncome,
        cpfTotal: memberCpfTotal,
        holdings: memberHoldings,
        policiesCount: memberPoliciesCount,
      };
    }).sort((a, b) => b.income - a.income); // Sort by income descending

    // Top contributor
    const topContributor = memberBreakdown[0] || null;

    return {
      totalMembers,
      contributingMembers,
      totalHouseholdIncome,
      totalCpfAssets,
      totalHoldings,
      totalPolicies,
      totalMonthlyPremiums,
      averageAge,
      memberBreakdown,
      topContributor,
    };
  }, [members, incomes, cpfData, holdings, policies]);

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
    const newExpanded = new Set<string>();
    if (!expandedRows.has(id)) {
      // Only open the clicked row, close all others
      newExpanded.add(id);
    }
    // If clicking the same row that's open, it closes (set remains empty)
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
      let savedIncome;
      if (incomeToEdit && incomeToEdit.id) {
        // Update existing income
        savedIncome = await updateIncome(incomeToEdit.id, {
          ...pendingIncomeData,
          cpfOrdinaryAccount: cpfDetails.oa,
          cpfSpecialAccount: cpfDetails.sa,
          cpfMedisaveAccount: cpfDetails.ma,
        });
        console.log('Updated income with CPF details:', savedIncome);
      } else {
        // Create new income
        savedIncome = await createIncome({
          ...pendingIncomeData,
          cpfOrdinaryAccount: cpfDetails.oa,
          cpfSpecialAccount: cpfDetails.sa,
          cpfMedisaveAccount: cpfDetails.ma,
        });
        console.log('Created income with CPF details:', savedIncome);
      }

      // Close dialogs and refresh page to show updated data
      setIsCpfDetailsDialogOpen(false);
      setIsEditDialogOpen(false);
      setPendingIncomeData(null);
      setPendingIncomeFormData(null);
      setPendingCpfData(null);
      setPendingFamilyMemberData(null);
      setContributingMemberForIncome(null);
      setIncomeToEdit(null);

      // Refresh the page to show updated CPF data
      window.location.reload();
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
      {/* Family Details Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Family Details</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Primary Card: Family Financial Overview */}
        {members.length > 0 ? (
          <Card className="col-span-full sm:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Family Financial Overview
              </CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950">
                <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-2xl font-semibold">{familyOverviewStats.totalMembers} Members</div>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {familyOverviewStats.contributingMembers} contributing · ${familyOverviewStats.totalHouseholdIncome.toLocaleString()}/mo household income
              </p>

              <div className="pt-3 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-3">Member Breakdown</p>
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {familyOverviewStats.memberBreakdown.map((member) => (
                    <div key={member.id} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted/50">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full ${getAvatarConfig(member.relationship).bgColor}`}>
                          {(() => {
                            const AvatarIcon = getAvatarConfig(member.relationship).icon;
                            return <AvatarIcon className={`w-3 h-3 ${getAvatarConfig(member.relationship).iconColor}`} />;
                          })()}
                        </div>
                        <span className="text-sm font-medium truncate">{member.name}</span>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 text-xs">
                        {member.income > 0 && (
                          <div className="flex items-center gap-1 text-green-600">
                            <DollarSign className="h-3 w-3" />
                            <span className="font-semibold">${member.income.toLocaleString()}</span>
                          </div>
                        )}
                        {member.cpfTotal > 0 && (
                          <div className="text-muted-foreground">
                            CPF: ${member.cpfTotal.toLocaleString()}
                          </div>
                        )}
                        {member.holdings > 0 && (
                          <div className="text-muted-foreground">
                            Hold: ${member.holdings.toLocaleString()}
                          </div>
                        )}
                        {member.policiesCount > 0 && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Shield className="h-3 w-3" />
                            <span>{member.policiesCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="col-span-full sm:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Family Financial Overview
              </CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950">
                <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-2xl font-semibold text-muted-foreground">0 Members</div>
              <p className="text-sm text-muted-foreground mt-3">
                No family members added yet. Add family members to track household finances, CPF contributions, and insurance coverage.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Family Member
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Secondary Card: Quick Stats */}
        {members.length > 0 ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quick Stats
              </CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950">
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-2xl font-semibold">{familyOverviewStats.totalPolicies} Policies</div>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                ${familyOverviewStats.totalMonthlyPremiums.toLocaleString()}/mo in premiums
              </p>

              <div className="pt-3 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Family Details</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total CPF:</span>
                    <span className="font-semibold">${familyOverviewStats.totalCpfAssets.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Holdings:</span>
                    <span className="font-semibold">${familyOverviewStats.totalHoldings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average Age:</span>
                    <span className="font-semibold">{familyOverviewStats.averageAge.toFixed(0)} years</span>
                  </div>
                  {familyOverviewStats.topContributor && (
                    <div className="pt-2 mt-2 border-t">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Top Contributor:</span>
                        <span className="font-semibold truncate max-w-[120px]">{familyOverviewStats.topContributor.name}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-muted-foreground">Income:</span>
                        <span className="font-semibold text-green-600">${familyOverviewStats.topContributor.income.toLocaleString()}/mo</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quick Stats
              </CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950">
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="text-2xl font-semibold text-muted-foreground">—</div>
              <p className="text-sm text-muted-foreground mt-3">
                Family statistics will appear here once you add family members.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Family Members Header */}
      <h2 className="text-2xl font-semibold pt-4">Family Members</h2>

      {/* Search and Add Button */}
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddDialogOpen(true)}
          className="h-8 px-4 text-sm font-medium bg-transparent border-border/60 hover:bg-gray-100 dark:hover:bg-white/10 hover:border-border rounded-full transition-all duration-200 hover:scale-[1.02] hover:shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Member
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
                  Family Member
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
              paginatedMembers.map((member) => {
                const avatarConfig = getAvatarConfig(member.relationship);
                const AvatarIcon = avatarConfig.icon;

                return (
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
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${avatarConfig.bgColor}`}>
                          <AvatarIcon className={`w-4 h-4 ${avatarConfig.iconColor}`} />
                        </div>
                        <span className="font-medium">{member.name}</span>
                      </div>
                    </TableCell>
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
                  <TableRow className={`transition-all duration-300 ease-in-out ${!expandedRows.has(member.id) && 'h-0'}`}>
                    <TableCell colSpan={6} className={`bg-muted/50 p-0 transition-all duration-300 ease-in-out ${!expandedRows.has(member.id) && 'p-0 border-0'}`}>
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedRows.has(member.id) ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
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
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredAndSortedMembers.length > 0 ? startIndex + 1 : 0} to{" "}
        {Math.min(endIndex, filteredAndSortedMembers.length)} of {filteredAndSortedMembers.length} results
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

      {contributingMemberForIncome && incomeToEdit && (
        <EditIncomeDialog
          open={isAddIncomeDialogOpen}
          onOpenChange={setIsAddIncomeDialogOpen}
          onIncomeUpdated={handleIncomeAdded}
          income={incomeToEdit}
          familyMember={contributingMemberForIncome}
          pendingFormData={pendingIncomeFormData}
          onBack={handleIncomeBack}
          onCpfDetailsNeeded={handleCpfDetailsNeeded}
        />
      )}

      {contributingMemberForIncome && !incomeToEdit && (
        <AddIncomeDialog
          open={isAddIncomeDialogOpen}
          onOpenChange={setIsAddIncomeDialogOpen}
          onIncomeAdded={handleIncomeAdded}
          familyMember={contributingMemberForIncome}
          income={undefined}
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
