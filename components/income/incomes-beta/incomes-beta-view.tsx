"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Infinity as InfinityIcon,
  Target,
  Clock,
  Plus,
  TrendingUp,
  X,
  Settings2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  LocateFixed,
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

const MOBILE_TIMELINE_MONTHS = 8;
const MOBILE_TIMELINE_START_OFFSET = -2;
const MOBILE_HEADER_PX = 100;
const DESKTOP_HEADER_PX = 180;
const MOBILE_BREAKPOINT_PX = 640;

interface TimelineConfig {
  monthCount: number;
  startOffset: number;
  headerPx: number;
  isMobile: boolean;
}

function useTimelineConfig(): TimelineConfig {
  const [config, setConfig] = useState<TimelineConfig>({
    monthCount: TIMELINE_MONTHS,
    startOffset: TIMELINE_START_OFFSET,
    headerPx: DESKTOP_HEADER_PX,
    isMobile: false,
  });

  useEffect(() => {
    const apply = () => {
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT_PX;
      setConfig({
        monthCount: isMobile ? MOBILE_TIMELINE_MONTHS : TIMELINE_MONTHS,
        startOffset: isMobile ? MOBILE_TIMELINE_START_OFFSET : TIMELINE_START_OFFSET,
        headerPx: isMobile ? MOBILE_HEADER_PX : DESKTOP_HEADER_PX,
        isMobile,
      });
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  return config;
}

// Soft fade at the left/right edges of each timeline viewport so bars and
// the river chart slide in/out of view smoothly instead of hard-clipping
// against the container edge.
const TIMELINE_EDGE_FADE =
  "linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)";
const EDGE_FADE_STYLE: React.CSSProperties = {
  maskImage: TIMELINE_EDGE_FADE,
  WebkitMaskImage: TIMELINE_EDGE_FADE,
};

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

function buildMonthCells(
  windowOffsetMonths: number = 0,
  monthCount: number = TIMELINE_MONTHS,
  startOffset: number = TIMELINE_START_OFFSET
): MonthCell[] {
  const base = startOfMonth(new Date());
  return Array.from({ length: monthCount }, (_, i) => {
    const date = addMonths(base, startOffset + windowOffsetMonths + i);
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

  // Live preview while dragging a bar — applies a patch to one income so the
  // chart and bars update together without spamming the server. Cleared on
  // pointerup; the actual mutate happens then.
  const [dragPreview, setDragPreview] = useState<
    { id: string; patch: Partial<Income> } | null
  >(null);

  const effectiveIncomes = useMemo(() => {
    if (!dragPreview) return incomes;
    return incomes.map((i) =>
      i.id === dragPreview.id ? ({ ...i, ...dragPreview.patch } as Income) : i
    );
  }, [incomes, dragPreview]);

  // Responsive timeline window — narrower on mobile so each month is readable.
  const tlConfig = useTimelineConfig();

  // Timeline scroll state — fractional months shifted from the default window.
  // Integer part drives cell construction; fractional part drives a CSS
  // translateX so the view glides between month boundaries.
  const [windowOffset, setWindowOffset] = useState(0);
  const windowOffsetMonths = Math.floor(windowOffset);
  const subMonthFraction = windowOffset - windowOffsetMonths;

  // Modal/drawer state
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [detailIncomeId, setDetailIncomeId] = useState<string | null>(null);
  const [futureChangeContext, setFutureChangeContext] = useState<{
    incomeId: string;
    milestone?: FutureMilestone;
  } | null>(null);
  const [deleteContext, setDeleteContext] = useState<Income | null>(null);

  const detailIncome = detailIncomeId
    ? effectiveIncomes.find((i) => i.id === detailIncomeId) ?? null
    : null;
  const futureChangeIncome = futureChangeContext
    ? effectiveIncomes.find((i) => i.id === futureChangeContext.incomeId) ?? null
    : null;

  const cells = useMemo(
    () => buildMonthCells(windowOffsetMonths, tlConfig.monthCount, tlConfig.startOffset),
    [windowOffsetMonths, tlConfig.monthCount, tlConfig.startOffset]
  );

  // RAF-driven animation for button-triggered jumps. Wheel scrolling does NOT
  // use this — wheel events already provide their own continuous motion.
  const animationRef = useRef<number | null>(null);
  const animateTo = (target: number) => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
    const start = performance.now();
    setWindowOffset((startOffset) => {
      const from = startOffset;
      const distance = target - from;
      const duration = Math.min(550, 220 + Math.abs(distance) * 28);
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - t, 3);
        setWindowOffset(from + distance * eased);
        if (t < 1) {
          animationRef.current = requestAnimationFrame(tick);
        } else {
          animationRef.current = null;
        }
      };
      animationRef.current = requestAnimationFrame(tick);
      return startOffset;
    });
  };

  const scrollPrev = () => animateTo(Math.round(windowOffset) - 6);
  const scrollNext = () => animateTo(Math.round(windowOffset) + 6);
  const scrollToToday = () => animateTo(0);
  const shiftWindowMonths = (delta: number) => {
    // Cancel any running button animation when the user touches the trackpad.
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setWindowOffset((o) => o + delta);
  };

  const monthlyTotals = useMemo(() => {
    return cells.map((cell) => {
      const breakdown = effectiveIncomes.map((income) => ({
        income,
        amount: getAmountForMonth(income, cell),
      }));
      const total = breakdown.reduce((sum, b) => sum + b.amount, 0);
      return { cell, breakdown: breakdown.filter((b) => b.amount > 0), total };
    });
  }, [cells, effectiveIncomes]);

  const peakTotal = useMemo(
    () => monthlyTotals.reduce((max, m) => Math.max(max, m.total), 0),
    [monthlyTotals]
  );

  // ─── handlers (useCallback so React.memo'd children don't re-render) ──────

  const handleAmountChange = useCallback((income: Income, nextAmount: number) => {
    mutate(
      { kind: "update", id: income.id, patch: { amount: nextAmount.toString() } },
      () => updateIncome(income.id, { amount: nextAmount })
    );
  }, [mutate]);

  const handleNameChange = useCallback((income: Income, name: string) => {
    mutate(
      { kind: "update", id: income.id, patch: { name } },
      () => updateIncome(income.id, { name })
    );
  }, [mutate]);

  const handleStartDateChange = useCallback((income: Income, next: Date) => {
    const iso = format(startOfMonth(next), "yyyy-MM-dd");
    mutate(
      { kind: "update", id: income.id, patch: { startDate: iso } },
      () => updateIncome(income.id, { startDate: iso })
    );
  }, [mutate]);

  const handleEndDateChange = useCallback((income: Income, next: Date | null) => {
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
  }, [mutate]);

  // Bar drag commit handlers — fired on pointerup, after the live preview
  // has already shown the user where the bar is moving. Each shifts dates
  // (and milestones, where appropriate) by integer-month deltas.
  const handleMoveBar = useCallback(
    (income: Income, deltaMonths: number) => {
      if (deltaMonths === 0) return;
      const newStart = format(
        addMonths(parseISO(income.startDate), deltaMonths),
        "yyyy-MM-dd"
      );
      const newEnd = income.endDate
        ? format(addMonths(parseISO(income.endDate), deltaMonths), "yyyy-MM-dd")
        : null;
      // Shift any milestone targetMonths by the same delta
      const milestones = safeParseMilestones(income.futureMilestones);
      const shifted = milestones.map((m) => ({
        ...m,
        targetMonth: format(
          addMonths(parseISO(`${m.targetMonth}-01`), deltaMonths),
          "yyyy-MM"
        ),
      }));
      const newMilestonesJson = shifted.length > 0 ? JSON.stringify(shifted) : null;
      mutate(
        {
          kind: "update",
          id: income.id,
          patch: {
            startDate: newStart,
            endDate: newEnd,
            futureMilestones: newMilestonesJson,
          },
        },
        () =>
          updateIncome(income.id, {
            startDate: newStart,
            endDate: newEnd,
            futureMilestones: newMilestonesJson,
          })
      );
    },
    [mutate]
  );

  const handleResizeStart = useCallback(
    (income: Income, deltaMonths: number) => {
      if (deltaMonths === 0) return;
      let newStart = addMonths(parseISO(income.startDate), deltaMonths);
      // Don't let the new start cross the end date.
      if (income.endDate) {
        const end = parseISO(income.endDate);
        if (newStart >= end) newStart = end;
      }
      const iso = format(newStart, "yyyy-MM-dd");
      mutate(
        { kind: "update", id: income.id, patch: { startDate: iso } },
        () => updateIncome(income.id, { startDate: iso })
      );
    },
    [mutate]
  );

  const handleResizeEnd = useCallback(
    (income: Income, deltaMonths: number) => {
      if (deltaMonths === 0) return;
      const baseEnd = income.endDate
        ? parseISO(income.endDate)
        : parseISO(income.startDate);
      let newEnd = addMonths(baseEnd, deltaMonths);
      const start = parseISO(income.startDate);
      if (newEnd < start) newEnd = start;
      const iso = format(newEnd, "yyyy-MM-dd");
      mutate(
        { kind: "update", id: income.id, patch: { endDate: iso } },
        () => updateIncome(income.id, { endDate: iso })
      );
    },
    [mutate]
  );

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
          incomes={effectiveIncomes}
          monthlyTotals={monthlyTotals}
          peakTotal={peakTotal}
          hoverIndex={hoverIndex}
          onHover={setHoverIndex}
          windowOffsetMonths={windowOffsetMonths}
          subMonthFraction={subMonthFraction}
          tlConfig={tlConfig}
          onScrollPrev={scrollPrev}
          onScrollNext={scrollNext}
          onScrollToToday={scrollToToday}
          onShiftWindow={shiftWindowMonths}
          onAmountChange={handleAmountChange}
          onRequestDelete={setDeleteContext}
          onOpenCreator={() => setCreatorOpen(true)}
          onOpenDetail={setDetailIncomeId}
          onDragPreview={setDragPreview}
          onMoveBar={handleMoveBar}
          onResizeStart={handleResizeStart}
          onResizeEnd={handleResizeEnd}
        />
      ) : (
        <ActionCardsView
          cells={cells}
          incomes={effectiveIncomes}
          monthlyTotals={monthlyTotals}
          peakTotal={peakTotal}
          hoverIndex={hoverIndex}
          onHover={setHoverIndex}
          windowOffsetMonths={windowOffsetMonths}
          subMonthFraction={subMonthFraction}
          tlConfig={tlConfig}
          onScrollPrev={scrollPrev}
          onScrollNext={scrollNext}
          onScrollToToday={scrollToToday}
          onShiftWindow={shiftWindowMonths}
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

/**
 * Trackpad-friendly horizontal wheel-scroll hook.
 *
 * Wheel events fire at ~120Hz on Mac trackpads — running React renders on
 * each one wastes work, since the screen repaints at 60Hz at most. We
 * accumulate horizontal deltas and flush them once per animation frame.
 * Only intercepts events where horizontal intent dominates vertical, so
 * vertical page scrolling still works. Uses a non-passive listener so
 * preventDefault works.
 */
function useHorizontalWheelScroll(
  ref: React.RefObject<HTMLElement | null>,
  onShiftMonths: (deltaMonths: number) => void,
  headerPx: number = 180,
  monthCount: number = TIMELINE_MONTHS
) {
  const onShiftRef = useRef(onShiftMonths);
  onShiftRef.current = onShiftMonths;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let pendingDelta = 0;
    let rafId: number | null = null;

    const flush = () => {
      rafId = null;
      const d = pendingDelta;
      pendingDelta = 0;
      if (d !== 0) onShiftRef.current(d);
    };

    const handler = (e: WheelEvent) => {
      const ax = Math.abs(e.deltaX);
      const ay = Math.abs(e.deltaY);
      // Trackpad horizontal swipe → deltaX dominant.
      // Mouse-wheel + Shift → deltaY dominant but treated as horizontal.
      const useDelta =
        ax > ay ? e.deltaX : e.shiftKey && ay > 0 ? e.deltaY : 0;
      if (useDelta === 0) return;
      e.preventDefault();
      const monthWidthPx = Math.max(
        1,
        (el.clientWidth - headerPx) / monthCount
      );
      pendingDelta += useDelta / monthWidthPx;
      if (rafId === null) {
        rafId = requestAnimationFrame(flush);
      }
    };

    el.addEventListener("wheel", handler, { passive: false });
    return () => {
      el.removeEventListener("wheel", handler);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [ref, headerPx, monthCount]);
}

function TimelineHeader({
  cells,
  windowOffsetMonths,
  onScrollPrev,
  onScrollNext,
  onScrollToToday,
}: {
  cells: MonthCell[];
  windowOffsetMonths: number;
  onScrollPrev: () => void;
  onScrollNext: () => void;
  onScrollToToday: () => void;
}) {
  const first = cells[0];
  const last = cells[cells.length - 1];
  const rangeLabel = first && last ? `${format(first.date, "MMM yy")} – ${format(last.date, "MMM yy")}` : "";
  const atToday = windowOffsetMonths === 0;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-5 w-5 text-brand-jungle" />
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Projected Income River
        </h2>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-block min-w-[140px] text-right font-display text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {rangeLabel}
        </span>
        <div className="inline-flex items-center rounded-full border border-border/40 bg-card p-0.5 shadow-sm">
          <button
            type="button"
            onClick={onScrollPrev}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Scroll timeline 6 months earlier"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onScrollToToday}
            disabled={atToday}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 h-7 text-[11px] font-semibold uppercase tracking-wider transition-colors",
              atToday
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "text-brand-terracotta hover:bg-brand-terracotta/10"
            )}
            aria-label="Reset timeline to today"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            Today
          </button>
          <button
            type="button"
            onClick={onScrollNext}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Scroll timeline 6 months later"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
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
  windowOffsetMonths,
  subMonthFraction,
  tlConfig,
  onScrollPrev,
  onScrollNext,
  onScrollToToday,
  onShiftWindow,
  onAmountChange,
  onRequestDelete,
  onOpenCreator,
  onOpenDetail,
  onDragPreview,
  onMoveBar,
  onResizeStart,
  onResizeEnd,
}: {
  cells: MonthCell[];
  incomes: Income[];
  monthlyTotals: ReturnType<typeof Object>;
  peakTotal: number;
  hoverIndex: number | null;
  onHover: (i: number | null) => void;
  windowOffsetMonths: number;
  subMonthFraction: number;
  tlConfig: TimelineConfig;
  onScrollPrev: () => void;
  onScrollNext: () => void;
  onScrollToToday: () => void;
  onShiftWindow: (delta: number) => void;
  onAmountChange: (income: Income, amount: number) => void;
  onRequestDelete: (income: Income) => void;
  onOpenCreator: () => void;
  onOpenDetail: (id: string) => void;
  onDragPreview: (preview: { id: string; patch: Partial<Income> } | null) => void;
  onMoveBar: (income: Income, deltaMonths: number) => void;
  onResizeStart: (income: Income, deltaMonths: number) => void;
  onResizeEnd: (income: Income, deltaMonths: number) => void;
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

  const dawRef = useRef<HTMLDivElement | null>(null);
  useHorizontalWheelScroll(dawRef, onShiftWindow, tlConfig.headerPx, tlConfig.monthCount);

  // CSS variable used by every translated child (river chart, month axis,
  // gridlines/now overlay, each lane's bars area). Expressed as a percentage
  // of the child's own width — each child fills the 1fr right column.
  const translatePct = -(subMonthFraction / cells.length) * 100;
  const tsStyle = {
    "--ts-x": `${translatePct}%`,
    "--ts-header-px": `${tlConfig.headerPx}px`,
  } as React.CSSProperties;
  const gridColsStyle = {
    gridTemplateColumns: `${tlConfig.headerPx}px 1fr`,
  } as React.CSSProperties;
  const cellGridStyle = {
    gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))`,
  } as React.CSSProperties;

  return (
    <div className="space-y-4">
      <TimelineHeader
        cells={cells}
        windowOffsetMonths={windowOffsetMonths}
        onScrollPrev={onScrollPrev}
        onScrollNext={onScrollNext}
        onScrollToToday={onScrollToToday}
      />

      <div className="relative">
      <div
        ref={dawRef}
        style={tsStyle}
        className="rounded-2xl border border-border/30 bg-card shadow-sm overflow-hidden overscroll-x-contain"
      >
        {/* Master river chart */}
        <div
          className="px-3 pt-4 pb-2 grid gap-0 sm:px-6 sm:pt-6"
          style={gridColsStyle}
        >
          <div className="flex items-end pb-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Master
            </span>
          </div>
          <div className="overflow-hidden" style={EDGE_FADE_STYLE}>
            <div
              className="will-change-transform"
              style={{ transform: "translateX(var(--ts-x, 0))" }}
            >
              <RiverChart
                cells={cells}
                totals={totals}
                peakTotal={peakTotal}
                hoverIndex={hoverIndex}
                incomes={incomes}
                isMobile={tlConfig.isMobile}
              />
            </div>
          </div>
        </div>

        {/* Month axis — aligned with the timeline grid below */}
        <div
          className="grid gap-0 border-b border-border/30"
          style={gridColsStyle}
        >
          <div className="border-r border-border/30" />
          <div className="overflow-hidden" style={EDGE_FADE_STYLE}>
            <div
              className="px-0 will-change-transform"
              style={{ transform: "translateX(var(--ts-x, 0))" }}
            >
              <MonthAxis
                cells={cells}
                hoverIndex={hoverIndex}
                onHover={onHover}
                totals={totals}
              />
            </div>
          </div>
        </div>

        {/* Track lanes — DAW-style stacked tracks sharing one continuous timeline */}
        <div className="relative">
          {/* Overlay viewport — clips translated content and applies edge fade */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 overflow-hidden"
            style={{ left: `${tlConfig.headerPx}px`, ...EDGE_FADE_STYLE }}
          >
            <div
              className="absolute inset-0 will-change-transform"
              style={{ transform: "translateX(var(--ts-x, 0))" }}
            >
              {/* Vertical month gridlines spanning every track */}
              <div
                className="absolute inset-0 grid"
                style={cellGridStyle}
              >
                {cells.map((cell) => (
                  <div
                    key={cell.key}
                    className="border-l border-border/15 first:border-l-0"
                  />
                ))}
              </div>
              {/* Now playhead line (chip lives in a separate overlay so it's not clipped) */}
              {nowLeftPct !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-brand-terracotta/50 z-10"
                  style={{ left: `${nowLeftPct * 100}%` }}
                />
              )}
            </div>
          </div>

          {/* Now chip overlay — sibling of the gridlines overlay so it can
              extend above the lanes wrapper without being clipped. Uses the
              same --ts-x translate so the chip stays anchored to the line. */}
          {nowLeftPct !== null && (
            <div
              className="pointer-events-none absolute right-0 z-20 overflow-hidden"
              style={{
                left: `${tlConfig.headerPx}px`,
                top: "-12px",
                height: "26px",
                ...EDGE_FADE_STYLE,
              }}
            >
              <div
                className="absolute inset-0 will-change-transform"
                style={{ transform: "translateX(var(--ts-x, 0))" }}
              >
                <span
                  className="absolute top-1 -translate-x-1/2 rounded-sm bg-brand-terracotta px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white shadow-sm"
                  style={{ left: `${nowLeftPct * 100}%` }}
                >
                  Now
                </span>
              </div>
            </div>
          )}

          {sortedIncomes.map((income, i) => (
            <IncomeStreamRow
              key={income.id}
              income={income}
              cells={cells}
              isFirst={i === 0}
              alternate={i % 2 === 1}
              tlConfig={tlConfig}
              onAmountChange={onAmountChange}
              onRequestDelete={onRequestDelete}
              onOpenDetail={onOpenDetail}
              onDragPreview={onDragPreview}
              onMoveBar={onMoveBar}
              onResizeStart={onResizeStart}
              onResizeEnd={onResizeEnd}
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

      {/* Tooltip overlay — sibling of the DAW so it's not clipped by the
          DAW's overflow-hidden. Translates with --ts-x to track the
          hovered column. */}
      {hoverIndex !== null && totals[hoverIndex] && (
        <div
          className="pointer-events-none absolute z-30"
          style={{ left: `${tlConfig.headerPx}px`, right: 0, top: 0, bottom: 0 }}
        >
          <div
            className="absolute inset-0 will-change-transform"
            style={{ transform: "translateX(var(--ts-x, 0))" }}
          >
            <HoverTooltip
              index={hoverIndex}
              cell={cells[hoverIndex]}
              breakdown={totals[hoverIndex].breakdown}
              total={totals[hoverIndex].total}
              totalCount={cells.length}
            />
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

const RIVER_BUFFER_MONTHS = 3;

/**
 * Monotone cubic spline (Fritsch-Carlson) — same curve type Recharts uses
 * with `type="monotone"`. Produces smooth curves through the points without
 * overshoot, so flat segments stay flat and step transitions ease in/out.
 */
function buildMonotonePath(points: Array<{ x: number; y: number }>): string {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M ${points[0].x} ${points[0].y}`;

  // Secant slopes
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    m.push(dx === 0 ? 0 : dy / dx);
  }

  // Tangents (Fritsch-Carlson)
  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      t[i] = 0;
    } else {
      t[i] = (m[i - 1] + m[i]) / 2;
    }
  }
  // Enforce monotonicity
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
    } else {
      const alpha = t[i] / m[i];
      const beta = t[i + 1] / m[i];
      const sum = alpha * alpha + beta * beta;
      if (sum > 9) {
        const tau = 3 / Math.sqrt(sum);
        t[i] = tau * alpha * m[i];
        t[i + 1] = tau * beta * m[i];
      }
    }
  }

  // Cubic Bezier segments
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const cp1x = points[i].x + dx / 3;
    const cp1y = points[i].y + (t[i] * dx) / 3;
    const cp2x = points[i + 1].x - dx / 3;
    const cp2y = points[i + 1].y - (t[i + 1] * dx) / 3;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i + 1].x} ${points[i + 1].y}`;
  }
  return d;
}

interface RiverChartProps {
  cells: MonthCell[];
  totals: Array<{ cell: MonthCell; total: number; breakdown: Array<{ income: Income; amount: number }> }>;
  peakTotal: number;
  hoverIndex: number | null;
  incomes: Income[];
  isMobile?: boolean;
}

const RiverChart = memo(function RiverChart({
  cells,
  totals,
  peakTotal,
  hoverIndex,
  incomes,
  isMobile = false,
}: RiverChartProps) {
  const width = 1080;
  const height = 160;
  const stepX = width / Math.max(1, cells.length - 1);

  const yFor = (val: number) => {
    if (peakTotal <= 0) return height - 4;
    return height - 4 - (val / peakTotal) * (height - 24);
  };

  // Extend the path with buffer months on each side so the visible portion
  // never reaches a hard endpoint as the timeline scrolls. The SVG sets
  // overflow:visible so the buffer renders beyond the viewBox; the parent's
  // overflow-hidden + edge-fade mask handles the actual visual cropping.
  const buffer = RIVER_BUFFER_MONTHS;
  const extendedTotals = useMemo(() => {
    if (cells.length === 0) return [] as Array<{ x: number; y: number }>;
    const beforeCells = Array.from({ length: buffer }, (_, k) => {
      const d = addMonths(cells[0].date, -(buffer - k));
      return {
        date: d,
        key: format(d, "yyyy-MM"),
        label: format(d, "MMM"),
        yearLabel: format(d, "yy"),
      } satisfies MonthCell;
    });
    const afterCells = Array.from({ length: buffer }, (_, k) => {
      const d = addMonths(cells[cells.length - 1].date, k + 1);
      return {
        date: d,
        key: format(d, "yyyy-MM"),
        label: format(d, "MMM"),
        yearLabel: format(d, "yy"),
      } satisfies MonthCell;
    });
    const allCells = [...beforeCells, ...cells, ...afterCells];
    return allCells.map((c, idx) => {
      const isVisible = idx >= buffer && idx < buffer + cells.length;
      const total = isVisible
        ? totals[idx - buffer].total
        : incomes.reduce((sum, inc) => sum + getAmountForMonth(inc, c), 0);
      const x = (idx - buffer) * stepX;
      return { x, y: yFor(total) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, totals, peakTotal, incomes]);

  if (extendedTotals.length === 0) return null;

  const path = buildMonotonePath(extendedTotals);
  const fillStartX = extendedTotals[0].x;
  const fillEndX = extendedTotals[extendedTotals.length - 1].x;
  const fill = `${path} L ${fillEndX} ${height} L ${fillStartX} ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ overflow: "visible" }}
      className={cn("w-full", isMobile ? "h-20" : "h-40")}
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
});

interface MonthAxisProps {
  cells: MonthCell[];
  hoverIndex: number | null;
  onHover: (i: number | null) => void;
  totals: Array<{ cell: MonthCell; total: number; breakdown: Array<{ income: Income; amount: number }> }>;
}

const MonthAxis = memo(function MonthAxis({
  cells,
  hoverIndex,
  onHover,
  totals,
}: MonthAxisProps) {
  return (
    <div className="relative mt-2">
      <div
        className="grid gap-px text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
        style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
      >
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
    </div>
  );
});

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
  // Center the tooltip on the hovered column. At the edges, snap to the
  // visible side so the card doesn't get clipped by the rack edge.
  const centerPct = ((index + 0.5) / totalCount) * 100;
  const align =
    centerPct < 15
      ? "translate-x-0"
      : centerPct > 85
        ? "-translate-x-full"
        : "-translate-x-1/2";

  return (
    <div
      className={cn(
        "absolute z-30 w-56 rounded-xl border border-border/40 bg-popover text-popover-foreground px-4 py-3 shadow-xl pointer-events-none",
        align
      )}
      style={{ left: `${centerPct}%`, top: "12px" }}
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

interface IncomeStreamRowProps {
  income: Income;
  cells: MonthCell[];
  isFirst?: boolean;
  alternate?: boolean;
  tlConfig: TimelineConfig;
  onAmountChange: (income: Income, amount: number) => void;
  onRequestDelete: (income: Income) => void;
  onOpenDetail: (id: string) => void;
  onDragPreview: (preview: { id: string; patch: Partial<Income> } | null) => void;
  onMoveBar: (income: Income, deltaMonths: number) => void;
  onResizeStart: (income: Income, deltaMonths: number) => void;
  onResizeEnd: (income: Income, deltaMonths: number) => void;
}

type BarDragKind = "move" | "resize-left" | "resize-right";

interface BarDragState {
  kind: BarDragKind;
  startPointerX: number;
  startStart: Date;
  startEnd: Date | null;
  monthWidthPx: number;
  hasMoved: boolean;
}

const IncomeStreamRow = memo(function IncomeStreamRow({
  income,
  cells,
  isFirst = false,
  alternate = false,
  tlConfig,
  onAmountChange,
  onRequestDelete,
  onOpenDetail,
  onDragPreview,
  onMoveBar,
  onResizeStart,
  onResizeEnd,
}: IncomeStreamRowProps) {
  const archetype = getArchetype(income);
  const meta = ARCHETYPE_META[archetype];
  const Icon = meta.icon;
  const segments = useMemo(() => buildBarSegments(income, cells), [income, cells]);
  const lanesAreaRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<BarDragState | null>(null);
  // Set on pointerup if drag occurred — used to suppress the synthetic click
  // event so the QuickAdjustPad popover doesn't open after a drag.
  const justDraggedRef = useRef(false);

  const computeDeltaMonths = (clientX: number) => {
    const drag = dragRef.current;
    if (!drag) return 0;
    return Math.round((clientX - drag.startPointerX) / drag.monthWidthPx);
  };

  const computePatch = (kind: BarDragKind, deltaMonths: number): Partial<Income> => {
    const drag = dragRef.current;
    if (!drag) return {};
    if (kind === "move") {
      let newStart = addMonths(drag.startStart, deltaMonths);
      let newEnd = drag.startEnd ? addMonths(drag.startEnd, deltaMonths) : null;
      return {
        startDate: format(newStart, "yyyy-MM-dd"),
        endDate: newEnd ? format(newEnd, "yyyy-MM-dd") : null,
      };
    }
    if (kind === "resize-left") {
      let newStart = addMonths(drag.startStart, deltaMonths);
      if (drag.startEnd && newStart >= drag.startEnd) newStart = drag.startEnd;
      return { startDate: format(newStart, "yyyy-MM-dd") };
    }
    // resize-right
    const baseEnd = drag.startEnd ?? drag.startStart;
    let newEnd = addMonths(baseEnd, deltaMonths);
    if (newEnd < drag.startStart) newEnd = drag.startStart;
    return { endDate: format(newEnd, "yyyy-MM-dd") };
  };

  const handlePointerDown = (e: React.PointerEvent, kind: BarDragKind) => {
    // Only primary button / single touch
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    const lane = lanesAreaRef.current;
    const monthWidthPx = lane ? lane.clientWidth / cells.length : 40;
    dragRef.current = {
      kind,
      startPointerX: e.clientX,
      startStart: parseISO(income.startDate),
      startEnd: income.endDate ? parseISO(income.endDate) : null,
      monthWidthPx,
      hasMoved: false,
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startPointerX;
    if (Math.abs(dx) > 4) drag.hasMoved = true;
    const deltaMonths = computeDeltaMonths(e.clientX);
    onDragPreview({ id: income.id, patch: computePatch(drag.kind, deltaMonths) });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startPointerX;
    const moved = Math.abs(dx) > 4;
    const deltaMonths = computeDeltaMonths(e.clientX);
    dragRef.current = null;
    onDragPreview(null);
    if (moved && deltaMonths !== 0) {
      justDraggedRef.current = true;
      if (drag.kind === "move") onMoveBar(income, deltaMonths);
      else if (drag.kind === "resize-left") onResizeStart(income, deltaMonths);
      else if (drag.kind === "resize-right") onResizeEnd(income, deltaMonths);
    }
  };

  const handlePointerCancel = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    onDragPreview(null);
  };

  // Suppress popover open when click is the tail of a drag.
  const handleClickCapture = (e: React.MouseEvent) => {
    if (justDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      justDraggedRef.current = false;
    }
  };

  return (
    <div
      style={{ gridTemplateColumns: `${tlConfig.headerPx}px 1fr` }}
      className={cn(
        "group relative grid items-stretch transition-colors",
        !isFirst && "border-t border-border/20",
        alternate ? "bg-muted/25" : "bg-transparent",
        "hover:bg-brand-jungle/[0.04]"
      )}
    >
      {/* Track header column */}
      <div className="flex flex-col justify-center gap-0.5 border-r border-border/30 px-2 py-2 min-w-0 sm:px-4 sm:py-3">
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
      <div
        ref={lanesAreaRef}
        className="relative h-14 overflow-hidden"
        style={EDGE_FADE_STYLE}
      >
        <div
          className="absolute inset-0 will-change-transform"
          style={{ transform: "translateX(var(--ts-x, 0))" }}
        >
          {segments.map((seg, i) => {
          const leftPct = (seg.startIndex / cells.length) * 100;
          const widthPct = (seg.spanCount / cells.length) * 100;
          const isLastSegment = i === segments.length - 1;
          const isFirstSegment = i === 0;
          const reachesEnd = seg.startIndex + seg.spanCount >= cells.length;
          const isOngoingTail =
            archetype === "recurring" && !income.endDate && isLastSegment && reachesEnd;
          // Resize handles only on the outermost edges of the income — the
          // first segment's left edge maps to startDate, the last segment's
          // right edge maps to endDate. Middle segment edges are milestones,
          // not yet draggable.
          const showLeftHandle = isFirstSegment;
          const showRightHandle = isLastSegment && !isOngoingTail;
          return (
            <Popover key={i}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onPointerDown={(e) => handlePointerDown(e, "move")}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                  onClickCapture={handleClickCapture}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 flex items-center justify-center px-2 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-y-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 cursor-grab active:cursor-grabbing touch-none select-none",
                    isOngoingTail ? "rounded-l-md rounded-r-none" : "rounded-md",
                    meta.bar
                  )}
                  style={{
                    left: `${leftPct}%`,
                    height: "32px",
                    ...(isOngoingTail
                      ? {
                          right: "var(--ts-x, 0)",
                          clipPath:
                            "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)",
                        }
                      : {
                          width: `${widthPct}%`,
                        }),
                  }}
                  aria-label={`Adjust ${income.name} amount, currently ${formatCurrency(seg.amount)}${isOngoingTail ? " (ongoing)" : ""}`}
                >
                  <span className={cn("truncate", isOngoingTail && "pr-3")}>
                    {formatCurrency(seg.amount)}
                  </span>

                  {showLeftHandle && (
                    <span
                      role="slider"
                      aria-label={`Drag to change ${income.name} start date`}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        handlePointerDown(e, "resize-left");
                      }}
                      onPointerMove={(e) => {
                        e.stopPropagation();
                        handlePointerMove(e);
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        handlePointerUp(e);
                      }}
                      onPointerCancel={(e) => {
                        e.stopPropagation();
                        handlePointerCancel();
                      }}
                      onClickCapture={(e) => {
                        e.stopPropagation();
                        handleClickCapture(e);
                      }}
                      className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize touch-none flex items-center justify-start"
                    >
                      <span className="ml-0.5 h-4 w-0.5 rounded-full bg-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                  )}
                  {showRightHandle && (
                    <span
                      role="slider"
                      aria-label={`Drag to change ${income.name} end date`}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        handlePointerDown(e, "resize-right");
                      }}
                      onPointerMove={(e) => {
                        e.stopPropagation();
                        handlePointerMove(e);
                      }}
                      onPointerUp={(e) => {
                        e.stopPropagation();
                        handlePointerUp(e);
                      }}
                      onPointerCancel={(e) => {
                        e.stopPropagation();
                        handlePointerCancel();
                      }}
                      onClickCapture={(e) => {
                        e.stopPropagation();
                        handleClickCapture(e);
                      }}
                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize touch-none flex items-center justify-end"
                    >
                      <span className="mr-0.5 h-4 w-0.5 rounded-full bg-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                  )}
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
    </div>
  );
});

interface ActionCardsViewProps {
  cells: MonthCell[];
  incomes: Income[];
  monthlyTotals: ReturnType<typeof Object>;
  peakTotal: number;
  hoverIndex: number | null;
  onHover: (i: number | null) => void;
  windowOffsetMonths: number;
  subMonthFraction: number;
  tlConfig: TimelineConfig;
  onScrollPrev: () => void;
  onScrollNext: () => void;
  onScrollToToday: () => void;
  onShiftWindow: (delta: number) => void;
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
  windowOffsetMonths,
  subMonthFraction,
  tlConfig,
  onScrollPrev,
  onScrollNext,
  onScrollToToday,
  onShiftWindow,
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

  const riverRef = useRef<HTMLDivElement | null>(null);
  // ActionCards river card has no fixed track-header, so use 0 for headerPx.
  useHorizontalWheelScroll(riverRef, onShiftWindow, 0, tlConfig.monthCount);

  const translatePct = -(subMonthFraction / cells.length) * 100;
  const tsStyle = {
    "--ts-x": `${translatePct}%`,
  } as React.CSSProperties;

  return (
    <div className="space-y-6">
      <TimelineHeader
        cells={cells}
        windowOffsetMonths={windowOffsetMonths}
        onScrollPrev={onScrollPrev}
        onScrollNext={onScrollNext}
        onScrollToToday={onScrollToToday}
      />

      <div
        ref={riverRef}
        style={tsStyle}
        className="relative rounded-2xl border border-border/30 bg-card p-6 shadow-sm overflow-hidden overscroll-x-contain"
      >
        <div className="overflow-hidden" style={EDGE_FADE_STYLE}>
          <div
            className="will-change-transform"
            style={{ transform: "translateX(var(--ts-x, 0))" }}
          >
            <RiverChart cells={cells} totals={totals} peakTotal={peakTotal} hoverIndex={hoverIndex} incomes={incomes} isMobile={tlConfig.isMobile} />
            <MonthAxis cells={cells} hoverIndex={hoverIndex} onHover={onHover} totals={totals} />
          </div>
        </div>
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
