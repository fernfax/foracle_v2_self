"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Landmark, PiggyBank, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { RowActions } from "@/components/ui/row-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { AddCpfDetailsDialog } from "@/components/income/add-cpf-details-dialog";
import { updateIncome } from "@/lib/actions/income";
import { formatBudgetCurrency } from "@/lib/budget-utils";
import { FRS_2026 } from "@/lib/cpf-calculator";
import { cpfBalanceForMember, findPrimaryCpfIncome } from "@/lib/cpf-balances";
import type { CpfByFamilyMember } from "@/lib/actions/cpf";

interface CpfIncomeRow {
  id: string;
  familyMemberId: string | null;
  subjectToCpf: boolean | null;
  isActive: boolean | null;
  cpfOrdinaryAccount: string | null;
  cpfSpecialAccount: string | null;
  cpfMedisaveAccount: string | null;
}

interface CpfViewProps {
  cpfData: CpfByFamilyMember[];
  incomes: CpfIncomeRow[];
}

const ACCOUNTS = [
  { key: "oa", label: "Ordinary (OA)", color: "#B8622A" },
  { key: "sa", label: "Special (SA)", color: "#3A6B52" },
  { key: "ma", label: "MediSave (MA)", color: "#00C4AA" },
] as const;

interface EditState {
  member: CpfByFamilyMember;
  incomeId: string;
  values: { oa: number; sa: number; ma: number };
}

export function CpfView({ cpfData, incomes }: CpfViewProps) {
  const router = useRouter();
  const [edit, setEdit] = useState<EditState | null>(null);

  const totalBalance = cpfData.reduce(
    (sum, m) => sum + cpfBalanceForMember(m.familyMemberId, incomes).total,
    0
  );
  const monthlyContributions = cpfData.reduce((sum, m) => sum + m.monthlyTotalCpf, 0);

  const openEdit = (member: CpfByFamilyMember) => {
    const income = findPrimaryCpfIncome(member.familyMemberId, incomes);
    if (!income) {
      toast.error("Add a CPF-eligible income for this member first.");
      return;
    }
    const bal = cpfBalanceForMember(member.familyMemberId, incomes);
    setEdit({ member, incomeId: income.id, values: { oa: bal.oa, sa: bal.sa, ma: bal.ma } });
  };

  const handleComplete = async (cpf: { oa: number; sa: number; ma: number }) => {
    if (!edit) return;
    try {
      await updateIncome(edit.incomeId, {
        cpfOrdinaryAccount: cpf.oa,
        cpfSpecialAccount: cpf.sa,
        cpfMedisaveAccount: cpf.ma,
      });
      toast.success("CPF balances updated");
      setEdit(null);
      router.refresh();
    } catch (err) {
      console.error("Failed to save CPF details:", err);
      toast.error("Could not update CPF balances. Please try again.");
    }
  };

  if (cpfData.length === 0) {
    return (
      <SectionCard icon={Building2} title="CPF" subtitle="Ordinary, Special and MediSave balances">
        <EmptyState
          icon={Building2}
          title="No CPF members yet"
          description="CPF is tracked for family members with CPF-eligible income. Add income to see balances here."
        />
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat band */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total CPF balance"
          value={formatBudgetCurrency(totalBalance)}
          icon={Landmark}
          accent="jungle"
          delta={`${cpfData.length} ${cpfData.length === 1 ? "member" : "members"}`}
        />
        <StatCard
          label="Monthly contributions"
          value={formatBudgetCurrency(monthlyContributions)}
          icon={PiggyBank}
          accent="brand"
          delta="Employee + employer"
        />
        <StatCard
          label="Full Retirement Sum"
          value={formatBudgetCurrency(FRS_2026)}
          icon={Target}
          accent="gold"
          delta="2026 target"
        />
      </div>

      {/* Per-member cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {cpfData.map((member) => {
          const bal = cpfBalanceForMember(member.familyMemberId, incomes);
          const pctToFrs = FRS_2026 > 0 ? Math.round((bal.total / FRS_2026) * 100) : 0;
          return (
            <SectionCard
              key={member.familyMemberId}
              icon={Building2}
              title={member.familyMemberName}
              subtitle="CPF member"
              actions={
                <div className="flex items-center gap-2">
                  <Badge variant="success">{pctToFrs}% to FRS</Badge>
                  <RowActions onEdit={() => openEdit(member)} editLabel="Edit CPF balances" />
                </div>
              }
            >
              <div className="space-y-3">
                {ACCOUNTS.map((acct) => {
                  const amount = bal[acct.key];
                  const pct = bal.total > 0 ? (amount / bal.total) * 100 : 0;
                  return (
                    <div key={acct.key}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: acct.color }}
                          />
                          {acct.label}
                        </span>
                        <span className="font-display font-medium tabular-nums">
                          {formatBudgetCurrency(amount)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: acct.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                <span className="text-label-caps uppercase text-muted-foreground">
                  Total balance
                </span>
                <span className="font-display text-base font-semibold tabular-nums">
                  {formatBudgetCurrency(bal.total)}
                </span>
              </div>
            </SectionCard>
          );
        })}
      </div>

      {edit && (
        <AddCpfDetailsDialog
          open={edit !== null}
          onOpenChange={(open) => !open && setEdit(null)}
          onBack={() => setEdit(null)}
          onComplete={handleComplete}
          totalCpfContribution={edit.member.monthlyTotalCpf}
          familyMemberName={edit.member.familyMemberName}
          initialOA={edit.values.oa}
          initialSA={edit.values.sa}
          initialMA={edit.values.ma}
          isStandalone
        />
      )}
    </div>
  );
}
