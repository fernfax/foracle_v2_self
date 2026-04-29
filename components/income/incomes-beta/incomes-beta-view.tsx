"use client";

import { useMemo, useState } from "react";
import {
  Infinity as InfinityIcon,
  Target,
  Clock,
  Plus,
  TrendingUp,
  X,
  Settings2,
  Trash2,
} from "lucide-react";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CHART_PALETTE } from "@/lib/chart-palette";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { updateIncome, deleteIncome } from "@/lib/actions/income";
import { useOptimisticIncomes } from "./use-optimistic-incomes";
import { QuickAdjustPad } from "./quick-adjust-pad";
import {
  EditablePill,
  TextPillEditor,
  DatePillEditor,
} from "./editable-pill";
import { FutureChangeDialog, type FutureMilestone } from "./future-change-dialog";
import { IncomeCreatorDrawer } from "./income-creator-drawer";
import { IncomeDetailDrawer } from "./income-detail-drawer";

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
  accountForFutureChange: boolean | null;
  isActive: boolean | null;
  familyMemberId: string | null;
  familyMember: {
    id: string;
    name: string;
    relationship: string | null;
    dateOfBirth: string | null;
    isContributing: boolean | null;
  } | null;
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

type Archetype = "recurring" | "one-off" | "temporary";

interface FutureMilestoneRaw {
  id: string;
  targetMonth: string;
  amount: number;
  reason?: string;
  notes?: string;
}

const TIMELINE_MONTHS = 24;
const TIMELINE_START_OFFSET = -6;

const ARCHETYPE_META: Record<
  Archetype,
  { label: string; icon: typeof InfinityIcon; tone: string; bar: string; pill: string; rail: string }
> = {
  recurring: {
    label: "RECURRING",
    icon: InfinityIcon,
    tone: "text-[#3A6B52]",
    bar: "bg-gradient-to-r from-[#3A6B52] to-[#5A9470]",
    pill: "bg-[#3A6B52]/10 text-[#1F4A33] border-[#3A6B52]/30",
    rail: "bg-[#3A6B52]",
  },
  "one-off": {
    label: "ONE-OFF",
    icon: Target,
    tone: "text-[#B8622A]",
    bar: "bg-gradient-to-r from-[#B8622A] to-[#D4845A]",
    pill: "bg-[#B8622A]/10 text-[#7A3A0A] border-[#B8622A]/30",
    rail: "bg-[#B8622A]",
  },
  temporary: {
    label: "TEMPORARY",
    icon: Clock,
    tone: "text-[#7A5A00]",
    bar: "bg-gradient-to-r from-[#D4A843] to-[#E0BD5C]",
    pill: "bg-[#D4A843]/15 text-[#7A5A00] border-[#D4A843]/40",
    rail: "bg-[#D4A843]",
  },
};

function getArchetype(income: Income): Archetype {
  if (income.incomeCategory === "one-off" || income.frequency === "one-time") {
    return "one-off";
  }
  if (income.endDate) return "temporary";
  return "recurring";
}

function safeParseMilestones(json: string | null): FutureMilestoneRaw[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m) => m && typeof m.targetMonth === "string")
      .map((m) => ({
        id: String(m.id ?? m.targetMonth),
        targetMonth: m.targetMonth,
        amount: Number(m.amount) || 0,
        reason: m.reason,
        notes: m.notes,
      }))
      .sort((a, b) => a.targetMonth.localeCompare(b.targetMonth));
  } catch {
    return [];
  }
}

function formatPillDate(monthDate: Date) {
  return format(monthDate, "MMM yy");
}

function formatCurrency(value: number) {
  if (value === 0) return "$0";
  return `$${Math.round(value).toLocaleString()}`;
}

interface MonthCell {
  date: Date;
  key: string;
  label: string;
  yearLabel: string;
}

function buildMonthCells(): MonthCell[] {
  const base = startOfMonth(new Date());
  return Array.from({ length: TIMELINE_MONTHS }, (_, i) => {
    const date = addMonths(base, TIMELINE_START_OFFSET + i);
    return {
      date,
      key: format(date, "yyyy-MM"),
      label: format(date, "MMM"),
      yearLabel: format(date, "yy"),
    };
  });
}

function isMonthInIncomeWindow(income: Income, cell: MonthCell): boolean {
  const start = parseISO(income.startDate);
  const startKey = format(startOfMonth(start), "yyyy-MM");
  if (cell.key < startKey) return false;
  if (income.endDate) {
    const endKey = format(startOfMonth(parseISO(income.endDate)), "yyyy-MM");
    if (cell.key > endKey) return false;
  }
  return true;
}

function getAmountForMonth(income: Income, cell: MonthCell): number {
  if (!income.isActive) return 0;
  if (!isMonthInIncomeWindow(income, cell)) return 0;

  const baseAmount = Number(income.amount) || 0;
  const milestones = income.accountForFutureChange
    ? safeParseMilestones(income.futureMilestones)
    : [];
  const applicableMilestone = milestones
    .filter((m) => m.targetMonth <= cell.key)
    .pop();
  const effectiveAmount = applicableMilestone
    ? applicableMilestone.amount
    : baseAmount;

  switch (income.frequency) {
    case "monthly":
      return effectiveAmount;
    case "yearly": {
      const startMonth = format(parseISO(income.startDate), "MM");
      const cellMonth = format(cell.date, "MM");
      return startMonth === cellMonth ? effectiveAmount : 0;
    }
    case "weekly":
      return effectiveAmount * (52 / 12);
    case "bi-weekly":
      return effectiveAmount * (26 / 12);
    case "one-time": {
      const startKey = format(startOfMonth(parseISO(income.startDate)), "yyyy-MM");
      return cell.key === startKey ? effectiveAmount : 0;
    }
    case "custom": {
      try {
        const months: number[] = JSON.parse(income.customMonths || "[]");
        const cellMonthNum = cell.date.getMonth() + 1;
        return months.includes(cellMonthNum) ? effectiveAmount : 0;
      } catch {
        return 0;
      }
    }
    default:
      return effectiveAmount;
  }
}


interface BarSegment {
  startIndex: number;
  spanCount: number;
  amount: number;
}

function buildBarSegments(income: Income, cells: MonthCell[]): BarSegment[] {
  const segments: BarSegment[] = [];
  let current: BarSegment | null = null;
  cells.forEach((cell, i) => {
    const amount = getAmountForMonth(income, cell);
    if (amount > 0) {
      if (current && current.amount === amount && current.startIndex + current.spanCount === i) {
        current.spanCount += 1;
      } else {
        if (current) segments.push(current);
        current = { startIndex: i, spanCount: 1, amount };
      }
    } else {
      if (current) {
        segments.push(current);
        current = null;
      }
    }
  });
  if (current) segments.push(current);
  return segments;
}

interface IncomesBetaViewProps {
  incomes: Income[];
  familyMembers: FamilyMember[];
}

type ViewMode = "timeline" | "cards";

export function IncomesBetaView({
  incomes: rawIncomes,
  familyMembers,
}: IncomesBetaViewProps) {
  const [view, setView] = useState<ViewMode>("timeline");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const activeRaw = useMemo(
    () => rawIncomes.filter((i) => i.isActive !== false),
    [rawIncomes]
  );

  const { incomes, mutate, error, clearError } = useOptimisticIncomes(activeRaw);

  // Modal/drawer state
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [detailIncomeId, setDetailIncomeId] = useState<string | null>(null);
  const [futureChangeContext, setFutureChangeContext] = useState<{
    incomeId: string;
    milestone?: FutureMilestone;
  } | null>(null);
  const [deleteContext, setDeleteContext] = useState<Income | null>(null);

  const detailIncome = detailIncomeId
    ? incomes.find((i) => i.id === detailIncomeId) ?? null
    : null;
  const futureChangeIncome = futureChangeContext
    ? incomes.find((i) => i.id === futureChangeContext.incomeId) ?? null
    : null;

  const cells = useMemo(buildMonthCells, []);

  const monthlyTotals = useMemo(() => {
    return cells.map((cell) => {
      const breakdown = incomes.map((income) => ({
        income,
        amount: getAmountForMonth(income, cell),
      }));
      const total = breakdown.reduce((sum, b) => sum + b.amount, 0);
      return { cell, breakdown: breakdown.filter((b) => b.amount > 0), total };
    });
  }, [cells, incomes]);

  const peakTotal = useMemo(
    () => monthlyTotals.reduce((max, m) => Math.max(max, m.total), 0),
    [monthlyTotals]
  );

  // ─── handlers ────────────────────────────────────────────────────────────

  const handleAmountChange = (income: Income, nextAmount: number) => {
    mutate(
      { kind: "update", id: income.id, patch: { amount: nextAmount.toString() } },
      () => updateIncome(income.id, { amount: nextAmount })
    );
  };

  const handleNameChange = (income: Income, name: string) => {
    mutate(
      { kind: "update", id: income.id, patch: { name } },
      () => updateIncome(income.id, { name })
    );
  };

  const handleStartDateChange = (income: Income, next: Date) => {
    const iso = format(startOfMonth(next), "yyyy-MM-dd");
    mutate(
      { kind: "update", id: income.id, patch: { startDate: iso } },
      () => updateIncome(income.id, { startDate: iso })
    );
  };

  const handleEndDateChange = (income: Income, next: Date | null) => {
    const iso = next ? format(startOfMonth(next), "yyyy-MM-dd") : null;
    const archetypeAfter = next ? "temporary" : "recurring";
    mutate(
      { kind: "update", id: income.id, patch: { endDate: iso } },
      () =>
        updateIncome(income.id, {
          endDate: iso,
          incomeCategory:
            archetypeAfter === "recurring" ? "current-recurring" : "current-recurring",
        })
    );
  };

  const handleSaveMilestone = (income: Income, milestone: FutureMilestone) => {
    const existing = safeParseMilestones(income.futureMilestones);
    const filtered = existing.filter((m) => m.id !== milestone.id);
    const next = [...filtered, milestone].sort((a, b) =>
      a.targetMonth.localeCompare(b.targetMonth)
    );
    const json = JSON.stringify(next);
    mutate(
      {
        kind: "update",
        id: income.id,
        patch: { futureMilestones: json, accountForFutureChange: true },
      },
      () =>
        updateIncome(income.id, {
          futureMilestones: json,
          accountForFutureChange: true,
        })
    );
  };

  const handleDeleteMilestone = (income: Income, milestoneId: string) => {
    const existing = safeParseMilestones(income.futureMilestones);
    const next = existing.filter((m) => m.id !== milestoneId);
    const json = next.length === 0 ? null : JSON.stringify(next);
    const accountForFutureChange = next.length > 0;
    mutate(
      {
        kind: "update",
        id: income.id,
        patch: { futureMilestones: json, accountForFutureChange },
      },
      () =>
        updateIncome(income.id, {
          futureMilestones: json,
          accountForFutureChange,
        })
    );
  };

  const handleConfirmDelete = (income: Income) => {
    mutate(
      { kind: "delete", id: income.id },
      () => deleteIncome(income.id)
    );
    setDeleteContext(null);
  };

  return (
    <div className="space-y-6">
      <ViewToggle view={view} onChangeView={setView} />

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="text-xs font-semibold uppercase tracking-wider hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {incomes.length === 0 ? (
        <EmptyState onCreate={() => setCreatorOpen(true)} />
      ) : view === "timeline" ? (
        <TimelineStudio
          cells={cells}
          incomes={incomes}
          monthlyTotals={monthlyTotals}
          peakTotal={peakTotal}
          hoverIndex={hoverIndex}
          onHover={setHoverIndex}
          onAmountChange={handleAmountChange}
          onRequestDelete={setDeleteContext}
          onOpenCreator={() => setCreatorOpen(true)}
          onOpenDetail={setDetailIncomeId}
        />
      ) : (
        <ActionCardsView
          cells={cells}
          incomes={incomes}
          monthlyTotals={monthlyTotals}
          peakTotal={peakTotal}
          hoverIndex={hoverIndex}
          onHover={setHoverIndex}
          onAmountChange={handleAmountChange}
          onNameChange={handleNameChange}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
          onAddMilestone={(income) =>
            setFutureChangeContext({ incomeId: income.id })
          }
          onEditMilestone={(income, milestone) =>
            setFutureChangeContext({ incomeId: income.id, milestone })
          }
          onDeleteMilestone={handleDeleteMilestone}
          onRequestDelete={setDeleteContext}
          onOpenCreator={() => setCreatorOpen(true)}
          onOpenDetail={setDetailIncomeId}
        />
      )}

      <BetaFooter familyMembers={familyMembers} incomeCount={incomes.length} />

      <IncomeCreatorDrawer
        open={creatorOpen}
        onOpenChange={setCreatorOpen}
        familyMembers={familyMembers.map((m) => ({
          id: m.id,
          name: m.name,
          dateOfBirth: m.dateOfBirth,
        }))}
      />

      <IncomeDetailDrawer
        open={detailIncome !== null}
        onOpenChange={(o) => !o && setDetailIncomeId(null)}
        income={detailIncome}
        familyMembers={familyMembers.map((m) => ({
          id: m.id,
          name: m.name,
          dateOfBirth: m.dateOfBirth,
        }))}
      />

      <FutureChangeDialog
        open={futureChangeContext !== null}
        onOpenChange={(o) => !o && setFutureChangeContext(null)}
        incomeName={futureChangeIncome?.name ?? ""}
        initial={futureChangeContext?.milestone}
        onSave={(m) => futureChangeIncome && handleSaveMilestone(futureChangeIncome, m)}
        onDelete={
          futureChangeContext?.milestone && futureChangeIncome
            ? () =>
                handleDeleteMilestone(
                  futureChangeIncome,
                  futureChangeContext.milestone!.id
                )
            : undefined
        }
      />

      <AlertDialog
        open={deleteContext !== null}
        onOpenChange={(o) => !o && setDeleteContext(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete <span className="italic">{deleteContext?.name}</span>?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This income stream will be removed from your projections. This can&apos;t
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteContext && handleConfirmDelete(deleteContext)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ViewToggle({
  view,
  onChangeView,
}: {
  view: ViewMode;
  onChangeView: (v: ViewMode) => void;
}) {
  return (
    <div className="flex justify-end">
      <div className="inline-flex items-center rounded-full border border-border/40 bg-muted p-1 text-sm shadow-sm">
        <button
          onClick={() => onChangeView("timeline")}
          className={cn(
            "rounded-full px-4 py-1.5 font-medium transition-colors",
            view === "timeline"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Timeline Studio
        </button>
        <button
          onClick={() => onChangeView("cards")}
          className={cn(
            "rounded-full px-4 py-1.5 font-medium transition-colors",
            view === "cards"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Action Cards
        </button>
      </div>
    </div>
  );
}

function TimelineStudio({
  cells,
  incomes,
  monthlyTotals,
  peakTotal,
  hoverIndex,
  onHover,
  onAmountChange,
  onRequestDelete,
  onOpenCreator,
  onOpenDetail,
}: {
  cells: MonthCell[];
  incomes: Income[];
  monthlyTotals: ReturnType<typeof Object>;
  peakTotal: number;
  hoverIndex: number | null;
  onHover: (i: number | null) => void;
  onAmountChange: (income: Income, amount: number) => void;
  onRequestDelete: (income: Income) => void;
  onOpenCreator: () => void;
  onOpenDetail: (id: string) => void;
}) {
  const totals = monthlyTotals as Array<{
    cell: MonthCell;
    breakdown: Array<{ income: Income; amount: number }>;
    total: number;
  }>;

  // Find "now" column index for the playhead
  const nowKey = format(startOfMonth(new Date()), "yyyy-MM");
  const nowIndex = cells.findIndex((c) => c.key === nowKey);
  const nowLeftPct = nowIndex >= 0 ? (nowIndex + 0.5) / cells.length : null;

  // Sort tracks: RECURRING first, then TEMPORARY, then ONE-OFF — name-stable within each group
  const sortedIncomes = [...incomes].sort((a, b) => {
    const order = { recurring: 0, temporary: 1, "one-off": 2 } as const;
    const oa = order[getArchetype(a)];
    const ob = order[getArchetype(b)];
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-5 w-5 text-brand-jungle" />
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Projected Income River
        </h2>
      </div>

      <div className="rounded-2xl border border-border/30 bg-card shadow-sm overflow-hidden">
        {/* Master river chart */}
        <div className="px-6 pt-6 pb-2 grid grid-cols-[180px_1fr] gap-0">
          <div className="flex items-end pb-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Master
            </span>
          </div>
          <div>
            <RiverChart
              cells={cells}
              totals={totals}
              peakTotal={peakTotal}
              hoverIndex={hoverIndex}
            />
          </div>
        </div>

        {/* Month axis — aligned with the timeline grid below */}
        <div className="grid grid-cols-[180px_1fr] gap-0 border-b border-border/30">
          <div className="border-r border-border/30" />
          <div className="px-0">
            <MonthAxis
              cells={cells}
              hoverIndex={hoverIndex}
              onHover={onHover}
              totals={totals}
            />
          </div>
        </div>

        {/* Track lanes — DAW-style stacked tracks sharing one continuous timeline */}
        <div className="relative">
          {/* Overlay container that spans only the timeline grid (not the track header) */}
          <div className="pointer-events-none absolute inset-y-0 left-[180px] right-0">
            {/* Vertical month gridlines spanning every track */}
            <div className="absolute inset-0 grid grid-cols-[repeat(24,minmax(0,1fr))]">
              {cells.map((cell) => (
                <div
                  key={cell.key}
                  className="border-l border-border/15 first:border-l-0"
                />
              ))}
            </div>
            {/* Now playhead */}
            {nowLeftPct !== null && (
              <div
                className="absolute top-0 bottom-0 w-px bg-brand-terracotta/50 z-10"
                style={{ left: `${nowLeftPct * 100}%` }}
              >
                <span className="absolute -top-1 -translate-x-1/2 left-0 rounded-sm bg-brand-terracotta px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">
                  Now
                </span>
              </div>
            )}
          </div>

          {sortedIncomes.map((income, i) => (
            <IncomeStreamRow
              key={income.id}
              income={income}
              cells={cells}
              isFirst={i === 0}
              alternate={i % 2 === 1}
              onAmountChange={onAmountChange}
              onRequestDelete={onRequestDelete}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>

        {/* Add track row — bottom of the rack */}
        <button
          type="button"
          onClick={onOpenCreator}
          className="flex w-full items-center justify-center gap-2 border-t border-border/30 bg-muted/30 py-3 text-sm font-medium text-muted-foreground hover:bg-brand-terracotta/5 hover:text-brand-terracotta transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Income Stream
        </button>
      </div>
    </div>
  );
}

function RiverChart({
  cells,
  totals,
  peakTotal,
  hoverIndex,
}: {
  cells: MonthCell[];
  totals: Array<{ cell: MonthCell; total: number; breakdown: Array<{ income: Income; amount: number }> }>;
  peakTotal: number;
  hoverIndex: number | null;
}) {
  const width = 1080;
  const height = 160;
  const stepX = width / Math.max(1, cells.length - 1);

  const yFor = (val: number) => {
    if (peakTotal <= 0) return height - 4;
    return height - 4 - (val / peakTotal) * (height - 24);
  };

  const path = cells
    .map((_, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${yFor(totals[i].total)}`)
    .join(" ");
  const fill = `${path} L ${(cells.length - 1) * stepX} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full h-40"
      aria-hidden
    >
      <defs>
        <linearGradient id="river-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3A6B52" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#3A6B52" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#river-fill)" />
      <path d={path} fill="none" stroke="#3A6B52" strokeWidth={2} strokeLinejoin="round" />
      {hoverIndex !== null && (
        <>
          <line
            x1={hoverIndex * stepX}
            x2={hoverIndex * stepX}
            y1={0}
            y2={height}
            stroke="rgba(28,43,42,0.20)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <circle
            cx={hoverIndex * stepX}
            cy={yFor(totals[hoverIndex].total)}
            r={5}
            fill="#FFFFFF"
            stroke="#3A6B52"
            strokeWidth={2}
          />
        </>
      )}
    </svg>
  );
}

function MonthAxis({
  cells,
  hoverIndex,
  onHover,
  totals,
}: {
  cells: MonthCell[];
  hoverIndex: number | null;
  onHover: (i: number | null) => void;
  totals: Array<{ cell: MonthCell; total: number; breakdown: Array<{ income: Income; amount: number }> }>;
}) {
  return (
    <div className="relative mt-2">
      <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-px text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {cells.map((cell, i) => (
          <div
            key={cell.key}
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}
            className={cn(
              "relative flex flex-col items-center gap-1 py-1.5 cursor-default rounded transition-colors",
              hoverIndex === i && "bg-muted text-foreground"
            )}
          >
            <div className="h-px w-full bg-gradient-to-r from-transparent via-brand-jungle/50 to-transparent" />
            <span>{cell.label}</span>
          </div>
        ))}
      </div>
      {hoverIndex !== null && (
        <HoverTooltip
          index={hoverIndex}
          cell={cells[hoverIndex]}
          breakdown={totals[hoverIndex].breakdown}
          total={totals[hoverIndex].total}
          totalCount={cells.length}
        />
      )}
    </div>
  );
}

function HoverTooltip({
  index,
  cell,
  breakdown,
  total,
  totalCount,
}: {
  index: number;
  cell: MonthCell;
  breakdown: Array<{ income: Income; amount: number }>;
  total: number;
  totalCount: number;
}) {
  const leftPct = (index / Math.max(1, totalCount - 1)) * 100;
  const align =
    leftPct < 15 ? "translate-x-0" : leftPct > 85 ? "-translate-x-full" : "-translate-x-1/2";

  return (
    <div
      className={cn(
        "absolute z-10 -top-44 w-56 rounded-xl border border-border/40 bg-popover text-popover-foreground px-4 py-3 shadow-lg pointer-events-none",
        align
      )}
      style={{ left: `${leftPct}%` }}
    >
      <p className="font-display text-sm font-semibold">
        {format(cell.date, "MMM yy")}
      </p>
      <div className="mt-2 space-y-1.5 border-t border-border/40 pt-2">
        {breakdown.length === 0 ? (
          <p className="text-xs text-muted-foreground">No income this month</p>
        ) : (
          breakdown.map(({ income, amount }, i) => (
            <div
              key={income.id}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span
                  className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] }}
                />
                {income.name}
              </span>
              <span className="font-display font-medium">
                {formatCurrency(amount)}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-jungle">
          Total
        </span>
        <span className="font-display text-sm font-semibold text-brand-jungle">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}

function IncomeStreamRow({
  income,
  cells,
  isFirst = false,
  alternate = false,
  onAmountChange,
  onRequestDelete,
  onOpenDetail,
}: {
  income: Income;
  cells: MonthCell[];
  isFirst?: boolean;
  alternate?: boolean;
  onAmountChange: (income: Income, amount: number) => void;
  onRequestDelete: (income: Income) => void;
  onOpenDetail: (id: string) => void;
}) {
  const archetype = getArchetype(income);
  const meta = ARCHETYPE_META[archetype];
  const Icon = meta.icon;
  const segments = buildBarSegments(income, cells);

  return (
    <div
      className={cn(
        "group relative grid grid-cols-[180px_1fr] items-stretch transition-colors",
        !isFirst && "border-t border-border/20",
        alternate ? "bg-muted/25" : "bg-transparent",
        "hover:bg-brand-jungle/[0.04]"
      )}
    >
      {/* Track header column */}
      <div className="flex flex-col justify-center gap-0.5 border-r border-border/30 px-4 py-3 min-w-0">
        <div
          className={cn(
            "flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em]",
            meta.tone
          )}
        >
          <Icon className="h-3 w-3" />
          {meta.label}
        </div>
        <p className="font-display text-sm font-semibold text-foreground truncate">
          {income.name}
        </p>
        {income.familyMember && (
          <p className="text-[11px] text-muted-foreground truncate">
            {income.familyMember.name}
          </p>
        )}
        <div className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onOpenDetail(income.id)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Open details for ${income.name}`}
          >
            <Settings2 className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onRequestDelete(income)}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Delete ${income.name}`}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Bars area — gridlines come from the parent overlay */}
      <div className="relative h-14">
        {segments.map((seg, i) => {
          const leftPct = (seg.startIndex / cells.length) * 100;
          const widthPct = (seg.spanCount / cells.length) * 100;
          return (
            <Popover key={i}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 flex items-center justify-center rounded-md px-2 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-y-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    meta.bar
                  )}
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    height: "32px",
                  }}
                  aria-label={`Adjust ${income.name} amount, currently ${formatCurrency(seg.amount)}`}
                >
                  <span className="truncate">{formatCurrency(seg.amount)}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="center"
                className="p-0 border-0 bg-transparent shadow-none w-auto"
              >
                <QuickAdjustPad
                  initialAmount={seg.amount}
                  label={`Adjust ${income.name}`}
                  onConfirm={(next) => onAmountChange(income, next)}
                />
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
}

interface ActionCardsViewProps {
  cells: MonthCell[];
  incomes: Income[];
  monthlyTotals: ReturnType<typeof Object>;
  peakTotal: number;
  hoverIndex: number | null;
  onHover: (i: number | null) => void;
  onAmountChange: (income: Income, amount: number) => void;
  onNameChange: (income: Income, name: string) => void;
  onStartDateChange: (income: Income, next: Date) => void;
  onEndDateChange: (income: Income, next: Date | null) => void;
  onAddMilestone: (income: Income) => void;
  onEditMilestone: (income: Income, milestone: FutureMilestone) => void;
  onDeleteMilestone: (income: Income, milestoneId: string) => void;
  onRequestDelete: (income: Income) => void;
  onOpenCreator: () => void;
  onOpenDetail: (id: string) => void;
}

function ActionCardsView({
  cells,
  incomes,
  monthlyTotals,
  peakTotal,
  hoverIndex,
  onHover,
  onAmountChange,
  onNameChange,
  onStartDateChange,
  onEndDateChange,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
  onRequestDelete,
  onOpenCreator,
  onOpenDetail,
}: ActionCardsViewProps) {
  const totals = monthlyTotals as Array<{
    cell: MonthCell;
    breakdown: Array<{ income: Income; amount: number }>;
    total: number;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-5 w-5 text-brand-jungle" />
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Projected Income River
        </h2>
      </div>

      <div className="relative rounded-2xl border border-border/30 bg-card p-6 shadow-sm">
        <RiverChart cells={cells} totals={totals} peakTotal={peakTotal} hoverIndex={hoverIndex} />
        <MonthAxis cells={cells} hoverIndex={hoverIndex} onHover={onHover} totals={totals} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {incomes.map((income) => (
          <SentenceCard
            key={income.id}
            income={income}
            onAmountChange={onAmountChange}
            onNameChange={onNameChange}
            onStartDateChange={onStartDateChange}
            onEndDateChange={onEndDateChange}
            onAddMilestone={onAddMilestone}
            onEditMilestone={onEditMilestone}
            onDeleteMilestone={onDeleteMilestone}
            onRequestDelete={onRequestDelete}
            onOpenDetail={onOpenDetail}
          />
        ))}
        <button
          type="button"
          onClick={onOpenCreator}
          className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/40 bg-transparent text-sm font-medium text-muted-foreground hover:border-brand-terracotta/60 hover:bg-brand-terracotta/5 hover:text-brand-terracotta transition-colors"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Plus className="h-5 w-5" />
          </span>
          New Income Rule
        </button>
      </div>
    </div>
  );
}

interface SentenceCardProps {
  income: Income;
  onAmountChange: (income: Income, amount: number) => void;
  onNameChange: (income: Income, name: string) => void;
  onStartDateChange: (income: Income, next: Date) => void;
  onEndDateChange: (income: Income, next: Date | null) => void;
  onAddMilestone: (income: Income) => void;
  onEditMilestone: (income: Income, milestone: FutureMilestone) => void;
  onDeleteMilestone: (income: Income, milestoneId: string) => void;
  onRequestDelete: (income: Income) => void;
  onOpenDetail: (id: string) => void;
}

function SentenceCard({
  income,
  onAmountChange,
  onNameChange,
  onStartDateChange,
  onEndDateChange,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
  onRequestDelete,
  onOpenDetail,
}: SentenceCardProps) {
  const archetype = getArchetype(income);
  const meta = ARCHETYPE_META[archetype];
  const Icon = meta.icon;

  const amount = Number(income.amount) || 0;
  const startDate = parseISO(income.startDate);
  const endDate = income.endDate ? parseISO(income.endDate) : null;
  const milestones = income.accountForFutureChange
    ? safeParseMilestones(income.futureMilestones)
    : [];
  const firstMilestone = milestones[0];

  const pillCls = meta.pill;

  const AmountPill = ({ value, onConfirm }: { value: number; onConfirm: (n: number) => void }) => (
    <EditablePill
      ariaLabel={`Adjust amount, currently ${formatCurrency(value)}`}
      className={pillCls}
      renderEditor={(close) => (
        <QuickAdjustPad
          initialAmount={value}
          onConfirm={(n) => {
            onConfirm(n);
            close();
          }}
          onCancel={close}
        />
      )}
    >
      {formatCurrency(value)}
    </EditablePill>
  );

  const DatePill = ({
    value,
    onPick,
    onClear,
    label,
  }: {
    value: Date;
    onPick: (d: Date) => void;
    onClear?: () => void;
    label: string;
  }) => (
    <EditablePill
      ariaLabel={label}
      className={pillCls}
      renderEditor={(close) => (
        <DatePillEditor
          initial={value}
          onCommit={(d) => {
            onPick(d);
            close();
          }}
          onClear={
            onClear
              ? () => {
                  onClear();
                  close();
                }
              : undefined
          }
        />
      )}
    >
      {formatPillDate(value)}
    </EditablePill>
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-card p-5 shadow-sm">
      <div className={cn("absolute inset-y-0 left-0 w-1", meta.rail)} />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span
            className={cn(
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border",
              meta.pill
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="flex-1 min-w-0">
            <EditablePill
              ariaLabel={`Edit name, currently ${income.name}`}
              className="border-transparent bg-transparent px-1 py-0 font-display text-base font-semibold text-foreground hover:bg-muted/60 hover:border-border/40"
              renderEditor={(close) => (
                <TextPillEditor
                  initial={income.name}
                  placeholder="Income name"
                  onCommit={(next) => {
                    onNameChange(income, next);
                    close();
                  }}
                  onCancel={close}
                />
              )}
            >
              {income.name}
            </EditablePill>
            {income.familyMember && (
              <p className="mt-0.5 text-xs text-muted-foreground pl-1">
                {income.familyMember.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOpenDetail(income.id)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Open details for ${income.name}`}
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onRequestDelete(income)}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Delete ${income.name}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-4 pl-2 text-[15px] leading-relaxed text-foreground/85">
        {archetype === "one-off" ? (
          <>
            I will receive <AmountPill value={amount} onConfirm={(n) => onAmountChange(income, n)} />{" "}
            once in{" "}
            <DatePill
              value={startDate}
              onPick={(d) => onStartDateChange(income, d)}
              label="Edit payment month"
            />
            .
          </>
        ) : archetype === "temporary" && endDate ? (
          <>
            I earn <AmountPill value={amount} onConfirm={(n) => onAmountChange(income, n)} /> from{" "}
            <DatePill
              value={startDate}
              onPick={(d) => onStartDateChange(income, d)}
              label="Edit start month"
            />{" "}
            until{" "}
            <DatePill
              value={endDate}
              onPick={(d) => onEndDateChange(income, d)}
              onClear={() => onEndDateChange(income, null)}
              label="Edit end month"
            />
            .
          </>
        ) : (
          <>
            I earn <AmountPill value={amount} onConfirm={(n) => onAmountChange(income, n)} />{" "}
            continuously starting from{" "}
            <DatePill
              value={startDate}
              onPick={(d) => onStartDateChange(income, d)}
              label="Edit start month"
            />
            .
          </>
        )}
      </p>

      {firstMilestone && (
        <div className="mt-3 ml-2 flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-muted/60 px-3 py-2">
          <p className="text-sm text-foreground/85 flex-1">
            <TrendingUp className="inline h-3.5 w-3.5 text-muted-foreground -mt-0.5 mr-1" />
            Then, it changes to{" "}
            <button
              type="button"
              onClick={() => onEditMilestone(income, firstMilestone)}
              className={cn(
                "mx-0.5 inline-flex items-center rounded-md border px-2 py-0.5 font-display text-sm font-semibold transition-all hover:shadow-sm hover:scale-[1.02]",
                pillCls
              )}
            >
              {formatCurrency(firstMilestone.amount)}
            </button>{" "}
            starting in{" "}
            <button
              type="button"
              onClick={() => onEditMilestone(income, firstMilestone)}
              className={cn(
                "mx-0.5 inline-flex items-center rounded-md border px-2 py-0.5 font-display text-sm font-semibold transition-all hover:shadow-sm hover:scale-[1.02]",
                pillCls
              )}
            >
              {format(parseISO(firstMilestone.targetMonth + "-01"), "MMM yy")}
            </button>
            .
          </p>
          <button
            type="button"
            onClick={() => onDeleteMilestone(income, firstMilestone.id)}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
            aria-label="Remove future change"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {archetype === "recurring" && (
        <button
          type="button"
          onClick={() => onAddMilestone(income)}
          className="mt-4 ml-2 inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-brand-jungle/50 hover:bg-brand-jungle/5 hover:text-brand-jungle transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Future Change
        </button>
      )}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/40 bg-card p-12 text-center shadow-sm">
      <p className="font-display text-lg font-semibold text-foreground">
        No income streams yet
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Add your first income to start projecting your monthly balance.
      </p>
      <Button
        type="button"
        onClick={onCreate}
        className="mt-6 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Add Income
      </Button>
    </div>
  );
}

function BetaFooter({
  familyMembers,
  incomeCount,
}: {
  familyMembers: FamilyMember[];
  incomeCount: number;
}) {
  return (
    <div className="rounded-xl border border-border/30 bg-muted/40 p-4 text-xs text-muted-foreground">
      <p className="font-semibold uppercase tracking-[0.18em] text-foreground/70">
        Beta preview · live editing
      </p>
      <p className="mt-1">
        Showing {incomeCount} active income stream{incomeCount === 1 ? "" : "s"} across{" "}
        {familyMembers.length} family member{familyMembers.length === 1 ? "" : "s"}. Click any
        amount, name, or date to edit. Changes save to the same data the Standard View uses.
      </p>
    </div>
  );
}
