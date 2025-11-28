"use client";

import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, MoreHorizontal, Info, ArrowUpDown } from "lucide-react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CpfByFamilyMember } from "@/lib/actions/cpf";
import { AddCpfDetailsDialog } from "@/components/income/add-cpf-details-dialog";
import { updateIncome } from "@/lib/actions/income";
import { getIncomes } from "@/lib/actions/income";

interface CpfListProps {
  initialCpfData: CpfByFamilyMember[];
}

type SortKey = "familyMemberName" | "monthlyOaAllocation" | "monthlySaAllocation" | "monthlyMaAllocation";
type SortDirection = "asc" | "desc";

export function CpfList({ initialCpfData }: CpfListProps) {
  const [cpfData] = useState<CpfByFamilyMember[]>(initialCpfData);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("familyMemberName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isCpfDialogOpen, setIsCpfDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CpfByFamilyMember | null>(null);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [currentCpfValues, setCurrentCpfValues] = useState<{ oa: number; sa: number; ma: number } | null>(null);

  // Filter and sort CPF data
  const filteredData = useMemo(() => {
    let filtered = cpfData;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((member) =>
        member.familyMemberName.toLowerCase().includes(searchLower)
      );
    }

    // Sort the data
    filtered = [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [cpfData, search, sortKey, sortDirection]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const toggleRow = (familyMemberId: string) => {
    const newExpanded = new Set<string>();
    if (!expandedRows.has(familyMemberId)) {
      // Only open the clicked row, close all others
      newExpanded.add(familyMemberId);
    }
    // If clicking the same row that's open, it closes (set remains empty)
    setExpandedRows(newExpanded);
  };

  const handleEditCpf = async (member: CpfByFamilyMember) => {
    try {
      // Fetch all incomes to find the one for this family member
      const allIncomes = await getIncomes();
      const memberIncome = allIncomes.find(
        (income) => income.familyMemberId === member.familyMemberId && income.subjectToCpf && income.isActive
      );

      if (memberIncome) {
        setEditingMember(member);
        setEditingIncomeId(memberIncome.id);
        setCurrentCpfValues({
          oa: memberIncome.cpfOrdinaryAccount ? parseFloat(memberIncome.cpfOrdinaryAccount) : 0,
          sa: memberIncome.cpfSpecialAccount ? parseFloat(memberIncome.cpfSpecialAccount) : 0,
          ma: memberIncome.cpfMedisaveAccount ? parseFloat(memberIncome.cpfMedisaveAccount) : 0,
        });
        setIsCpfDialogOpen(true);
      } else {
        console.error("No active CPF income found for this family member");
      }
    } catch (error) {
      console.error("Failed to load income data:", error);
    }
  };

  const handleCpfSave = async (cpfDetails: { oa: number; sa: number; ma: number }) => {
    if (!editingIncomeId) return;

    try {
      await updateIncome(editingIncomeId, {
        cpfOrdinaryAccount: cpfDetails.oa,
        cpfSpecialAccount: cpfDetails.sa,
        cpfMedisaveAccount: cpfDetails.ma,
      });

      setIsCpfDialogOpen(false);
      setEditingMember(null);
      setEditingIncomeId(null);
      setCurrentCpfValues(null);

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error("Failed to save CPF details:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(2)}%`;
  };

  const totalResults = cpfData.length;
  const filteredResults = filteredData.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">CPF List</h2>
      </div>

      {/* Search Bar and Results Counter */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredResults === 0 ? 0 : 1} to {filteredResults} of {totalResults} results
        </div>
      </div>

      {/* Empty State */}
      {cpfData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            No CPF data available. Add income sources with CPF contributions for contributing family members.
          </p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            No results found for "{search}"
          </p>
        </div>
      ) : (
        <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("familyMemberName")}
                  className="h-auto p-0 font-semibold"
                >
                  Family Member
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("monthlyOaAllocation")}
                  className="h-auto p-0 font-semibold"
                >
                  OA Amount
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("monthlySaAllocation")}
                  className="h-auto p-0 font-semibold"
                >
                  SA Amount
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  onClick={() => handleSort("monthlyMaAllocation")}
                  className="h-auto p-0 font-semibold"
                >
                  MA Amount
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((member) => {
              const isExpanded = expandedRows.has(member.familyMemberId);
              return (
                <React.Fragment key={member.familyMemberId}>
                  <TableRow className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggleRow(member.familyMemberId)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{member.familyMemberName}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(member.monthlyOaContribution)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(member.monthlySaContribution)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(member.monthlyMaContribution)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditCpf(member)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled
                            className="text-muted-foreground cursor-not-allowed opacity-50"
                          >
                            🔒 Linked to Family Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>

                  <TableRow key={`${member.familyMemberId}-details`} className={`transition-all duration-300 ease-in-out ${!isExpanded && 'h-0'}`}>
                    <TableCell colSpan={6} className={`bg-muted/50 p-0 transition-all duration-300 ease-in-out ${!isExpanded && 'p-0 border-0'}`}>
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <span className="font-medium">Age:</span>{" "}
                              {member.age !== null ? `${member.age} years old` : 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Monthly Gross Income:</span>{" "}
                              {formatCurrency(member.monthlyGrossIncome)}
                            </div>
                            <div>
                              <span className="font-medium">Monthly Nett Income:</span>{" "}
                              <span className="text-green-700 font-semibold">{formatCurrency(member.monthlyNettIncome)}</span>
                            </div>
                          </div>

                          {/* Annual Bonus Summary (only shown if bonusTotalCpf > 0) */}
                          {member.bonusTotalCpf > 0 && (
                            <div className="grid grid-cols-3 gap-4">
                              <div></div>
                              <div>
                                <span className="font-medium">Annual Gross Bonus:</span>{" "}
                                {formatCurrency(member.bonusAmount)}
                              </div>
                              <div>
                                <span className="font-medium">Annual Nett Bonus:</span>{" "}
                                <span className="text-green-700 font-semibold">{formatCurrency(member.bonusAmount - member.bonusEmployeeCpf)}</span>
                              </div>
                            </div>
                          )}

                          <div className="bg-blue-50 p-3 rounded-md space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-blue-900">CPF Breakdown (Monthly)</div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                                    <Info className="h-4 w-4" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[500px]" align="end">
                                  <div className="space-y-4">
                                    {/* OW Ceiling Section */}
                                    <div>
                                      <h4 className="font-semibold text-base mb-2">Ordinary Wage (OW) Ceiling</h4>
                                      <p className="text-sm text-muted-foreground">
                                        The OW ceiling limits the amount of OW that attract CPF contributions in a calendar month for all employees.
                                      </p>
                                      <p className="text-sm font-medium mt-1">
                                        The current OW ceiling is $8,000 (2026).
                                      </p>
                                      <p className="text-sm font-medium mt-1 text-green-600">
                                        This user is {member.monthlyGrossIncome > 8000 ? 'above' : 'below or at'} the OW Ceiling
                                      </p>
                                    </div>

                                    {/* CPF Rates Table Section */}
                                    <div>
                                      <h4 className="font-semibold text-base mb-1">CPF Contribution Rates from 1 January 2025</h4>
                                      <p className="text-xs text-muted-foreground mb-2">(monthly wages &gt; $750)</p>

                                      <div className="border rounded-md overflow-hidden">
                                        <table className="w-full text-sm">
                                          <thead>
                                            <tr className="bg-muted/50">
                                              <th className="text-left p-2 font-medium border-b">Employee's age (years)</th>
                                              <th className="text-center p-2 font-medium border-b">By employer<br/>(% of wage)</th>
                                              <th className="text-center p-2 font-medium border-b">By employee<br/>(% of wage)</th>
                                              <th className="text-center p-2 font-medium border-b">Total<br/>(% of wage)</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr className={member.employeeCpfRate === 20 && member.employerCpfRate === 17 ? "border-b bg-yellow-100" : "border-b"}>
                                              <td className="p-2">55 and below</td>
                                              <td className="text-center p-2">17</td>
                                              <td className="text-center p-2">20</td>
                                              <td className="text-center p-2 font-medium">37</td>
                                            </tr>
                                            <tr className={member.employeeCpfRate === 17 && member.employerCpfRate === 15.5 ? "border-b bg-yellow-100" : "border-b bg-muted/30"}>
                                              <td className="p-2">Above 55 to 60</td>
                                              <td className="text-center p-2">15.5</td>
                                              <td className="text-center p-2">17</td>
                                              <td className="text-center p-2 font-medium">32.5</td>
                                            </tr>
                                            <tr className={member.employeeCpfRate === 11.5 && member.employerCpfRate === 12 ? "border-b bg-yellow-100" : "border-b"}>
                                              <td className="p-2">Above 60 to 65</td>
                                              <td className="text-center p-2">12</td>
                                              <td className="text-center p-2">11.5</td>
                                              <td className="text-center p-2 font-medium">23.5</td>
                                            </tr>
                                            <tr className={member.employeeCpfRate === 7.5 && member.employerCpfRate === 9 ? "border-b bg-yellow-100" : "border-b bg-muted/30"}>
                                              <td className="p-2">Above 65 to 70</td>
                                              <td className="text-center p-2">9</td>
                                              <td className="text-center p-2">7.5</td>
                                              <td className="text-center p-2 font-medium">16.5</td>
                                            </tr>
                                            <tr className={member.employeeCpfRate === 5 && member.employerCpfRate === 7.5 ? "bg-yellow-100" : ""}>
                                              <td className="p-2">Above 70</td>
                                              <td className="text-center p-2">7.5</td>
                                              <td className="text-center p-2">5</td>
                                              <td className="text-center p-2 font-medium">12.5</td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm pb-3 border-b border-blue-200">
                              <div>
                                <span className="text-blue-700 font-semibold">Gross Income:</span>{" "}
                                <div className="font-bold">{formatCurrency(member.monthlyGrossIncome)}</div>
                              </div>
                              <div>
                                <span className="text-blue-700 font-semibold">Net Income:</span>{" "}
                                <div className="font-bold">{formatCurrency(member.monthlyNettIncome)}</div>
                              </div>
                              <div></div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm pt-3">
                              <div>
                                <span className="text-blue-700">Monthly CPF Contribution:</span>{" "}
                                <div className="font-medium">{formatCurrency(member.monthlyTotalCpf)}</div>
                              </div>
                              <div>
                                <span className="text-blue-700">Employer Share ({formatPercentage(member.employerCpfRate)}):</span>{" "}
                                <div className="font-medium">{formatCurrency(member.monthlyEmployerCpf)}</div>
                              </div>
                              <div>
                                <span className="text-blue-700">Employee Share ({formatPercentage(member.employeeCpfRate)}):</span>{" "}
                                <div className="font-medium">{formatCurrency(member.monthlyEmployeeCpf)}</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-blue-700">OA ({formatPercentage(member.oaAllocationRate)}):</span>{" "}
                                <div className="font-medium">{formatCurrency(member.monthlyOaAllocation)}</div>
                              </div>
                              <div>
                                <span className="text-blue-700">SA ({formatPercentage(member.saAllocationRate)}):</span>{" "}
                                <div className="font-medium">{formatCurrency(member.monthlySaAllocation)}</div>
                              </div>
                              <div>
                                <span className="text-blue-700">MA ({formatPercentage(member.maAllocationRate)}):</span>{" "}
                                <div className="font-medium">{formatCurrency(member.monthlyMaAllocation)}</div>
                              </div>
                            </div>
                          </div>

                          {/* Bonus CPF Section (only shown if bonusTotalCpf > 0) */}
                          {member.bonusTotalCpf > 0 && (
                            <div className="bg-purple-50 p-3 rounded-md space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="font-semibold text-purple-900">CPF Breakdown (Annual Bonuses)</div>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                                      <Info className="h-4 w-4" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[500px] max-h-[500px] overflow-y-auto" align="end">
                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="font-semibold text-base mb-2">Annual Wage Ceiling</h4>
                                        <p className="text-sm text-muted-foreground">
                                          The annual wage ceiling limits the total amount of wages that attract CPF contributions in a calendar year.
                                        </p>
                                        <p className="text-sm font-medium mt-1">
                                          The current annual wage ceiling is $102,000 (2026).
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-2">
                                          After monthly CPF contributions (capped at $8,000/month), bonus CPF only applies to the remaining ceiling amount.
                                        </p>
                                      </div>

                                      <div className="bg-blue-50 p-2 rounded text-sm">
                                        <div className="font-medium mb-1">For this member:</div>
                                        <div>Total Bonus: {formatCurrency(member.bonusAmount)}</div>
                                        <div>CPF Applicable Bonus: {formatCurrency(member.bonusCpfApplicableAmount)}</div>
                                      </div>

                                      {/* CPF Allocation Rates Table */}
                                      <div>
                                        <h4 className="font-semibold text-base mb-2">CPF Allocation Rates</h4>
                                        <div className="border rounded-md overflow-hidden">
                                          <table className="w-full text-xs">
                                            <thead>
                                              <tr className="bg-muted/50">
                                                <th className="text-left p-2 font-medium border-b" rowSpan={2}>Employee's Age<br/>(Years)</th>
                                                <th className="text-center p-2 font-medium border-b" colSpan={3}>Allocated to</th>
                                              </tr>
                                              <tr className="bg-muted/50">
                                                <th className="text-center p-2 font-medium border-b">Ordinary Account<br/>(Ratio of Contribution)</th>
                                                <th className="text-center p-2 font-medium border-b">Special Account<sup>1</sup><br/>(Ratio of Contribution)</th>
                                                <th className="text-center p-2 font-medium border-b">MediSave Account<br/>(Ratio of Contribution)</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              <tr className={member.age !== null && member.age <= 35 ? "border-b bg-yellow-100" : "border-b"}>
                                                <td className="p-2">35 & below</td>
                                                <td className="text-center p-2">0.6217</td>
                                                <td className="text-center p-2">0.1621</td>
                                                <td className="text-center p-2">0.2162</td>
                                              </tr>
                                              <tr className={member.age !== null && member.age > 35 && member.age <= 45 ? "border-b bg-yellow-100" : "border-b bg-muted/30"}>
                                                <td className="p-2">Above 35 - 45</td>
                                                <td className="text-center p-2">0.5677</td>
                                                <td className="text-center p-2">0.1891</td>
                                                <td className="text-center p-2">0.2432</td>
                                              </tr>
                                              <tr className={member.age !== null && member.age > 45 && member.age <= 50 ? "border-b bg-yellow-100" : "border-b"}>
                                                <td className="p-2">Above 45 - 50</td>
                                                <td className="text-center p-2">0.5136</td>
                                                <td className="text-center p-2">0.2162</td>
                                                <td className="text-center p-2">0.2702</td>
                                              </tr>
                                              <tr className={member.age !== null && member.age > 50 && member.age <= 55 ? "border-b bg-yellow-100" : "border-b bg-muted/30"}>
                                                <td className="p-2">Above 50 - 55</td>
                                                <td className="text-center p-2">0.4055</td>
                                                <td className="text-center p-2">0.3108</td>
                                                <td className="text-center p-2">0.2837</td>
                                              </tr>
                                              <tr className="bg-muted/50 border-b">
                                                <td className="p-2 font-medium" colSpan={4}>
                                                  <div className="flex justify-between">
                                                    <span>Ordinary Account (Ratio of Contribution)</span>
                                                    <span>Retirement Account<sup>1</sup> (Ratio of Contribution)</span>
                                                    <span>MediSave Account (Ratio of Contribution)</span>
                                                  </div>
                                                </td>
                                              </tr>
                                              <tr className={member.age !== null && member.age > 55 && member.age <= 60 ? "border-b bg-yellow-100" : "border-b"}>
                                                <td className="p-2">Above 55 - 60</td>
                                                <td className="text-center p-2">0.3694</td>
                                                <td className="text-center p-2">0.3076</td>
                                                <td className="text-center p-2">0.3230</td>
                                              </tr>
                                              <tr className={member.age !== null && member.age > 60 && member.age <= 65 ? "border-b bg-yellow-100" : "border-b bg-muted/30"}>
                                                <td className="p-2">Above 60 - 65</td>
                                                <td className="text-center p-2">0.149</td>
                                                <td className="text-center p-2">0.4042</td>
                                                <td className="text-center p-2">0.4468</td>
                                              </tr>
                                              <tr className={member.age !== null && member.age > 65 && member.age <= 70 ? "border-b bg-yellow-100" : "border-b"}>
                                                <td className="p-2">Above 65 - 70</td>
                                                <td className="text-center p-2">0.0607</td>
                                                <td className="text-center p-2">0.303</td>
                                                <td className="text-center p-2">0.6363</td>
                                              </tr>
                                              <tr className={member.age !== null && member.age > 70 ? "bg-yellow-100" : "bg-muted/30"}>
                                                <td className="p-2">Above 70</td>
                                                <td className="text-center p-2">0.08</td>
                                                <td className="text-center p-2">0.08</td>
                                                <td className="text-center p-2">0.84</td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                          <sup>1</sup>For employees above 55, contributions go to Retirement Account instead of Special Account
                                        </p>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <div className="grid grid-cols-3 gap-4 text-sm pb-3 border-b border-purple-200">
                                <div>
                                  <span className="text-purple-700 font-semibold">Gross Bonus:</span>{" "}
                                  <div className="font-bold">{formatCurrency(member.bonusAmount)}</div>
                                </div>
                                <div>
                                  <span className="text-purple-700 font-semibold">Net Bonus:</span>{" "}
                                  <div className="font-bold">{formatCurrency(member.bonusAmount - member.bonusEmployeeCpf)}</div>
                                </div>
                                <div></div>
                              </div>

                              <div className="grid grid-cols-3 gap-4 text-sm pt-3">
                                <div>
                                  <span className="text-purple-700">Annual Bonus CPF Contribution:</span>{" "}
                                  <div className="font-medium">{formatCurrency(member.bonusTotalCpf)}</div>
                                </div>
                                <div>
                                  <span className="text-purple-700">Annual Employer Bonus CPF Share:</span>{" "}
                                  <div className="font-medium">{formatCurrency(member.bonusEmployerCpf)}</div>
                                </div>
                                <div>
                                  <span className="text-purple-700">Annual Employee Bonus CPF Share:</span>{" "}
                                  <div className="font-medium">{formatCurrency(member.bonusEmployeeCpf)}</div>
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-purple-700">Bonus OA ({formatPercentage(member.oaAllocationRate)}):</span>{" "}
                                  <div className="font-medium">{formatCurrency(member.bonusOaAllocation)}</div>
                                </div>
                                <div>
                                  <span className="text-purple-700">Bonus SA ({formatPercentage(member.saAllocationRate)}):</span>{" "}
                                  <div className="font-medium">{formatCurrency(member.bonusSaAllocation)}</div>
                                </div>
                                <div>
                                  <span className="text-purple-700">Bonus MA ({formatPercentage(member.maAllocationRate)}):</span>{" "}
                                  <div className="font-medium">{formatCurrency(member.bonusMaAllocation)}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
        </div>
      )}

      {/* CPF Details Edit Dialog */}
      {editingMember && currentCpfValues && (
        <AddCpfDetailsDialog
          open={isCpfDialogOpen}
          onOpenChange={setIsCpfDialogOpen}
          onBack={() => setIsCpfDialogOpen(false)}
          onComplete={handleCpfSave}
          totalCpfContribution={editingMember.monthlyTotalCpf}
          familyMemberName={editingMember.familyMemberName}
          initialOA={currentCpfValues.oa}
          initialSA={currentCpfValues.sa}
          initialMA={currentCpfValues.ma}
        />
      )}
    </div>
  );
}
