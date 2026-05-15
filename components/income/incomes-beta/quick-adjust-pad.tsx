"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { differenceInCalendarMonths, format, parseISO } from "date-fns";
import { ChevronRight } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickAdjustPadProps {
  initialAmount: number;
  label?: string;
  onConfirm: (next: number) => void;
  onCancel?: () => void;
}

const SLIDER_STEP = 50;

export function QuickAdjustPad({
  initialAmount,
  label = "Adjust Amount",
  onConfirm,
  onCancel,
}: QuickAdjustPadProps) {
  const [value, setValue] = useState<number>(initialAmount);

  useEffect(() => {
    setValue(initialAmount);
  }, [initialAmount]);

  const min = 0;
  const max = Math.max(initialAmount * 2, initialAmount + 5000, 1000);

  const handleConfirm = () => {
    onConfirm(Math.max(0, Math.round(value / SLIDER_STEP) * SLIDER_STEP));
  };

  const dirty = value !== initialAmount;

  return (
    <div className="w-72 rounded-2xl border border-border/40 bg-popover text-popover-foreground p-5 shadow-xl">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-center font-display text-4xl font-bold tracking-tight">
        ${Math.round(value).toLocaleString()}
      </p>

      <div className="mt-5 px-1">
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={SLIDER_STEP}
          onValueChange={(vals) => setValue(vals[0] ?? value)}
          aria-label="Amount slider"
        />
        <div className="mt-1 flex justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>${min.toLocaleString()}</span>
          <span>${max.toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          className={cn(
            "flex-1 bg-brand-jungle hover:bg-brand-jungle/90 text-white font-semibold",
            !dirty && "opacity-60 cursor-not-allowed"
          )}
          disabled={!dirty}
          onClick={handleConfirm}
        >
          Confirm Changes
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// IncomeBarPopup
//
// The popover shown when a timeline bar is clicked. Wraps the amount slider
// with a swipeable detail carousel above it so the user can flip through the
// income's metadata (basics, CPF, bonuses, notes/history) without the popup
// growing tall enough to overlap neighboring rows. Also exposes an "Open
// full details" button that delegates to the parent's detail dialog.
// ---------------------------------------------------------------------------

interface IncomeForPopup {
  id: string;
  name: string;
  category: string;
  startDate: string;
  endDate: string | null;
  subjectToCpf: boolean | null;
  accountForBonus: boolean | null;
  bonusGroups: string | null;
  employeeCpfContribution: string | null;
  employerCpfContribution: string | null;
  netTakeHome: string | null;
  description: string | null;
  pastIncomeHistory: string | null;
  futureMilestones: string | null;
  familyMember: { name: string; relationship: string | null } | null;
}

interface IncomeBarPopupProps {
  income: IncomeForPopup;
  initialAmount: number;
  onConfirm: (next: number) => void;
  onOpenDetail?: () => void;
  onCancel?: () => void;
}

interface DetailPage {
  key: string;
  title: string;
  body: React.ReactNode;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function DetailRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-muted-foreground shrink-0">{k}</span>
      <span className="font-semibold text-foreground tabular-nums truncate text-right">
        {v}
      </span>
    </div>
  );
}

function buildPages(income: IncomeForPopup): DetailPage[] {
  const pages: DetailPage[] = [];

  // Page 1 — overview: name, family member, category, period, duration.
  // Always present so the popup never renders an empty carousel.
  const start = parseISO(income.startDate);
  const end = income.endDate ? parseISO(income.endDate) : null;
  const period = end
    ? `${format(start, "MMM yyyy")} → ${format(end, "MMM yyyy")}`
    : `${format(start, "MMM yyyy")} → ongoing`;
  const months = end ? differenceInCalendarMonths(end, start) + 1 : null;
  const duration =
    months !== null
      ? `${months} mo${months === 1 ? "" : "s"}`
      : "Ongoing";
  pages.push({
    key: "overview",
    title: "Overview",
    body: (
      <div className="space-y-2.5">
        <p className="font-display text-sm font-semibold text-foreground truncate">
          {income.name}
        </p>
        <div className="flex flex-wrap gap-1">
          {income.familyMember && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              {income.familyMember.name}
            </span>
          )}
          <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            {income.category}
          </span>
        </div>
        <div className="space-y-1 pt-1">
          <DetailRow k="Period" v={period} />
          <DetailRow k="Duration" v={duration} />
        </div>
      </div>
    ),
  });

  // Page 2 — CPF, only when this income is subject to it. Computed values
  // are stored as decimal strings; coerce to Number for display.
  if (income.subjectToCpf) {
    const cpfRows: Array<{ k: string; v: string }> = [
      { k: "Subject to CPF", v: "Yes" },
    ];
    if (income.employeeCpfContribution) {
      cpfRows.push({
        k: "Employee",
        v: fmtMoney(Number(income.employeeCpfContribution)),
      });
    }
    if (income.employerCpfContribution) {
      cpfRows.push({
        k: "Employer",
        v: fmtMoney(Number(income.employerCpfContribution)),
      });
    }
    if (income.netTakeHome) {
      cpfRows.push({
        k: "Net take-home",
        v: fmtMoney(Number(income.netTakeHome)),
      });
    }
    pages.push({
      key: "cpf",
      title: "CPF",
      body: (
        <div className="space-y-1.5">
          {cpfRows.map((r) => (
            <DetailRow key={r.k} k={r.k} v={r.v} />
          ))}
        </div>
      ),
    });
  }

  // Page 3 — bonus months. The amount in bonusGroups is a multiplier-as-string
  // (e.g. "1.5"); render as "× 1.5x" so the user understands it scales the
  // monthly base, not adds a fixed dollar amount.
  if (income.accountForBonus && income.bonusGroups) {
    let parsed: Array<{ month: number; amount: string | number }> = [];
    try {
      const raw = JSON.parse(income.bonusGroups);
      if (Array.isArray(raw)) {
        parsed = raw.filter(
          (g): g is { month: number; amount: string | number } =>
            typeof g?.month === "number"
        );
      }
    } catch {
      parsed = [];
    }
    if (parsed.length > 0) {
      pages.push({
        key: "bonus",
        title: "Bonuses",
        body: (
          <div className="space-y-1.5">
            {parsed.map((g, i) => (
              <DetailRow
                key={i}
                k={MONTH_LABELS[Math.min(11, Math.max(0, g.month - 1))]}
                v={`× ${g.amount}`}
              />
            ))}
          </div>
        ),
      });
    }
  }

  // Page 4 — notes + structured history. Skip entirely if all three sources
  // are empty so the user doesn't swipe into a blank page.
  let milestones: Array<{
    targetMonth: string;
    amount: number | string;
    reason?: string;
  }> = [];
  let history: Array<{
    period?: string;
    amount?: number | string;
    notes?: string;
  }> = [];
  try {
    const raw = income.futureMilestones
      ? JSON.parse(income.futureMilestones)
      : [];
    if (Array.isArray(raw)) milestones = raw;
  } catch {
    milestones = [];
  }
  try {
    const raw = income.pastIncomeHistory
      ? JSON.parse(income.pastIncomeHistory)
      : [];
    if (Array.isArray(raw)) history = raw;
    else if (raw && typeof raw === "object") history = [raw];
  } catch {
    history = [];
  }
  if (income.description || milestones.length > 0 || history.length > 0) {
    pages.push({
      key: "notes",
      title: "Notes & changes",
      body: (
        <div className="space-y-3">
          {income.description && (
            <p className="text-xs leading-snug text-foreground/80">
              {income.description}
            </p>
          )}
          {milestones.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Future changes
              </p>
              {milestones.slice(0, 4).map((m, i) => (
                <DetailRow
                  key={i}
                  k={m.targetMonth}
                  v={fmtMoney(Number(m.amount))}
                />
              ))}
              {milestones.length > 4 && (
                <p className="text-[10px] text-muted-foreground">
                  +{milestones.length - 4} more…
                </p>
              )}
            </div>
          )}
          {history.length > 0 && (
            <div className="space-y-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                Past history
              </p>
              {history.slice(0, 3).map((h, i) => (
                <DetailRow
                  key={i}
                  k={h.period ?? `Entry ${i + 1}`}
                  v={h.amount !== undefined ? fmtMoney(Number(h.amount)) : "—"}
                />
              ))}
            </div>
          )}
        </div>
      ),
    });
  }

  return pages;
}

export function IncomeBarPopup({
  income,
  initialAmount,
  onConfirm,
  onOpenDetail,
  onCancel,
}: IncomeBarPopupProps) {
  const [value, setValue] = useState<number>(initialAmount);

  useEffect(() => {
    setValue(initialAmount);
  }, [initialAmount]);

  const pages = useMemo(() => buildPages(income), [income]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [pageIdx, setPageIdx] = useState(0);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== pageIdx) setPageIdx(idx);
  };

  const goToPage = (i: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  const min = 0;
  const max = Math.max(initialAmount * 2, initialAmount + 5000, 1000);
  const dirty = value !== initialAmount;
  const handleConfirm = () => {
    onConfirm(Math.max(0, Math.round(value / SLIDER_STEP) * SLIDER_STEP));
  };

  return (
    <div className="w-72 rounded-2xl border border-border/40 bg-popover text-popover-foreground shadow-xl">
      {/* Swipeable detail carousel. scroll-snap delivers the swipe gesture on
          both touch and trackpad without needing a JS gesture library; the
          page index is recovered from scrollLeft so dot navigation stays in
          sync with manual swipes. */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex">
          {pages.map((page) => (
            <div
              key={page.key}
              className="snap-start shrink-0 basis-full px-5 pt-5 pb-3"
            >
              <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {page.title}
              </p>
              <div className="mt-3 min-h-[110px]">{page.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Page dots — hidden when there's only one page (no swipe needed). */}
      {pages.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-2">
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToPage(i)}
              aria-label={`Go to page ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === pageIdx
                  ? "w-4 bg-foreground"
                  : "w-1.5 bg-foreground/25 hover:bg-foreground/45"
              )}
            />
          ))}
        </div>
      )}

      <div className="border-t border-border/40 px-5 pb-5 pt-4">
        <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Adjust amount
        </p>
        <p className="mt-2 text-center font-display text-3xl font-bold tracking-tight">
          ${Math.round(value).toLocaleString()}
        </p>

        <div className="mt-3 px-1">
          <Slider
            value={[value]}
            min={min}
            max={max}
            step={SLIDER_STEP}
            onValueChange={(vals) => setValue(vals[0] ?? value)}
            aria-label="Amount slider"
          />
          <div className="mt-1 flex justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>${min.toLocaleString()}</span>
            <span>${max.toLocaleString()}</span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            className={cn(
              "flex-1 bg-brand-jungle hover:bg-brand-jungle/90 text-white font-semibold",
              !dirty && "opacity-60 cursor-not-allowed"
            )}
            disabled={!dirty}
            onClick={handleConfirm}
          >
            Confirm Changes
          </Button>
        </div>

        {onOpenDetail && (
          <button
            type="button"
            onClick={onOpenDetail}
            className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Open full details
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
