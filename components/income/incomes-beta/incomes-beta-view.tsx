"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  Pencil,
} from "lucide-react";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
import {
  updateIncomeBeta as updateIncome,
  deleteIncomeBeta as deleteIncome,
  createIncomeBeta,
} from "@/lib/actions/incomes-beta";
import { useOptimisticIncomes } from "./use-optimistic-incomes";
import { IncomeBarPopup, QuickAdjustPad } from "./quick-adjust-pad";
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

type Archetype = "recurring" | "one-off" | "temporary" | "future";

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
  // Future incomes — start date hasn't arrived yet. Brand-deep-forest into
  // brand-jungle so it reads as "projected, not yet in flight" while staying
  // distinct from current (recurring).
  future: {
    label: "FUTURE",
    icon: InfinityIcon,
    tone: "text-[#1C2B2A]",
    bar: "bg-gradient-to-r from-[#1C2B2A] to-[#3A6B52]",
    pill: "bg-[#1C2B2A]/10 text-[#1C2B2A] border-[#1C2B2A]/30",
    rail: "bg-[#1C2B2A]",
  },
};

function getArchetype(income: Income): Archetype {
  if (income.incomeCategory === "one-off" || income.frequency === "one-time") {
    return "one-off";
  }
  // Future takes precedence over the end-date check so a future-recurring or
  // future-with-end income reads as "future" (deep forest), not as
  // recurring/temporary.
  if (income.incomeCategory === "future") return "future";
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

interface YearSegment {
  year: string;
  startIndex: number;
  spanCount: number;
}

// Synthetic income rows used purely as decoration behind the empty state. The
// goal is to give first-time users a glimpse of the timeline studio so they
// understand what creating their first income unlocks. Never persisted; never
// exposed via interactive surfaces (the backdrop is always pointer-events:none).
function buildPlaceholderIncomes(): Income[] {
  const today = new Date();
  const monthIso = (offset: number) =>
    format(addMonths(startOfMonth(today), offset), "yyyy-MM-dd");
  const make = (
    id: string,
    name: string,
    category: string,
    amount: number,
    startOffset: number,
    endOffset: number | null
  ): Income => ({
    id,
    userId: "_placeholder",
    name,
    category,
    incomeCategory: "current",
    amount: amount.toString(),
    frequency: "monthly",
    customMonths: null,
    subjectToCpf: false,
    accountForBonus: false,
    bonusGroups: null,
    employeeCpfContribution: null,
    employerCpfContribution: null,
    netTakeHome: null,
    cpfOrdinaryAccount: null,
    cpfSpecialAccount: null,
    cpfMedisaveAccount: null,
    description: null,
    startDate: monthIso(startOffset),
    endDate: endOffset !== null ? monthIso(endOffset) : null,
    pastIncomeHistory: null,
    futureMilestones: null,
    accountForFutureChange: false,
    isActive: true,
    familyMemberId: null,
    familyMember: null,
    createdAt: today,
    updatedAt: today,
  });
  return [
    make("_p1", "Primary salary", "salary", 5000, -3, null),
    make("_p2", "Rental income", "investment", 2200, -5, null),
    make("_p3", "Side gig", "freelance", 1500, -1, 6),
    make("_p4", "Year-end bonus", "salary", 8000, 5, 5),
  ];
}

// Synthetic income placeholder used to render an empty family-member row in
// edit mode so the user can draw their first income on the lane. The ghost
// has amount=0 (so buildBarSegments returns an empty array — nothing renders
// visually) but carries the familyMemberId so handleDrawSave wires the
// freshly-drawn income to the correct member.
function buildGhostIncome(
  familyMember: FamilyMember | null,
  todayIso: string
): Income {
  return {
    id: `__ghost_${familyMember?.id ?? "unassigned"}`,
    userId: "_ghost",
    name: "",
    category: "salary",
    incomeCategory: "past",
    amount: "0",
    frequency: "monthly",
    customMonths: null,
    subjectToCpf: false,
    accountForBonus: false,
    bonusGroups: null,
    employeeCpfContribution: null,
    employerCpfContribution: null,
    netTakeHome: null,
    cpfOrdinaryAccount: null,
    cpfSpecialAccount: null,
    cpfMedisaveAccount: null,
    description: null,
    startDate: todayIso,
    endDate: todayIso,
    pastIncomeHistory: null,
    futureMilestones: null,
    accountForFutureChange: false,
    isActive: true,
    familyMemberId: familyMember?.id ?? null,
    familyMember: familyMember
      ? {
          id: familyMember.id,
          name: familyMember.name,
          relationship: familyMember.relationship,
          dateOfBirth: familyMember.dateOfBirth ?? null,
          isContributing: familyMember.isContributing ?? null,
        }
      : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Pack a family member's incomes into rows ("tracks"). Two ideas in play:
//
//   1. Main track. The current/recurring income anchors track 0. Any other
//      income that doesn't overlap it joins the same row (so e.g. a Past
//      Salary that ended before the Current Salary started lands on the
//      main track instead of starting a parallel row). This matches the
//      product spec: "the main track is where the current income bar
//      exists; any other bar that doesn't overlap shares that row."
//
//   2. First-fit packing for the rest. Anything that overlaps an existing
//      track tries the next track; if none fits, a new track opens. The
//      check is full-interval overlap (not just the last item's end) so
//      that incomes preceding the recurring anchor on the main track are
//      handled correctly.
//
// If there's no recurring income, we fall back to chronological first-fit
// across the whole set — equivalent to the prior implementation.
function packIntoTracks(incomes: Income[]): Income[][] {
  if (incomes.length === 0) return [];
  const recurring = incomes.find((i) => getArchetype(i) === "recurring");
  const tracks: Income[][] = [];
  if (recurring) tracks.push([recurring]);
  const remaining = incomes
    .filter((i) => i !== recurring)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const overlaps = (a: Income, b: Income) => {
    const aStart = a.startDate;
    const aEnd = a.endDate ?? "9999-99-99";
    const bStart = b.startDate;
    const bEnd = b.endDate ?? "9999-99-99";
    return aStart <= bEnd && bStart <= aEnd;
  };
  for (const inc of remaining) {
    let placed = false;
    for (const track of tracks) {
      if (track.every((t) => !overlaps(t, inc))) {
        track.push(inc);
        placed = true;
        break;
      }
    }
    if (!placed) tracks.push([inc]);
  }
  // Stable visual ordering: sort each track left-to-right by start date so
  // bars render predictably regardless of which one anchored the track.
  return tracks.map((track) =>
    [...track].sort((a, b) => a.startDate.localeCompare(b.startDate))
  );
}

// Group consecutive cells by calendar year so the timeline header can render
// one year label per contiguous year span. With a 24-month window this is
// usually 2-3 segments.
function buildYearSegments(cells: MonthCell[]): YearSegment[] {
  const segments: YearSegment[] = [];
  let current: YearSegment | null = null;
  cells.forEach((cell, i) => {
    const year = format(cell.date, "yyyy");
    if (current && current.year === year) {
      current.spanCount += 1;
    } else {
      if (current) segments.push(current);
      current = { year, startIndex: i, spanCount: 1 };
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

// In-page draft state for Action Cards. Lives in IncomesBetaView; flows down
// to ActionCardsView, which renders a DraftSentenceCard in place of the
// dashed "+ New Income Rule" tile while a draft is active. Replaces the
// IncomeCreatorDrawer modal for the cards-view "Add Income" entry points.
type DraftIncome = {
  name: string;
  amount: string;
  archetype: "recurring" | "one-off" | "temporary";
};

export function IncomesBetaView({
  incomes: rawIncomes,
  familyMembers,
}: IncomesBetaViewProps) {
  const [view, setView] = useState<ViewMode>("cards");
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
  const baseTlConfig = useTimelineConfig();

  // User-controlled time-range slider (desktop only). 2 years (24 months)
  // through 10 years (120 months) in 1-year steps. Mobile keeps the
  // compact 8-month default — there's no room for a usable slider on a
  // small screen, and the dense bars would become illegible at 10 years.
  // Start offset stays at ~25% of the window in the past so "today" sits
  // about a quarter in from the left, matching the existing 2-year default.
  const [windowYears, setWindowYears] = useState(2);
  const tlConfig = useMemo(() => {
    if (baseTlConfig.isMobile) return baseTlConfig;
    const monthCount = windowYears * 12;
    const startOffset = -Math.floor(monthCount / 4);
    return { ...baseTlConfig, monthCount, startOffset };
  }, [baseTlConfig, windowYears]);

  // Timeline scroll state — fractional months shifted from the default window.
  // Integer part drives cell construction; fractional part drives a CSS
  // translateX so the view glides between month boundaries.
  const [windowOffset, setWindowOffset] = useState(0);
  const windowOffsetMonths = Math.floor(windowOffset);
  const subMonthFraction = windowOffset - windowOffsetMonths;

  // Modal/drawer state
  const [creatorOpen, setCreatorOpen] = useState(false);

  // Inline draft for the cards-view "Add Income" flow. Non-null while the
  // user is filling out a DraftSentenceCard on the page. Timeline view uses
  // editMode instead, so this stays null there.
  const [draftIncome, setDraftIncome] = useState<DraftIncome | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);
  const [detailIncomeId, setDetailIncomeId] = useState<string | null>(null);
  const [futureChangeContext, setFutureChangeContext] = useState<{
    incomeId: string;
    milestone?: FutureMilestone;
  } | null>(null);
  const [deleteContext, setDeleteContext] = useState<Income | null>(null);

  // Edit mode — the umbrella state for any modification of bars. When true,
  // bars accept drag/resize/click-popover, lane areas accept pointerdown to
  // draw a new bar, and the bottom-rack and empty-state "Add Income" CTAs
  // route here. When false the timeline is read-only (hover tooltips still
  // work; everything else is inert). drawState tracks an in-progress draw,
  // drawCommit is the post-pointerup popup the user fills in to save.
  //
  // Anchoring by *date key* (yyyy-MM) instead of cells-index means the
  // dashed bar stays at the same calendar month when the user scrolls the
  // timeline horizontally — the indices are recomputed from the keys against
  // whatever `cells` currently holds.
  const [editMode, setEditMode] = useState(false);
  const [drawState, setDrawState] = useState<
    | {
        rowIncomeId: string;
        anchorKey: string;
        endKey: string;
      }
    | null
  >(null);
  const [drawCommit, setDrawCommit] = useState<
    | {
        rowIncome: Income;
        startKey: string;
        endKey: string;
        // Detected via the row-relative rule:
        // if the source row has a current income and the new bar ends before
        // it → 'past'; if start is after today → 'future'; else 'current'.
        // 'unknown' means we couldn't pin it down (no current income on the
        // row) and the popup must show a current/not-current toggle.
        detectedCategory: "past" | "current" | "future" | "unknown";
        // Position of the bar's center in viewport-X for popup placement.
        viewportX: number;
        viewportY: number;
      }
    | null
  >(null);

  const handleToggleEditMode = useCallback(() => {
    setEditMode((p) => {
      const next = !p;
      if (!next) {
        setDrawState(null);
      }
      return next;
    });
  }, []);

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

  // The range of cell indices the dragged bar will occupy on release. Drives a
  // vertical column-highlight overlay in the timeline so the user can see the
  // exact months the bar will snap to. Clamped to the visible window — bars
  // that extend past either edge get a flush-clamp on that side.
  const dragHighlight = useMemo(() => {
    if (!dragPreview || cells.length === 0) return null;
    const target = incomes.find((i) => i.id === dragPreview.id);
    if (!target) return null;
    const merged = { ...target, ...dragPreview.patch } as Income;

    const firstWindowKey = cells[0].key;
    const lastWindowKey = cells[cells.length - 1].key;
    const startKey = format(startOfMonth(parseISO(merged.startDate)), "yyyy-MM");
    const endKey = merged.endDate
      ? format(startOfMonth(parseISO(merged.endDate)), "yyyy-MM")
      : lastWindowKey;
    if (endKey < firstWindowKey || startKey > lastWindowKey) return null;

    const clampedStartKey = startKey < firstWindowKey ? firstWindowKey : startKey;
    const clampedEndKey = endKey > lastWindowKey ? lastWindowKey : endKey;
    const firstIdx = cells.findIndex((c) => c.key === clampedStartKey);
    const lastIdx = cells.findIndex((c) => c.key === clampedEndKey);
    if (firstIdx === -1 || lastIdx === -1) return null;
    return { firstIdx, lastIdx };
  }, [dragPreview, cells, incomes]);

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

  // Placeholder data for the empty-state backdrop. Computed only when there
  // are no real incomes — for users who already have streams these never
  // build. The backdrop reuses the real TimelineStudio so the preview is
  // pixel-accurate; only the surrounding wrapper makes it non-interactive.
  const showEmptyBackdrop = incomes.length === 0;
  const placeholderIncomes = useMemo(
    () => (showEmptyBackdrop ? buildPlaceholderIncomes() : []),
    [showEmptyBackdrop]
  );
  const placeholderMonthlyTotals = useMemo(() => {
    if (!showEmptyBackdrop) return monthlyTotals;
    return cells.map((cell) => {
      const breakdown = placeholderIncomes.map((income) => ({
        income,
        amount: getAmountForMonth(income, cell),
      }));
      const total = breakdown.reduce((sum, b) => sum + b.amount, 0);
      return { cell, breakdown: breakdown.filter((b) => b.amount > 0), total };
    });
  }, [showEmptyBackdrop, cells, placeholderIncomes, monthlyTotals]);
  const placeholderPeak = useMemo(
    () =>
      placeholderMonthlyTotals.reduce((max, m) => Math.max(max, m.total), 0),
    [placeholderMonthlyTotals]
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

  // ─── draw-mode handlers ──────────────────────────────────────────────────
  // Per-row callbacks. The row reports its income identity + the cells index
  // under the cursor; the parent owns the drag state so commit + popup can
  // be coordinated globally.
  const handleDrawStart = useCallback(
    (income: Income, cellIdx: number) => {
      if (!editMode) return;
      // The previous bar's commit popup is still open — don't let a click on
      // another lane wipe out the user's in-flight draft.
      if (drawCommit) return;
      const clamped = Math.max(0, Math.min(cells.length - 1, cellIdx));
      const k = cells[clamped].key;
      setDrawState({
        rowIncomeId: income.id,
        anchorKey: k,
        endKey: k,
      });
    },
    [editMode, cells, drawCommit]
  );

  const handleDrawMove = useCallback(
    (income: Income, cellIdx: number) => {
      // Once the popup is open the drag is done — don't let stray pointermove
      // events reshape the dashed bar.
      if (drawCommit) return;
      setDrawState((prev) => {
        if (!prev || prev.rowIncomeId !== income.id) return prev;
        const clamped = Math.max(0, Math.min(cells.length - 1, cellIdx));
        const k = cells[clamped].key;
        return k === prev.endKey ? prev : { ...prev, endKey: k };
      });
    },
    [cells, drawCommit]
  );

  const handleDrawEnd = useCallback(
    (income: Income, finalCellIdx: number, viewportX: number, viewportY: number) => {
      setDrawState((prev) => {
        if (!prev || prev.rowIncomeId !== income.id) return prev;
        const clamped = Math.max(0, Math.min(cells.length - 1, finalCellIdx));
        const finalKey = cells[clamped].key;
        const startKey =
          finalKey < prev.anchorKey ? finalKey : prev.anchorKey;
        const endKey =
          finalKey > prev.anchorKey ? finalKey : prev.anchorKey;

        // Detect past / current / future per the user's rule.
        const todayKey = format(startOfMonth(new Date()), "yyyy-MM");
        const sourceArchetype = getArchetype(income);
        const sourceIsCurrent =
          sourceArchetype === "recurring" ||
          (income.endDate
            ? format(startOfMonth(parseISO(income.endDate)), "yyyy-MM") >= todayKey
            : false);
        let detected: "past" | "current" | "future" | "unknown";
        if (sourceIsCurrent) {
          const sourceStartKey = format(
            startOfMonth(parseISO(income.startDate)),
            "yyyy-MM"
          );
          if (endKey < sourceStartKey) detected = "past";
          else if (startKey > todayKey) detected = "future";
          else detected = "current";
        } else if (startKey > todayKey) {
          detected = "future";
        } else if (endKey < todayKey) {
          detected = "past";
        } else {
          // Source row has no current income and the new bar straddles today
          // — let the user choose.
          detected = "unknown";
        }

        setDrawCommit({
          rowIncome: income,
          startKey,
          endKey,
          detectedCategory: detected,
          viewportX,
          viewportY,
        });
        // Keep the dashed bar visible while the popup is open — user reads
        // the date range from the bar; clearing it would yank away the
        // visual reference. Normalize the keys (anchor = start) so any
        // post-pointerup logic (e.g. live re-render through scroll) sees a
        // consistent ordering.
        return { ...prev, anchorKey: startKey, endKey };
      });
    },
    [cells]
  );

  const handleDrawSave = useCallback(
    async (data: {
      name: string;
      amount: number;
      isCurrent: boolean | null;
    }) => {
      if (!drawCommit) return;
      const { startKey, endKey } = drawCommit;
      // If the popup forced a toggle (detectedCategory === 'unknown') the
      // user's pick wins; otherwise the auto-detected category sticks.
      let category: "past" | "current" | "future";
      if (drawCommit.detectedCategory === "unknown") {
        category = data.isCurrent ? "current" : "past";
      } else {
        category = drawCommit.detectedCategory;
      }
      // Current incomes auto-extend forever (no endDate, like the existing
      // recurring archetype).
      const endDate = category === "current" ? null : `${endKey}-01`;
      await createIncomeBeta({
        name: data.name,
        category: drawCommit.rowIncome.category,
        incomeCategory: category,
        amount: data.amount,
        subjectToCpf: false,
        accountForBonus: false,
        startDate: `${startKey}-01`,
        endDate: endDate ?? undefined,
        familyMemberId: drawCommit.rowIncome.familyMemberId ?? undefined,
      });
      setDrawCommit(null);
      setDrawState(null);
      // Stay in edit mode so the user can keep adding bars without
      // re-clicking the pencil — matches Figma/Photoshop tool behaviour.
    },
    [drawCommit, cells]
  );

  const handleDrawDiscard = useCallback(() => {
    setDrawCommit(null);
    setDrawState(null);
  }, []);

  // Every "Add Income" CTA on the page routes through here. Cards view opens
  // an inline DraftSentenceCard; Timeline view flips into draw/edit mode so
  // the user can sketch a bar. Either way, no modal.
  const handleOpenAddIncome = useCallback(() => {
    if (view === "timeline") {
      setEditMode(true);
    } else {
      setDraftIncome({ name: "", amount: "", archetype: "recurring" });
    }
  }, [view]);

  const handleCancelDraft = useCallback(() => {
    setDraftIncome(null);
  }, []);

  const handleSaveDraft = useCallback(async () => {
    if (!draftIncome) return;
    const name = draftIncome.name.trim();
    const amount = Number(draftIncome.amount);
    if (!name || !(amount > 0)) return;
    setDraftSaving(true);
    try {
      const startKey = format(startOfMonth(new Date()), "yyyy-MM-dd");
      await createIncomeBeta({
        name,
        category: "salary",
        incomeCategory:
          draftIncome.archetype === "one-off" ? "one-off" : "current-recurring",
        amount,
        subjectToCpf: false,
        startDate: startKey,
        // One-off collapses to a single-month bar. Temporary needs an end
        // date but we don't collect it inline — user sets it on the card.
        endDate: draftIncome.archetype === "one-off" ? startKey : undefined,
      });
      setDraftIncome(null);
    } finally {
      setDraftSaving(false);
    }
  }, [draftIncome]);

  // Called by the dashed bar's drag handles (lateral move + resize-left +
  // resize-right). The row computes the new keys from the cursor; we just
  // mirror them into both drawState (so the bar re-renders at the new
  // position) and drawCommit (so the popup, whose rAF loop reads from the
  // bar's current rect, follows along).
  const handleDraftReshape = useCallback(
    (newAnchorKey: string, newEndKey: string) => {
      setDrawState((prev) =>
        prev
          ? { ...prev, anchorKey: newAnchorKey, endKey: newEndKey }
          : prev
      );
      setDrawCommit((prev) => {
        if (!prev) return prev;
        const lo =
          newAnchorKey < newEndKey ? newAnchorKey : newEndKey;
        const hi =
          newAnchorKey > newEndKey ? newAnchorKey : newEndKey;
        return { ...prev, startKey: lo, endKey: hi };
      });
    },
    []
  );

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

      {incomes.length === 0 && !editMode && !draftIncome ? (
        <div className="relative">
          {/* Backdrop: a faded, non-interactive preview of whichever view the
              user has selected, populated with placeholder incomes.
              Communicates "this is what you'll unlock once you add your
              first stream." */}
          <div
            aria-hidden
            className="pointer-events-none select-none opacity-40 blur-[1.5px]"
          >
            {view === "timeline" ? (
              <TimelineStudio
                cells={cells}
                incomes={placeholderIncomes}
                monthlyTotals={placeholderMonthlyTotals}
                peakTotal={placeholderPeak}
                hoverIndex={null}
                onHover={() => {}}
                windowOffsetMonths={windowOffsetMonths}
                subMonthFraction={subMonthFraction}
                tlConfig={tlConfig}
                onScrollPrev={() => {}}
                onScrollNext={() => {}}
                onScrollToToday={() => {}}
                onShiftWindow={() => {}}
                onAmountChange={() => {}}
                onRequestDelete={() => {}}
                onOpenCreator={() => {}}
                onOpenDetail={() => {}}
                onDragPreview={() => {}}
                dragHighlight={null}
                onMoveBar={() => {}}
                onResizeStart={() => {}}
                onResizeEnd={() => {}}
              />
            ) : (
              <ActionCardsView
                cells={cells}
                incomes={placeholderIncomes}
                monthlyTotals={placeholderMonthlyTotals}
                peakTotal={placeholderPeak}
                hoverIndex={null}
                onHover={() => {}}
                windowOffsetMonths={windowOffsetMonths}
                subMonthFraction={subMonthFraction}
                tlConfig={tlConfig}
                onScrollPrev={() => {}}
                onScrollNext={() => {}}
                onScrollToToday={() => {}}
                onShiftWindow={() => {}}
                onAmountChange={() => {}}
                onNameChange={() => {}}
                onStartDateChange={() => {}}
                onEndDateChange={() => {}}
                onAddMilestone={() => {}}
                onEditMilestone={() => {}}
                onDeleteMilestone={() => {}}
                onRequestDelete={() => {}}
                onOpenCreator={() => {}}
                onOpenDetail={() => {}}
              />
            )}
          </div>
          {/* Foreground: the real empty-state CTA, centered over the backdrop. */}
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <EmptyState onCreate={handleOpenAddIncome} />
          </div>
        </div>
      ) : view === "timeline" ? (
        <TimelineStudio
          cells={cells}
          incomes={effectiveIncomes}
          familyMembers={familyMembers}
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
          onOpenCreator={() => setEditMode(true)}
          onOpenDetail={setDetailIncomeId}
          onDragPreview={setDragPreview}
          dragHighlight={dragHighlight}
          onMoveBar={handleMoveBar}
          onResizeStart={handleResizeStart}
          onResizeEnd={handleResizeEnd}
          editMode={editMode}
          onToggleEditMode={handleToggleEditMode}
          drawState={drawState}
          drawCommit={drawCommit}
          onDrawStart={handleDrawStart}
          onDrawMove={handleDrawMove}
          onDrawEnd={handleDrawEnd}
          onDrawSave={handleDrawSave}
          onDrawDiscard={handleDrawDiscard}
          onDraftReshape={handleDraftReshape}
          windowYears={windowYears}
          onWindowYearsChange={setWindowYears}
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
          onOpenCreator={handleOpenAddIncome}
          onOpenDetail={setDetailIncomeId}
          draftIncome={draftIncome}
          draftSaving={draftSaving}
          onDraftChange={setDraftIncome}
          onDraftSave={handleSaveDraft}
          onDraftCancel={handleCancelDraft}
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
  editMode,
  onToggleEditMode,
}: {
  cells: MonthCell[];
  windowOffsetMonths: number;
  onScrollPrev: () => void;
  onScrollNext: () => void;
  onScrollToToday: () => void;
  editMode?: boolean;
  onToggleEditMode?: () => void;
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
        {onToggleEditMode && (
          <button
            type="button"
            onClick={onToggleEditMode}
            aria-pressed={editMode}
            aria-label={editMode ? "Exit edit mode" : "Enter edit mode"}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[11px] font-semibold uppercase tracking-wider transition-colors shadow-sm",
              editMode
                ? "border-brand-terracotta bg-brand-terracotta text-white hover:bg-brand-terracotta/90"
                : "border-border/40 bg-card text-foreground hover:bg-muted"
            )}
          >
            <Pencil className="h-3.5 w-3.5" />
            {editMode ? "Editing…" : "Edit"}
          </button>
        )}
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
  familyMembers = [],
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
  dragHighlight,
  onMoveBar,
  onResizeStart,
  onResizeEnd,
  editMode = false,
  onToggleEditMode,
  drawState,
  drawCommit,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
  onDrawSave,
  onDrawDiscard,
  onDraftReshape,
  windowYears,
  onWindowYearsChange,
}: {
  cells: MonthCell[];
  incomes: Income[];
  familyMembers?: FamilyMember[];
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
  dragHighlight: { firstIdx: number; lastIdx: number } | null;
  onMoveBar: (income: Income, deltaMonths: number) => void;
  onResizeStart: (income: Income, deltaMonths: number) => void;
  onResizeEnd: (income: Income, deltaMonths: number) => void;
  editMode?: boolean;
  onToggleEditMode?: () => void;
  drawState?: {
    rowIncomeId: string;
    anchorKey: string;
    endKey: string;
  } | null;
  drawCommit?: {
    rowIncome: Income;
    startKey: string;
    endKey: string;
    detectedCategory: "past" | "current" | "future" | "unknown";
    viewportX: number;
    viewportY: number;
  } | null;
  onDrawStart?: (income: Income, cellIdx: number) => void;
  onDrawMove?: (income: Income, cellIdx: number) => void;
  onDrawEnd?: (
    income: Income,
    cellIdx: number,
    viewportX: number,
    viewportY: number
  ) => void;
  onDrawSave?: (data: {
    name: string;
    amount: number;
    isCurrent: boolean | null;
  }) => void;
  onDrawDiscard?: () => void;
  onDraftReshape?: (newAnchorKey: string, newEndKey: string) => void;
  windowYears?: number;
  onWindowYearsChange?: (years: number) => void;
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

  // Group incomes by family member for the rack rendering. Each family
  // member row gets one header + one or more bars (their incomes). Sort:
  // Self first (relationship === "Self"), then alphabetical by name.
  // Unassigned incomes (familyMemberId === null) collapse into a single
  // "Unassigned" row at the bottom. Family members with zero incomes still
  // get a row so the user can draw on them.
  const groupedRows = useMemo(() => {
    const byMember = new Map<string | null, Income[]>();
    for (const inc of incomes) {
      const key = inc.familyMemberId ?? null;
      const list = byMember.get(key);
      if (list) list.push(inc);
      else byMember.set(key, [inc]);
    }
    const sortedMembers = [...familyMembers].sort((a, b) => {
      const aSelf = a.relationship === "Self";
      const bSelf = b.relationship === "Self";
      if (aSelf && !bSelf) return -1;
      if (!aSelf && bSelf) return 1;
      return a.name.localeCompare(b.name);
    });
    const rows: Array<{
      key: string;
      familyMember: FamilyMember | null;
      incomes: Income[];
      tracks: Income[][];
    }> = [];
    for (const fm of sortedMembers) {
      const memberIncomes = byMember.get(fm.id) ?? [];
      rows.push({
        key: fm.id,
        familyMember: fm,
        incomes: memberIncomes,
        tracks: packIntoTracks(memberIncomes),
      });
    }
    // Bottom: unassigned incomes, only if any exist.
    const unassigned = byMember.get(null) ?? [];
    if (unassigned.length > 0) {
      rows.push({
        key: "_unassigned",
        familyMember: null,
        incomes: unassigned,
        tracks: packIntoTracks(unassigned),
      });
    }
    return rows;
  }, [incomes, familyMembers]);

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
        editMode={editMode}
        onToggleEditMode={onToggleEditMode}
      />

      <div className="relative">
      <div
        ref={dawRef}
        style={tsStyle}
        className="relative rounded-2xl border border-border/30 bg-card shadow-sm overflow-hidden overscroll-x-contain"
      >
        {/* Time-range scale slider — overlaid at the top-right of the
            river graph card. Desktop only; mobile keeps the compact
            8-month default and hides the slider because bars at 10y on a
            small screen would be illegible. Sits above the chart via z-10
            so it stays clear of the gradient fill. */}
        {onWindowYearsChange && !tlConfig.isMobile && windowYears !== undefined && (
          <div className="absolute right-4 top-3 z-10 hidden sm:flex items-center gap-2 rounded-full border border-border/40 bg-card/90 px-3 py-1 shadow-sm backdrop-blur-sm">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Scale
            </span>
            <Slider
              value={[windowYears]}
              onValueChange={(v) => onWindowYearsChange(v[0])}
              min={2}
              max={10}
              step={1}
              className="w-24"
              aria-label="Timeline range in years"
            />
            <span className="font-display text-[11px] font-semibold tabular-nums text-foreground min-w-[2.5rem] text-right">
              {windowYears}y
            </span>
          </div>
        )}
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
              {/* Drag-target column highlight — vertical strip across every
                  lane covering the months the dragged bar will snap to.
                  Renders only while a drag is active. */}
              {dragHighlight && (
                <div
                  className="pointer-events-none absolute inset-y-0 bg-brand-terracotta/10 ring-1 ring-inset ring-brand-terracotta/40 transition-[left,width] duration-75"
                  style={{
                    left: `${(dragHighlight.firstIdx / cells.length) * 100}%`,
                    width: `${((dragHighlight.lastIdx - dragHighlight.firstIdx + 1) / cells.length) * 100}%`,
                  }}
                />
              )}
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

          {(() => {
            // Render one family-member group at a time. Each group's first
            // row shows the family member name in the header column; the
            // remaining rows in the same group render with no header and
            // no top border, so the group visually reads as a single
            // expanded row containing stacked bars.
            //
            // Empty family-member rows render a single "ghost" row when edit
            // mode is on so the user can draw their first income on the lane.
            // The ghost has amount=0 (renders nothing) but carries the
            // familyMemberId so handleDrawSave wires the new income to the
            // right member. In view mode, empty rows are skipped — they'd
            // just show a blank lane with no purpose.
            const todayIso = format(startOfMonth(new Date()), "yyyy-MM-dd");
            let globalRowIdx = 0;
            return groupedRows.flatMap((group, groupIdx) => {
              const alternate = groupIdx % 2 === 1;
              if (group.incomes.length === 0) {
                if (!editMode) return [];
                const ghost = buildGhostIncome(group.familyMember, todayIso);
                const isFirst = globalRowIdx === 0;
                globalRowIdx += 1;
                const familyHeader = group.familyMember
                  ? {
                      name: group.familyMember.name,
                      relationship: group.familyMember.relationship,
                    }
                  : { name: "Unassigned", relationship: null };
                return [
                  <IncomeStreamRow
                    key={ghost.id}
                    incomes={[ghost]}
                    familyMemberHeader={familyHeader}
                    cells={cells}
                    subMonthFraction={subMonthFraction}
                    isFirst={isFirst}
                    isFirstInGroup={true}
                    alternate={alternate}
                    tlConfig={tlConfig}
                    onAmountChange={onAmountChange}
                    onRequestDelete={onRequestDelete}
                    onOpenDetail={onOpenDetail}
                    onDragPreview={onDragPreview}
                    onMoveBar={onMoveBar}
                    onResizeStart={onResizeStart}
                    onResizeEnd={onResizeEnd}
                    editMode={editMode}
                    drawState={
                      drawState && drawState.rowIncomeId === ghost.id
                        ? drawState
                        : null
                    }
                    onDrawStart={onDrawStart}
                    onDrawMove={onDrawMove}
                    onDrawEnd={onDrawEnd}
                    onDraftReshape={onDraftReshape}
                    rowFamilyMemberId={group.familyMember?.id ?? null}
                  />,
                ];
              }
              const familyHeader = group.familyMember
                ? {
                    name: group.familyMember.name,
                    relationship: group.familyMember.relationship,
                  }
                : { name: "Unassigned", relationship: null };
              // One row per packed track (non-overlapping incomes share a
              // lane). The track's first income drives the React key + the
              // draw context (via the row's `primary` lookup).
              return group.tracks.map((track, i) => {
                const isFirst = globalRowIdx === 0;
                const isFirstInGroup = i === 0;
                globalRowIdx += 1;
                const trackKey = `${group.key}__${track.map((t) => t.id).join("_")}`;
                const drawTargetIncome =
                  track.find((t) => getArchetype(t) === "recurring") ?? track[0];
                return (
                  <IncomeStreamRow
                    key={trackKey}
                    incomes={track}
                    familyMemberHeader={isFirstInGroup ? familyHeader : null}
                    cells={cells}
                    subMonthFraction={subMonthFraction}
                    isFirst={isFirst}
                    isFirstInGroup={isFirstInGroup}
                    alternate={alternate}
                    tlConfig={tlConfig}
                    onAmountChange={onAmountChange}
                    onRequestDelete={onRequestDelete}
                    onOpenDetail={onOpenDetail}
                    onDragPreview={onDragPreview}
                    onMoveBar={onMoveBar}
                    onResizeStart={onResizeStart}
                    onResizeEnd={onResizeEnd}
                    editMode={editMode}
                    drawState={
                      drawState && drawState.rowIncomeId === drawTargetIncome.id
                        ? drawState
                        : null
                    }
                    onDrawStart={onDrawStart}
                    onDrawMove={onDrawMove}
                    onDrawEnd={onDrawEnd}
                    onDraftReshape={onDraftReshape}
                    rowFamilyMemberId={group.familyMember?.id ?? null}
                  />
                );
              });
            });
          })()}
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
      {/* Pencil-tool commit popup — fixed-position, lives outside the DAW so
          it can extend beyond the rack edge without being clipped. */}
      {drawCommit && onDrawSave && onDrawDiscard && (() => {
        // Derive current cell indices for the popup's bar-anchor math from
        // the stable date keys + the current cells window. As the timeline
        // scrolls horizontally, indices shift but the keys (and hence the
        // bar's actual date) stay constant.
        const sIdx = cells.findIndex((c) => c.key === drawCommit.startKey);
        const eIdx = cells.findIndex((c) => c.key === drawCommit.endKey);
        if (sIdx === -1 || eIdx === -1) return null;
        return (
          <DrawCommitCard
            rowIncome={drawCommit.rowIncome}
            startKey={drawCommit.startKey}
            endKey={drawCommit.endKey}
            detectedCategory={drawCommit.detectedCategory}
            startIdx={sIdx}
            endIdx={eIdx}
            cellsLength={cells.length}
            subMonthFraction={subMonthFraction}
            onSave={onDrawSave}
            onDiscard={onDrawDiscard}
          />
        );
      })()}
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
  const yearSegments = useMemo(() => buildYearSegments(cells), [cells]);
  const gridCols = {
    gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))`,
  } as React.CSSProperties;
  // Density throttle: at higher zoom-out the per-cell width shrinks below the
  // label width, so we drop labels on a stride. Cells still render to keep
  // the grid + tick alignment intact; only the text is hidden.
  // Stride is anchored to month-of-year (cell.month % stride === 0) instead
  // of array index so the visible months don't shift as the user pans.
  const labelStride = (() => {
    if (cells.length <= 30) return 1;   // ≤ ~2.5y: every month
    if (cells.length <= 60) return 3;   // ≤ 5y: quarterly (Jan/Apr/Jul/Oct)
    if (cells.length <= 90) return 6;   // ≤ 7.5y: half-yearly (Jan/Jul)
    return 12;                           // 10y: year markers only (Jan)
  })();
  return (
    <div className="relative mt-2">
      {/* Year strip — one label per contiguous calendar-year span, sized to
          its month range via grid-column. Same column template as the month
          row below so labels stay aligned with their months. */}
      <div
        className="grid mb-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground/70"
        style={gridCols}
      >
        {yearSegments.map((seg) => (
          <div
            key={`${seg.year}-${seg.startIndex}`}
            className="flex items-center justify-center py-1"
            style={{
              gridColumn: `${seg.startIndex + 1} / span ${seg.spanCount}`,
            }}
          >
            {seg.year}
          </div>
        ))}
      </div>
      <div
        className="grid gap-px text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
        style={gridCols}
      >
        {cells.map((cell, i) => {
          const showLabel = labelStride === 1 || cell.date.getMonth() % labelStride === 0;
          return (
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
              <span className={cn(!showLabel && "invisible")}>{cell.label}</span>
            </div>
          );
        })}
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

// Floating popup card that appears after the user finishes drawing a new
// bar with the pencil tool. Positioned absolutely near the cursor's
// pointerup location (offset above the bar so it doesn't block the bar
// itself). Form is intentionally minimal — name + amount only — with
// optional current/past toggle when the detection rule couldn't decide.
function DrawCommitCard({
  rowIncome,
  startKey,
  endKey,
  detectedCategory,
  startIdx,
  endIdx,
  cellsLength,
  subMonthFraction,
  onSave,
  onDiscard,
}: {
  rowIncome: Income;
  startKey: string;
  endKey: string;
  detectedCategory: "past" | "current" | "future" | "unknown";
  // The bar's exact viewport coords are derived live from the lane DOM and
  // these cell-index inputs, so the popup tracks the bar through scroll +
  // resize instead of getting stranded at its pointerup-time snapshot.
  startIdx: number;
  endIdx: number;
  cellsLength: number;
  subMonthFraction: number;
  onSave: (data: { name: string; amount: number; isCurrent: boolean | null }) => void;
  onDiscard: () => void;
}) {
  const [name, setName] = useState(rowIncome.name);
  const [amount, setAmount] = useState<string>(rowIncome.amount ?? "");
  const [isCurrent, setIsCurrent] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Imperative position loop. The popup is a fixed-position element that
  // must stay glued to the drawn bar through every kind of motion:
  //   - browser window scroll (vertical or horizontal)
  //   - the timeline's *internal* horizontal-shift state (no scroll event
  //     fires for those — the bar reflows via React state)
  //   - window resize, card height change
  // We bypass React state for the position math because state updates can
  // be batched, dropped, or short-circuited by referential-equality bail-
  // outs. Direct DOM writes on every animation frame are the simplest
  // bulletproof approach. The loop runs only while the popup is mounted.
  const cardRef = useRef<HTMLDivElement | null>(null);
  const tailRef = useRef<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    let rafId = 0;
    const TAIL_H = 10;
    const SAFE_PAD = 12;
    const tick = () => {
      const card = cardRef.current;
      const tail = tailRef.current;
      // Query the dashed draft bar directly. Its rect IS the source of
      // truth for "where the bar is right now" — much more reliable than
      // computing from the lane's center, which is wrong when the lane is
      // expanded for vertical stacking (the bar lives at 75% of the lane,
      // not 50%).
      const bar = document.querySelector(
        '[data-draft-bar="true"]'
      ) as HTMLElement | null;
      if (card && tail && bar) {
        const br = bar.getBoundingClientRect();
        if (br.width > 0) {
          const cr = card.getBoundingClientRect();
          const barCenterX = br.left + br.width / 2;
          const barTopY = br.top;
          const barBottomY = br.bottom;
          const cardW = cr.width;
          const cardH = cr.height;
          const winW = window.innerWidth;
          const winH = window.innerHeight;
          // Above-the-bar preferred: card bottom = bar top − TAIL_H, so the
          // tail tip lands exactly on the bar's top edge. Flip below if
          // there's no room above.
          const aboveTop = barTopY - TAIL_H - cardH;
          const placeAbove = aboveTop >= SAFE_PAD;
          const top = placeAbove
            ? aboveTop
            : Math.min(winH - cardH - SAFE_PAD, barBottomY + TAIL_H);
          const idealLeft = barCenterX - cardW / 2;
          const left = Math.max(
            SAFE_PAD,
            Math.min(winW - cardW - SAFE_PAD, idealLeft)
          );
          const tailX = Math.max(12, Math.min(cardW - 12, barCenterX - left));

          // Card placement.
          card.style.left = `${left}px`;
          card.style.top = `${top}px`;
          card.style.visibility = "visible";
          card.style.opacity = "1";
          card.style.pointerEvents = "auto";

          // Tail placement + direction. Mirror the CSS-triangle config we
          // had statically before, but keyed off live placeAbove.
          tail.style.left = `${tailX}px`;
          if (placeAbove) {
            tail.style.top = "";
            tail.style.bottom = `${-TAIL_H}px`;
            tail.style.borderTop = `${TAIL_H}px solid hsl(var(--card))`;
            tail.style.borderBottom = "";
            tail.style.filter =
              "drop-shadow(0 1px 0 hsl(var(--border) / 0.4))";
          } else {
            tail.style.top = `${-TAIL_H}px`;
            tail.style.bottom = "";
            tail.style.borderBottom = `${TAIL_H}px solid hsl(var(--card))`;
            tail.style.borderTop = "";
            tail.style.filter =
              "drop-shadow(0 -1px 0 hsl(var(--border) / 0.4))";
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [rowIncome.id, startIdx, endIdx, cellsLength, subMonthFraction]);

  // Click-away detection. The dashed draft bar itself represents unsaved
  // work, so:
  //   - Clicks on the bar (or its drag handles) count as *inside* — they're
  //     the user repositioning, not abandoning. Without this exemption,
  //     starting any drag would fire click-outside → discard → bar vanishes
  //     mid-drag.
  //   - Clicks anywhere else always surface the save-or-discard prompt,
  //     regardless of whether the form fields are dirty. The bar is data;
  //     never discard silently.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const card = cardRef.current;
      if (!card) return;
      if (card.contains(e.target as Node)) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-draft-bar="true"]')) return;
      setConfirmDiscard(true);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [onDiscard]);

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;
    onSave({
      name: name.trim(),
      amount: parsedAmount,
      isCurrent: detectedCategory === "unknown" ? isCurrent : null,
    });
  };

  const dateRangeLabel =
    startKey === endKey
      ? format(parseISO(`${startKey}-01`), "MMM yyyy")
      : `${format(parseISO(`${startKey}-01`), "MMM yyyy")} → ${format(
          parseISO(`${endKey}-01`),
          "MMM yyyy"
        )}`;

  // Portal to document.body so the fixed-positioned card escapes any
  // ancestor with `contain: layout paint` / `transform` / `will-change`,
  // which would otherwise become its containing block and offset the
  // viewport-relative coordinates we compute. Body is the only safe
  // mounting point that's guaranteed to be the viewport.
  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <div
        ref={cardRef}
        role="dialog"
        aria-label="New income"
        className="fixed z-50 w-[280px] rounded-2xl border border-border/40 bg-card p-4 shadow-2xl ring-1 ring-black/5"
        // Initial styles — left/top/visibility/opacity/pointerEvents are
        // assigned imperatively by the rAF loop above, which sees both card
        // and bar dimensions live. We start hidden so the first frame
        // (before measurement) doesn't flash an unpositioned card.
        style={{
          left: 0,
          top: 0,
          visibility: "hidden",
          opacity: 0,
          pointerEvents: "none",
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Speech-bubble tail. The rAF loop sets left/top/bottom and the
            triangle border-color/direction live based on placement so the
            tip stays glued to the bar's top (above) or bottom (below). */}
        <span
          ref={tailRef}
          aria-hidden
          className="absolute"
          style={{
            width: 0,
            height: 0,
            transform: "translateX(-50%)",
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
          }}
        />
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          New income · {dateRangeLabel}
        </p>
        <label className="mt-3 block text-xs font-semibold text-foreground">
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-border/40 bg-background px-2 py-1.5 text-sm font-normal text-foreground focus:outline-none focus:ring-2 focus:ring-brand-terracotta/40"
            placeholder="Income name"
          />
        </label>
        <label className="mt-3 block text-xs font-semibold text-foreground">
          Amount (monthly)
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-md border border-border/40 bg-background px-2 py-1.5 text-sm font-normal text-foreground focus:outline-none focus:ring-2 focus:ring-brand-terracotta/40"
            placeholder="0.00"
          />
        </label>
        {detectedCategory === "unknown" && (
          <label className="mt-3 flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border/60 text-brand-terracotta focus:ring-brand-terracotta/40"
            />
            This is a current (ongoing) income
          </label>
        )}
        {detectedCategory !== "unknown" && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Will save as <em className="not-italic font-semibold capitalize">{detectedCategory}</em>{" "}
            income.
          </p>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || !amount.trim() || parseFloat(amount) <= 0}
            className="rounded-md bg-brand-terracotta px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-terracotta/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save your changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ve started filling in a new income but haven&apos;t saved
              yet. Save now or discard?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDiscard(false)}>
              Keep editing
            </AlertDialogCancel>
            <button
              type="button"
              onClick={() => {
                setConfirmDiscard(false);
                onDiscard();
              }}
              className="rounded-md border border-border/40 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Discard
            </button>
            <AlertDialogAction onClick={handleSave}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>,
    document.body
  );
}

interface IncomeStreamRowProps {
  // A "track" of one or more incomes belonging to the same family member that
  // do not overlap in time — packed by `packIntoTracks`. They share a single
  // visual lane: bars sit side-by-side at the same vertical level. When a
  // member's incomes don't overlap (e.g., past Salary Aug-Apr + Retainer
  // May-Dec), they all collapse into one row regardless of archetype.
  incomes: Income[];
  cells: MonthCell[];
  // Sub-month scroll offset (0..1). Needed by the lane-level draw handlers
  // so they can map a viewport clientX → cells index across translateX.
  subMonthFraction?: number;
  isFirst?: boolean;
  // True if this row is the first within its family-member group. Drives
  // header rendering (only the first row in a group shows the family name)
  // and top-border suppression on subsequent rows in the same group.
  isFirstInGroup?: boolean;
  // Header content for the left column. Null on subsequent rows in a
  // family-member group (the first row already drew the header above).
  familyMemberHeader?: { name: string; relationship: string | null } | null;
  // Family member this row belongs to (null = "Unassigned"). Used as the
  // draw context for the pencil tool and for popup name pre-fill.
  rowFamilyMemberId?: string | null;
  alternate?: boolean;
  tlConfig: TimelineConfig;
  onAmountChange: (income: Income, amount: number) => void;
  onRequestDelete: (income: Income) => void;
  onOpenDetail: (id: string) => void;
  onDragPreview: (preview: { id: string; patch: Partial<Income> } | null) => void;
  onMoveBar: (income: Income, deltaMonths: number) => void;
  onResizeStart: (income: Income, deltaMonths: number) => void;
  onResizeEnd: (income: Income, deltaMonths: number) => void;
  // Edit mode — when true, the lane area accepts pointerdown-to-draw a new
  // bar AND existing bars become drag/resizable; otherwise the row is
  // read-only. drawState non-null means a draw is currently in progress for
  // this row.
  editMode?: boolean;
  drawState?: { rowIncomeId: string; anchorKey: string; endKey: string } | null;
  onDrawStart?: (income: Income, cellIdx: number) => void;
  onDrawMove?: (income: Income, cellIdx: number) => void;
  onDrawEnd?: (
    income: Income,
    cellIdx: number,
    viewportX: number,
    viewportY: number
  ) => void;
  // Lateral drag of an existing draft bar. Called by the bar's resize-left,
  // resize-right, and body-move handles with the new keys to apply.
  onDraftReshape?: (newAnchorKey: string, newEndKey: string) => void;
}

type BarDragKind = "move" | "resize-left" | "resize-right";

// Captured at pointerdown and held constant for the entire drag. The drag
// math is anchored to the bar's *actual visible edge* (in viewport-X) — not
// to the cursor's click point — so snap-to-month fires when the cursor
// crosses the bar's half-month boundary regardless of where on the handle the
// user happened to click. This matches the resize behavior of every modern
// DAW (Logic, Ableton, Reaper, Pro Tools): the edge tracks the cursor, and
// the click offset within the handle is meaningless.
interface BarDragState {
  kind: BarDragKind;
  monthWidthPx: number;
  // Viewport-X of the bar's relevant edge at pointerdown. Left edge for
  // 'move' and 'resize-left'; right edge for 'resize-right'. Read from the
  // bar element's getBoundingClientRect, so it already accounts for the
  // timeline's translateX (sub-month scroll offset).
  edgeAnchorViewportX: number;
  // For 'move' only: cursor offset from the bar's left edge at pointerdown,
  // in pixels. Preserved through the drag so the grab point stays under the
  // cursor (modulo snap). 0 for resize.
  grabOffsetPx: number;
  // Snapshot of the income at pointerdown — *before* any drag preview is
  // applied. Critical: the row's `income` prop is the *previewed* income
  // during a drag (because the parent merges dragPreview into effectiveIncomes
  // and the row re-renders with the patched copy). If we passed that copy
  // through to the commit handler, the commit would apply the delta on top of
  // the preview's already-shifted dates, double-counting the move. Using
  // this snapshot keeps commit math anchored to where the bar actually was
  // when the user grabbed it.
  originalIncome: Income;
  startStart: Date;
  startEnd: Date | null;
  // For the click-vs-drag threshold and the drag tooltip's screen position.
  startPointerX: number;
  hasMoved: boolean;
}

// While dragging, a small floating chip near the cursor shows the dates
// the bar will commit to. Same pattern as DAW clip-drag tooltips.
interface DragTooltip {
  x: number;
  y: number;
  text: string;
}

const IncomeStreamRow = memo(function IncomeStreamRow({
  incomes,
  cells,
  subMonthFraction = 0,
  isFirst = false,
  isFirstInGroup = true,
  familyMemberHeader = null,
  rowFamilyMemberId = null,
  alternate = false,
  tlConfig,
  onAmountChange,
  onRequestDelete,
  onOpenDetail,
  onDragPreview,
  onMoveBar,
  onResizeStart,
  onResizeEnd,
  editMode = false,
  drawState = null,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
  onDraftReshape,
}: IncomeStreamRowProps) {
  // Representative income for the draw context (drawing in this row carries
  // the row's familyMemberId). Prefer the current/recurring income if any —
  // its archetype drives the past/current/future detection in handleDrawEnd.
  // Otherwise the first income works; with zero incomes (a ghost row) the
  // single placeholder is the representative.
  const primary =
    incomes.find((i) => getArchetype(i) === "recurring") ?? incomes[0];
  const lanesAreaRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<BarDragState | null>(null);
  const [dragTooltip, setDragTooltip] = useState<DragTooltip | null>(null);
  // Set on pointerup if drag occurred — used to suppress the synthetic click
  // event so the QuickAdjustPad popover doesn't open after a drag.
  const justDraggedRef = useRef(false);

  // Does the in-progress draft bar's date range intersect ANY income on this
  // track? If yes, we expand the lane and stack the bars vertically (top
  // half = existing, bottom half = draft) so they don't visually collide.
  // Behaves like a video editor splitting a clip onto a second track.
  const draftStacked = !!drawState && (() => {
    const lo =
      drawState.anchorKey < drawState.endKey
        ? drawState.anchorKey
        : drawState.endKey;
    const hi =
      drawState.anchorKey > drawState.endKey
        ? drawState.anchorKey
        : drawState.endKey;
    return incomes.some((income) => {
      const sKey = format(startOfMonth(parseISO(income.startDate)), "yyyy-MM");
      const eKey = income.endDate
        ? format(startOfMonth(parseISO(income.endDate)), "yyyy-MM")
        : "9999-99";
      return lo <= eKey && hi >= sKey;
    });
  })();

  // Lateral drag of the dashed draft bar. The user can grab the body
  // (move) or either edge (resize-left / resize-right). All three call
  // onDraftReshape with new (anchorKey, endKey) keys; the parent updates
  // both drawState and drawCommit so the popup follows.
  type DraftDragKind = "move" | "resize-left" | "resize-right";
  const draftDragRef = useRef<{
    kind: DraftDragKind;
    pointerStartCellIdx: number;
    origAnchorKey: string;
    origEndKey: string;
    hasMoved: boolean;
    startPointerX: number;
  } | null>(null);

  const handleDraftPointerDown = (
    e: React.PointerEvent,
    kind: DraftDragKind
  ) => {
    if (!drawState || !onDraftReshape) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    const lane = lanesAreaRef.current;
    if (!lane) return;
    const rect = lane.getBoundingClientRect();
    const monthWidthPx = rect.width / cells.length;
    const cursorIdx = Math.floor(
      (e.clientX - rect.left) / monthWidthPx + subMonthFraction
    );
    draftDragRef.current = {
      kind,
      pointerStartCellIdx: cursorIdx,
      origAnchorKey: drawState.anchorKey,
      origEndKey: drawState.endKey,
      hasMoved: false,
      startPointerX: e.clientX,
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const handleDraftPointerMove = (e: React.PointerEvent) => {
    const drag = draftDragRef.current;
    if (!drag || !onDraftReshape) return;
    e.stopPropagation();
    const lane = lanesAreaRef.current;
    if (!lane) return;
    const rect = lane.getBoundingClientRect();
    const monthWidthPx = rect.width / cells.length;
    const cursorIdx = Math.floor(
      (e.clientX - rect.left) / monthWidthPx + subMonthFraction
    );
    const deltaMonths = cursorIdx - drag.pointerStartCellIdx;
    if (Math.abs(e.clientX - drag.startPointerX) > 4) drag.hasMoved = true;
    const shift = (k: string, m: number) =>
      format(addMonths(parseISO(`${k}-01`), m), "yyyy-MM");
    const lo =
      drag.origAnchorKey < drag.origEndKey
        ? drag.origAnchorKey
        : drag.origEndKey;
    const hi =
      drag.origAnchorKey > drag.origEndKey
        ? drag.origAnchorKey
        : drag.origEndKey;
    let newAnchor = drag.origAnchorKey;
    let newEnd = drag.origEndKey;
    if (drag.kind === "move") {
      newAnchor = shift(drag.origAnchorKey, deltaMonths);
      newEnd = shift(drag.origEndKey, deltaMonths);
    } else if (drag.kind === "resize-left") {
      let next = shift(lo, deltaMonths);
      if (next > hi) next = hi;
      newAnchor = next;
      newEnd = hi;
    } else {
      // resize-right
      let next = shift(hi, deltaMonths);
      if (next < lo) next = lo;
      newAnchor = lo;
      newEnd = next;
    }
    onDraftReshape(newAnchor, newEnd);
  };

  const handleDraftPointerUp = (e: React.PointerEvent) => {
    if (!draftDragRef.current) return;
    e.stopPropagation();
    draftDragRef.current = null;
  };

  // Snap rule. Two rules in play because they're optimal for different
  // gestures:
  //   - 'move' uses Math.round (nearest-cell snap from the grab point). The
  //     grab offset preserves the user's pinch-point on the bar, so we want
  //     symmetric half-cell hysteresis around it. Floor here would cause
  //     1-pixel cursor jitter to flip the bar a full month whenever the grab
  //     point lands near a cell boundary.
  //   - 'resize-*' uses Math.floor (the cell containing the cursor wins).
  //     The user's mental model when dragging an edge is "cursor in March, so
  //     bar ends in March" — floor matches that. Round would require the
  //     cursor to cross half the cell past the bar's edge before snapping,
  //     which feels laggy and is the "jumps to a wrong month" complaint.
  // The +1 on resize-right is because the bar's right edge sits on gridline
  // (endIndex+1), one past the last included cell.
  const computeDeltaMonths = (clientX: number) => {
    const drag = dragRef.current;
    if (!drag) return 0;
    const distance =
      (clientX - drag.edgeAnchorViewportX - drag.grabOffsetPx) /
      drag.monthWidthPx;
    if (drag.kind === "move") return Math.round(distance);
    if (drag.kind === "resize-right") return Math.floor(distance) + 1;
    return Math.floor(distance);
  };

  const computePatch = (kind: BarDragKind, deltaMonths: number): Partial<Income> => {
    const drag = dragRef.current;
    if (!drag) return {};
    if (kind === "move") {
      const newStart = addMonths(drag.startStart, deltaMonths);
      const newEnd = drag.startEnd ? addMonths(drag.startEnd, deltaMonths) : null;
      // Shift any milestone targetMonths by the same delta — otherwise the
      // amount-change boundary stays at its original calendar month while
      // the bar slides past, fragmenting the preview into wrong-colored
      // segments. Read milestones from the original snapshot, not the row's
      // current `income` prop (which has already been preview-shifted).
      const milestones = safeParseMilestones(
        drag.originalIncome.futureMilestones
      );
      const shifted = milestones.map((m) => ({
        ...m,
        targetMonth: format(
          addMonths(parseISO(`${m.targetMonth}-01`), deltaMonths),
          "yyyy-MM"
        ),
      }));
      const futureMilestones =
        shifted.length > 0 ? JSON.stringify(shifted) : null;
      return {
        startDate: format(newStart, "yyyy-MM-dd"),
        endDate: newEnd ? format(newEnd, "yyyy-MM-dd") : null,
        futureMilestones,
      };
    }
    if (kind === "resize-left") {
      let newStart = addMonths(drag.startStart, deltaMonths);
      if (drag.startEnd && newStart > drag.startEnd) newStart = drag.startEnd;
      return { startDate: format(newStart, "yyyy-MM-dd") };
    }
    // resize-right
    const baseEnd = drag.startEnd ?? drag.startStart;
    let newEnd = addMonths(baseEnd, deltaMonths);
    if (newEnd < drag.startStart) newEnd = drag.startStart;
    return { endDate: format(newEnd, "yyyy-MM-dd") };
  };

  const formatTooltip = (kind: BarDragKind, deltaMonths: number) => {
    const drag = dragRef.current;
    if (!drag) return "";
    if (kind === "resize-left") {
      const newStart = addMonths(drag.startStart, deltaMonths);
      return format(newStart, "MMM yyyy");
    }
    if (kind === "resize-right") {
      const baseEnd = drag.startEnd ?? drag.startStart;
      const newEnd = addMonths(baseEnd, deltaMonths);
      return format(newEnd, "MMM yyyy");
    }
    // move — show the date range
    const newStart = addMonths(drag.startStart, deltaMonths);
    if (!drag.startEnd) return format(newStart, "MMM yyyy");
    const newEnd = addMonths(drag.startEnd, deltaMonths);
    return `${format(newStart, "MMM yyyy")} → ${format(newEnd, "MMM yyyy")}`;
  };

  const handlePointerDown = (
    e: React.PointerEvent,
    kind: BarDragKind,
    forIncome: Income
  ) => {
    // Only primary button / single touch
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Edit mode gate — view mode is read-only, no drag/resize.
    if (!editMode) return;
    e.stopPropagation();
    const lane = lanesAreaRef.current;
    if (!lane) return;
    // For 'move', currentTarget is the bar's segment <button>. For 'resize-*',
    // currentTarget is the handle <span>, whose parentElement is the segment
    // button. Either way, we want the segment button's rendered rect — that's
    // the source of truth for the bar's visible edge in viewport coordinates,
    // accounting for any translateX from sub-month scrolling.
    const target = e.currentTarget as HTMLElement;
    const barEl = kind === "move" ? target : target.parentElement;
    if (!barEl) return;
    const barRect = barEl.getBoundingClientRect();
    const monthWidthPx = lane.clientWidth / cells.length;
    const edgeAnchorViewportX =
      kind === "resize-right" ? barRect.right : barRect.left;
    const grabOffsetPx =
      kind === "move" ? e.clientX - edgeAnchorViewportX : 0;
    dragRef.current = {
      kind,
      monthWidthPx,
      edgeAnchorViewportX,
      grabOffsetPx,
      originalIncome: forIncome,
      startStart: parseISO(forIncome.startDate),
      startEnd: forIncome.endDate ? parseISO(forIncome.endDate) : null,
      startPointerX: e.clientX,
      hasMoved: false,
    };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startPointerX;
    // 8px is the standard click-vs-drag threshold (Apple HIG / Material).
    // We deliberately suppress the live preview, the drag tooltip, AND the
    // column highlight until the user has *intentionally* dragged. Otherwise
    // the floor-based resize snap would visibly fire a month on accidental
    // 1-2px jitter at the moment of click.
    if (Math.abs(dx) > 8) drag.hasMoved = true;
    if (!drag.hasMoved) return;
    const deltaMonths = computeDeltaMonths(e.clientX);
    onDragPreview({
      id: drag.originalIncome.id,
      patch: computePatch(drag.kind, deltaMonths),
    });
    setDragTooltip({
      x: e.clientX,
      y: e.clientY,
      text: formatTooltip(drag.kind, deltaMonths),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const moved = drag.hasMoved;
    const deltaMonths = moved ? computeDeltaMonths(e.clientX) : 0;
    dragRef.current = null;
    onDragPreview(null);
    setDragTooltip(null);
    if (moved && deltaMonths !== 0) {
      justDraggedRef.current = true;
      // Pass the snapshot, not the closure's `income` (which is previewed).
      // See note on BarDragState.originalIncome.
      const original = drag.originalIncome;
      if (drag.kind === "move") onMoveBar(original, deltaMonths);
      else if (drag.kind === "resize-left") onResizeStart(original, deltaMonths);
      else if (drag.kind === "resize-right") onResizeEnd(original, deltaMonths);
    }
  };

  const handlePointerCancel = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    onDragPreview(null);
    setDragTooltip(null);
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
        // Top border separates *family-member groups* — within a group the
        // rows visually merge into one expanded row with stacked bars.
        !isFirst && isFirstInGroup && "border-t border-border/20",
        alternate ? "bg-muted/25" : "bg-transparent",
        "hover:bg-brand-jungle/[0.04]"
      )}
    >
      {/* Track header column. The family member name appears once per group
          (on the first row in the group). When the row carries a single
          income we also surface its archetype label + edit/delete shortcuts.
          When the row carries multiple non-overlapping incomes (a packed
          track), the per-income chip is dropped — bar colors carry the
          archetype info and per-bar popovers + the detail dialog cover edit
          actions, so duplicating them in the header would be noise. */}
      <div className="flex flex-col justify-center gap-0.5 border-r border-border/30 px-2 py-2 min-w-0 sm:px-4 sm:py-3">
        {familyMemberHeader && (
          <p className="font-display text-sm font-semibold text-foreground truncate">
            {familyMemberHeader.name}
            {familyMemberHeader.relationship && (
              <span className="ml-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                · {familyMemberHeader.relationship}
              </span>
            )}
          </p>
        )}
        {incomes.length === 1 && (() => {
          const income = incomes[0];
          const archetype = getArchetype(income);
          const meta = ARCHETYPE_META[archetype];
          const Icon = meta.icon;
          return (
            <>
              <div
                className={cn(
                  "flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em]",
                  meta.tone
                )}
              >
                <Icon className="h-3 w-3" />
                {meta.label}
              </div>
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
            </>
          );
        })()}
      </div>

      {/* Bars area — gridlines come from the parent overlay. When the draft
          bar overlaps with the existing bars in this row we double the lane
          height (h-28) and split it in half: existing bars at the 25% line,
          draft bar at the 75% line. Same approach video editors use to put
          a colliding clip on a second track. */}
      <div
        ref={lanesAreaRef}
        data-row-income-id={primary.id}
        className={cn(
          "relative overflow-hidden transition-[height]",
          draftStacked ? "h-28" : "h-14",
          editMode && "cursor-crosshair"
        )}
        style={EDGE_FADE_STYLE}
        onPointerDown={(e) => {
          if (!editMode || !onDrawStart) return;
          // Only the lane background should start a draw — clicks on existing
          // bars/handles still go to their drag handlers via stopPropagation.
          if ((e.target as Element)?.closest("button")) return;
          const lane = lanesAreaRef.current;
          if (!lane) return;
          const rect = lane.getBoundingClientRect();
          const monthWidthPx = rect.width / cells.length;
          const cursorX = e.clientX - rect.left;
          const idx = Math.max(
            0,
            Math.min(
              cells.length - 1,
              Math.floor(cursorX / monthWidthPx + subMonthFraction)
            )
          );
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          onDrawStart(primary, idx);
        }}
        onPointerMove={(e) => {
          if (!editMode || !drawState || !onDrawMove) return;
          const lane = lanesAreaRef.current;
          if (!lane) return;
          const rect = lane.getBoundingClientRect();
          const monthWidthPx = rect.width / cells.length;
          const idx = Math.max(
            0,
            Math.min(
              cells.length - 1,
              Math.floor(
                (e.clientX - rect.left) / monthWidthPx + subMonthFraction
              )
            )
          );
          onDrawMove(primary, idx);
        }}
        onPointerUp={(e) => {
          if (!editMode || !drawState || !onDrawEnd) return;
          const lane = lanesAreaRef.current;
          if (!lane) return;
          const rect = lane.getBoundingClientRect();
          const monthWidthPx = rect.width / cells.length;
          const finalIdx = Math.max(
            0,
            Math.min(
              cells.length - 1,
              Math.floor(
                (e.clientX - rect.left) / monthWidthPx + subMonthFraction
              )
            )
          );
          // Compute the bar's center in viewport coordinates so the popup's
          // speech-bubble tail can point at the actual bar (not at where the
          // cursor happened to be released).
          const anchorIdx = cells.findIndex(
            (c) => c.key === drawState.anchorKey
          );
          const startIdx = Math.min(anchorIdx, finalIdx);
          const endIdxLocal = Math.max(anchorIdx, finalIdx);
          const centerCell = (startIdx + endIdxLocal + 1) / 2;
          const barCenterX =
            rect.left + (centerCell - subMonthFraction) * monthWidthPx;
          const barCenterY = rect.top + rect.height / 2;
          onDrawEnd(primary, finalIdx, barCenterX, barCenterY);
        }}
      >
        <div
          className="absolute inset-0 will-change-transform"
          style={{ transform: "translateX(var(--ts-x, 0))" }}
        >
          {/* In-progress drawing bar overlay — rendered when this row is the
              draw target. Indices are derived from the date keys against the
              current cells, so when the timeline scrolls horizontally the
              bar stays glued to its calendar months instead of drifting.
              Pointer-events-none so it doesn't swallow the pointermove/up
              events fired against the lane wrapper. */}
          {drawState && (() => {
            const anchorIdx = cells.findIndex(
              (c) => c.key === drawState.anchorKey
            );
            const endIdx = cells.findIndex(
              (c) => c.key === drawState.endKey
            );
            // Either edge can scroll out of the visible window; clamp the
            // visible portion so the bar still renders for the part that's
            // on-screen rather than disappearing entirely.
            const a = anchorIdx === -1
              ? drawState.anchorKey < cells[0].key
                ? 0
                : cells.length - 1
              : anchorIdx;
            const b = endIdx === -1
              ? drawState.endKey < cells[0].key
                ? 0
                : cells.length - 1
              : endIdx;
            const startIdx = Math.min(a, b);
            const endIdxLocal = Math.max(a, b);
            const leftPct = (startIdx / cells.length) * 100;
            const widthPct = ((endIdxLocal - startIdx + 1) / cells.length) * 100;
            return (
              <div
                data-draft-bar="true"
                onPointerDown={(e) => handleDraftPointerDown(e, "move")}
                onPointerMove={handleDraftPointerMove}
                onPointerUp={handleDraftPointerUp}
                onPointerCancel={handleDraftPointerUp}
                className={cn(
                  "absolute -translate-y-1/2 h-8 rounded-md border-2 border-dashed border-brand-terracotta bg-brand-terracotta/15 ring-2 ring-brand-terracotta/20 cursor-grab active:cursor-grabbing touch-none select-none",
                  // When stacked, the draft bar moves to the 75% line so
                  // it sits below the existing bars (which are at 25%).
                  draftStacked ? "top-[75%]" : "top-1/2"
                )}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                aria-label="New income (drag to reposition)"
              >
                {/* Resize-left handle */}
                <span
                  role="slider"
                  aria-label="Drag to change new income's start month"
                  onPointerDown={(e) => handleDraftPointerDown(e, "resize-left")}
                  onPointerMove={handleDraftPointerMove}
                  onPointerUp={handleDraftPointerUp}
                  onPointerCancel={handleDraftPointerUp}
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize touch-none flex items-center justify-center"
                >
                  <span className="h-5 w-px rounded-full bg-brand-terracotta" />
                </span>
                {/* Resize-right handle */}
                <span
                  role="slider"
                  aria-label="Drag to change new income's end month"
                  onPointerDown={(e) =>
                    handleDraftPointerDown(e, "resize-right")
                  }
                  onPointerMove={handleDraftPointerMove}
                  onPointerUp={handleDraftPointerUp}
                  onPointerCancel={handleDraftPointerUp}
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize touch-none flex items-center justify-center"
                >
                  <span className="h-5 w-px rounded-full bg-brand-terracotta" />
                </span>
              </div>
            );
          })()}
          {/* Bars from every income on this track. Tracks are pre-packed by
              `packIntoTracks` so two incomes never overlap horizontally —
              they share the lane at the same vertical level regardless of
              archetype. Per-income archetype/color/segments are computed
              inside the loop so a temporary + current pair on one row each
              keep their own theming. */}
          {incomes.flatMap((income) => {
            const archetype = getArchetype(income);
            const meta = ARCHETYPE_META[archetype];
            const segments = buildBarSegments(income, cells);
            const startKey = format(
              startOfMonth(parseISO(income.startDate)),
              "yyyy-MM"
            );
            const endKey = income.endDate
              ? format(startOfMonth(parseISO(income.endDate)), "yyyy-MM")
              : null;
            const startInWindow = cells.length > 0 && startKey >= cells[0].key;
            const endInWindow =
              cells.length > 0 &&
              endKey !== null &&
              endKey <= cells[cells.length - 1].key;
            return segments.map((seg, i) => {
              const leftPct = (seg.startIndex / cells.length) * 100;
              const widthPct = (seg.spanCount / cells.length) * 100;
              const isLastSegment = i === segments.length - 1;
              const isFirstSegment = i === 0;
              const reachesEnd = seg.startIndex + seg.spanCount >= cells.length;
              const isOngoingTail =
                (archetype === "recurring" || archetype === "future") &&
                !income.endDate &&
                isLastSegment &&
                reachesEnd;
              const showLeftHandle = editMode && isFirstSegment && startInWindow;
              const showRightHandle =
                editMode && isLastSegment && !isOngoingTail && endInWindow;
              return (
                <Popover
                  key={`${income.id}-${i}`}
                  {...(editMode ? {} : { open: false })}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onPointerDown={(e) => handlePointerDown(e, "move", income)}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerCancel}
                      onClickCapture={handleClickCapture}
                      className={cn(
                        "absolute -translate-y-1/2 flex items-center justify-center px-2 text-xs font-semibold text-white shadow-sm transition-transform hover:scale-y-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 touch-none select-none",
                        editMode
                          ? "cursor-grab active:cursor-grabbing"
                          : "cursor-default",
                        draftStacked ? "top-[25%]" : "top-1/2",
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
                        {isFirstSegment && (
                          <span className="font-medium opacity-90">
                            {income.name} ·{" "}
                          </span>
                        )}
                        {formatCurrency(seg.amount)}
                        {archetype === "recurring" && (
                          <em className="ml-1 font-normal italic opacity-80">
                            (Current)
                          </em>
                        )}
                      </span>

                      {showLeftHandle && (
                        <span
                          role="slider"
                          aria-label={`Drag to change ${income.name} start date`}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            handlePointerDown(e, "resize-left", income);
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
                          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize touch-none flex items-center justify-center"
                        >
                          <span className="h-5 w-px rounded-full bg-white/35 group-hover:bg-white/85 transition-colors" />
                        </span>
                      )}
                      {showRightHandle && (
                        <span
                          role="slider"
                          aria-label={`Drag to change ${income.name} end date`}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            handlePointerDown(e, "resize-right", income);
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
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize touch-none flex items-center justify-center"
                        >
                          <span className="h-5 w-px rounded-full bg-white/35 group-hover:bg-white/85 transition-colors" />
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="center"
                    className="p-0 border-0 bg-transparent shadow-none w-auto"
                  >
                    <IncomeBarPopup
                      income={income}
                      initialAmount={seg.amount}
                      onConfirm={(next) => onAmountChange(income, next)}
                      onOpenDetail={() => onOpenDetail(income.id)}
                    />
                  </PopoverContent>
                </Popover>
              );
            });
          })}
        </div>
      </div>

      {dragTooltip && (
        <div
          role="status"
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-md bg-foreground px-2 py-1 font-display text-[11px] font-semibold text-background shadow-lg"
          style={{ left: dragTooltip.x, top: dragTooltip.y }}
        >
          {dragTooltip.text}
        </div>
      )}
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
  // Optional inline-draft props — when set, the dashed "+ New Income Rule"
  // tile renders as an editable DraftSentenceCard. Optional so the empty-
  // state placeholder render path (which doesn't track draft state) can
  // skip them.
  draftIncome?: DraftIncome | null;
  draftSaving?: boolean;
  onDraftChange?: (next: DraftIncome | null) => void;
  onDraftSave?: () => void;
  onDraftCancel?: () => void;
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
  draftIncome,
  draftSaving,
  onDraftChange,
  onDraftSave,
  onDraftCancel,
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
        {draftIncome && onDraftChange && onDraftSave && onDraftCancel ? (
          <DraftSentenceCard
            draft={draftIncome}
            saving={draftSaving ?? false}
            onChange={onDraftChange}
            onSave={onDraftSave}
            onCancel={onDraftCancel}
          />
        ) : (
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
        )}
      </div>
    </div>
  );
}

/**
 * Inline draft card — the cards-view replacement for the IncomeCreatorDrawer
 * modal. Owns no state of its own; the parent IncomesBetaView holds the
 * DraftIncome and decides when to persist via createIncomeBeta. Submitting
 * needs only name + amount + archetype; other fields (dates, family member,
 * CPF, category) are filled in afterwards via the resulting SentenceCard's
 * inline editors.
 */
const DRAFT_ARCHETYPES: Array<{
  value: DraftIncome["archetype"];
  label: string;
  hint: string;
}> = [
  { value: "recurring", label: "Recurring", hint: "Monthly, no end date" },
  { value: "one-off", label: "One-off", hint: "Single payment this month" },
  { value: "temporary", label: "Temporary", hint: "Monthly, with an end date" },
];

function DraftSentenceCard({
  draft,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  draft: DraftIncome;
  saving: boolean;
  onChange: (next: DraftIncome) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const canSave =
    draft.name.trim().length > 0 && Number(draft.amount) > 0 && !saving;

  return (
    <div
      className="rounded-2xl border-2 border-brand-terracotta/60 bg-card p-5 shadow-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSave) onSave();
      }}
    >
      <div className="flex items-center justify-between">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-terracotta">
          New income
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cancel new income"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {DRAFT_ARCHETYPES.map((opt) => {
          const active = draft.archetype === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...draft, archetype: opt.value })}
              className={cn(
                "rounded-lg border px-2.5 py-2 text-left transition-colors",
                active
                  ? "border-brand-terracotta bg-brand-terracotta/10"
                  : "border-border/40 bg-background hover:border-border/70 hover:bg-muted/60"
              )}
            >
              <p
                className={cn(
                  "font-display text-xs font-semibold",
                  active ? "text-brand-terracotta" : "text-foreground"
                )}
              >
                {opt.label}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
                {opt.hint}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-3 space-y-2">
        <input
          type="text"
          autoFocus
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder="Name — e.g. Salary, Annual Bonus"
          className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 font-display text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/10"
        />
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            $
          </span>
          <input
            type="number"
            min={0}
            step="50"
            inputMode="decimal"
            value={draft.amount}
            onChange={(e) => onChange({ ...draft, amount: e.target.value })}
            placeholder="0"
            className="w-full rounded-lg border border-border/40 bg-background pl-7 pr-3 py-2 font-display text-lg font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/10"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={!canSave}>
          {saving ? "Saving…" : "Add income"}
        </Button>
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
    <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/95 p-10 text-center shadow-2xl ring-1 ring-black/5 backdrop-blur-sm">
      <p className="font-display text-xl font-semibold text-foreground">
        No income streams yet
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Add your first income to unlock the timeline studio and start
        projecting your monthly balance.
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
