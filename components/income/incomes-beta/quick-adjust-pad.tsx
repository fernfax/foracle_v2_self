"use client";

import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarMonths, format, parseISO } from "date-fns";
import { ChevronRight, Info, Plus, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ANNUAL_WAGE_CEILING_AMOUNT,
  CPF_ALLOCATION_BRACKETS,
  CPF_RATE_BRACKETS,
  OW_CEILING_AMOUNT,
  OW_CEILING_YEAR,
  computeBonusCPF,
  getCPFAllocationBracketIndex,
  getCPFBracketIndex,
} from "@/lib/cpf-calculator";
import { cn } from "@/lib/utils";

interface BonusGroupDraft {
  month: number;
  amount: string;
}

function parseBonusDraft(json: string | null): BonusGroupDraft[] {
  if (!json) return [];
  try {
    const raw = JSON.parse(json);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((g) => g && typeof g.month === "number")
      .map((g) => ({ month: g.month, amount: String(g.amount ?? "") }));
  } catch {
    return [];
  }
}

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
  amount: string;
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
  familyMember: {
    name: string;
    relationship: string | null;
    dateOfBirth?: string | null;
  } | null;
}

// Whole-year age from a date-of-birth string (best-effort; null when unknown).
function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = parseISO(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

// The OW-ceiling explainer with the full CPF rate table, highlighting the
// person's age bracket and whether their wage sits above the OW ceiling.
function OWCeilingInfo({
  age,
  grossMonthly,
}: {
  age: number | null;
  grossMonthly: number;
}) {
  const bracketIdx = age !== null ? getCPFBracketIndex(age) : -1;
  const aboveCeiling = grossMonthly > OW_CEILING_AMOUNT;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="About the Ordinary Wage ceiling"
          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[360px] max-w-[90vw] p-4 text-left"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p className="font-display text-sm font-semibold text-foreground">
          Ordinary Wage (OW) Ceiling
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          The OW ceiling limits the amount of monthly wage that attracts CPF
          contributions.
        </p>
        <p className="mt-1.5 text-xs font-semibold text-foreground">
          The current OW ceiling is ${OW_CEILING_AMOUNT.toLocaleString()} (
          {OW_CEILING_YEAR}).
        </p>
        <p className="mt-1 text-xs font-semibold text-brand-jungle">
          This income is {aboveCeiling ? "above" : "within"} the OW ceiling
          {aboveCeiling
            ? ` — CPF is capped at $${OW_CEILING_AMOUNT.toLocaleString()}.`
            : "."}
        </p>

        <p className="mt-3 font-display text-xs font-semibold text-foreground">
          CPF Contribution Rates (from 1 Jan 2025)
        </p>
        <p className="text-[10px] text-muted-foreground">
          For monthly wages &gt; $750.
        </p>
        <div className="mt-2 overflow-hidden rounded-md border border-border/50">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-muted/60 text-muted-foreground">
                <th className="px-2 py-1.5 text-left font-semibold">Age</th>
                <th className="px-2 py-1.5 text-right font-semibold">Employer</th>
                <th className="px-2 py-1.5 text-right font-semibold">Employee</th>
                <th className="px-2 py-1.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {CPF_RATE_BRACKETS.map((b, i) => (
                <tr
                  key={b.label}
                  className={cn(
                    "border-t border-border/40",
                    i === bracketIdx
                      ? "bg-brand-terracotta/12 font-semibold text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <td className="px-2 py-1.5 text-left">{b.label}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {b.employer}%
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {b.employee}%
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {b.total}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {age !== null && bracketIdx >= 0 && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            Highlighted: this member&rsquo;s bracket ({CPF_RATE_BRACKETS[bracketIdx].label}, age {age}).
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

// The Annual Wage (AW) ceiling explainer for bonuses: how much of the bonus
// attracts CPF, plus the OA/SA/MA allocation table with the member's bracket
// highlighted.
function AWCeilingInfo({
  age,
  monthlyGross,
  totalBonusGross,
}: {
  age: number | null;
  monthlyGross: number;
  totalBonusGross: number;
}) {
  const allocIdx = age !== null ? getCPFAllocationBracketIndex(age) : -1;
  const bonus = computeBonusCPF(monthlyGross, totalBonusGross, age);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="About the Annual Wage ceiling"
          className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[380px] max-w-[92vw] p-4 text-left"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p className="font-display text-sm font-semibold text-foreground">
          Annual Wage (AW) Ceiling
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          The annual wage ceiling limits the total wages that attract CPF
          contributions in a calendar year.
        </p>
        <p className="mt-1.5 text-xs font-semibold text-foreground">
          The current annual wage ceiling is $
          {ANNUAL_WAGE_CEILING_AMOUNT.toLocaleString()} ({OW_CEILING_YEAR}).
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          After monthly CPF (ordinary wage capped at $
          {OW_CEILING_AMOUNT.toLocaleString()}/month), bonus CPF applies only to
          the ceiling left over.
        </p>

        <div className="mt-3 space-y-1 rounded-md bg-muted/60 px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            For this member
          </p>
          <DetailRow k="Total bonus" v={fmtMoney(totalBonusGross)} />
          <DetailRow
            k="CPF-applicable bonus"
            v={fmtMoney(bonus.cpfApplicableBonus)}
          />
        </div>

        <p className="mt-3 font-display text-xs font-semibold text-foreground">
          CPF Allocation Rates
        </p>
        <p className="text-[10px] text-muted-foreground">
          How CPF is split across OA / SA / MA, by age.
        </p>
        <div className="mt-2 overflow-hidden rounded-md border border-border/50">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-muted/60 text-muted-foreground">
                <th className="px-2 py-1.5 text-left font-semibold">Age</th>
                <th className="px-2 py-1.5 text-right font-semibold">OA</th>
                <th className="px-2 py-1.5 text-right font-semibold">SA</th>
                <th className="px-2 py-1.5 text-right font-semibold">MA</th>
              </tr>
            </thead>
            <tbody>
              {CPF_ALLOCATION_BRACKETS.map((b, i) => (
                <tr
                  key={b.label}
                  className={cn(
                    "border-t border-border/40",
                    i === allocIdx
                      ? "bg-brand-terracotta/12 font-semibold text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <td className="px-2 py-1.5 text-left">{b.label}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{b.oa}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{b.sa}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{b.ma}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface IncomeBarPopupProps {
  income: IncomeForPopup;
  initialAmount: number;
  onConfirm: (
    next: number,
    extra?: {
      accountForBonus?: boolean;
      bonusGroups?: string | null;
      subjectToCpf?: boolean;
      familyMemberAge?: number;
    }
  ) => void;
  onOpenDetail?: () => void;
  onCancel?: () => void;
  /** Recurring incomes can edit a bonus schedule inline (13th-month etc.). */
  canEditBonus?: boolean;
  /**
   * Master gate for ALL bonus UI in the popup — both the inline editor page
   * (controlled by canEditBonus) and the read-only "Bonuses" carousel page.
   * When false, no bonus page is shown regardless of stored bonus data.
   * Defaults to true so non-flagged callers keep existing behaviour.
   */
  bonusEnabled?: boolean;
  /** Open the popup directly on the Bonus tab (e.g. clicking a bonus pill). */
  openToBonus?: boolean;
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

// CPF employee/employer row: label on the left, "% of wage" chip + dollar
// amount on the right.
function CpfSplitRow({
  label,
  pct,
  amount,
}: {
  label: string;
  pct: string | null;
  amount: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-2">
        {pct && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
            {pct}
          </span>
        )}
        <span className="font-semibold tabular-nums text-foreground">
          {amount}
        </span>
      </span>
    </div>
  );
}

function buildPages(
  income: IncomeForPopup,
  opts?: { skipBonus?: boolean; skipCpf?: boolean }
): DetailPage[] {
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

  // Page 2 — CPF (read-only). When skipCpf is set, the popup builds an editable
  // CPF page (with the applicability checkbox) instead. Shows the employee/
  // employer split with each side's % of the (capped) wage, plus an
  // OW-ceiling explainer. Computed values are stored as decimal strings.
  if (!opts?.skipCpf && income.subjectToCpf) {
    const age = ageFromDob(income.familyMember?.dateOfBirth);
    const gross = Number(income.amount) || 0;
    // % of wage is derived from the stored contribution over the capped wage,
    // so it reflects the rate actually applied (and matches the age bracket).
    const cappedWage = Math.min(gross || OW_CEILING_AMOUNT, OW_CEILING_AMOUNT);
    const pctOf = (amt: string | null): string | null => {
      if (!amt || cappedWage <= 0) return null;
      const p = (Number(amt) / cappedWage) * 100;
      if (!Number.isFinite(p) || p <= 0) return null;
      return `${Math.round(p * 10) / 10}%`;
    };
    pages.push({
      key: "cpf",
      title: "CPF",
      body: (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              OW ceiling
              <OWCeilingInfo age={age} grossMonthly={gross} />
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {fmtMoney(OW_CEILING_AMOUNT)}
            </span>
          </div>
          {income.employeeCpfContribution && (
            <CpfSplitRow
              label="Employee"
              pct={pctOf(income.employeeCpfContribution)}
              amount={fmtMoney(Number(income.employeeCpfContribution))}
            />
          )}
          {income.employerCpfContribution && (
            <CpfSplitRow
              label="Employer"
              pct={pctOf(income.employerCpfContribution)}
              amount={fmtMoney(Number(income.employerCpfContribution))}
            />
          )}
          {income.netTakeHome && (
            <DetailRow
              k="Net take-home"
              v={fmtMoney(Number(income.netTakeHome))}
            />
          )}
        </div>
      ),
    });
  }

  // Page 3 — bonus months. The amount in bonusGroups is a multiplier-as-string
  // (e.g. "1.5"); render as "× 1.5x" so the user understands it scales the
  // monthly base, not adds a fixed dollar amount.
  if (!opts?.skipBonus && income.accountForBonus && income.bonusGroups) {
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

  // (Notes & changes page removed — not needed in the quick popover.)

  return pages;
}

export function IncomeBarPopup({
  income,
  initialAmount,
  onConfirm,
  onOpenDetail,
  onCancel,
  canEditBonus = false,
  bonusEnabled = true,
  openToBonus = false,
}: IncomeBarPopupProps) {
  // Typeable monthly amount (string-backed so the field can be cleared/edited
  // freely); `value` is the derived number used for confirm + the bonus math.
  const [amountStr, setAmountStr] = useState<string>(String(initialAmount));
  useEffect(() => {
    setAmountStr(String(initialAmount));
  }, [initialAmount]);
  const value = parseFloat(amountStr) || 0;

  // ─── Bonus editor state (recurring incomes only) ─────────────────────────
  const initialAccountForBonus = !!income.accountForBonus;
  const [accountForBonus, setAccountForBonus] = useState(initialAccountForBonus);
  const [bonusGroups, setBonusGroups] = useState<BonusGroupDraft[]>(() =>
    parseBonusDraft(income.bonusGroups)
  );
  useEffect(() => {
    setAccountForBonus(!!income.accountForBonus);
    setBonusGroups(parseBonusDraft(income.bonusGroups));
  }, [income.id, income.accountForBonus, income.bonusGroups]);

  const addBonusGroup = () =>
    setBonusGroups((prev) => [...prev, { month: 12, amount: "" }]);
  const updateBonusGroup = (
    idx: number,
    field: "month" | "amount",
    val: number | string
  ) =>
    setBonusGroups((prev) =>
      prev.map((g, i) => (i === idx ? { ...g, [field]: val } : g))
    );
  const removeBonusGroup = (idx: number) =>
    setBonusGroups((prev) => prev.filter((_, i) => i !== idx));

  // Cleaned/serialized bonus for save + dirty comparison.
  const cleanedBonus = bonusGroups.filter(
    (g) => g.amount !== "" && parseFloat(g.amount) > 0
  );
  const bonusOn = accountForBonus && cleanedBonus.length > 0;
  const serializedBonus = bonusOn ? JSON.stringify(cleanedBonus) : null;
  const currentBonusKey = JSON.stringify({
    on: accountForBonus,
    g: cleanedBonus,
  });
  const bonusDirty =
    canEditBonus &&
    currentBonusKey !==
      JSON.stringify({
        on: initialAccountForBonus,
        g: parseBonusDraft(income.bonusGroups),
      });

  const totalBonusMonths = cleanedBonus.reduce(
    (s, g) => s + (parseFloat(g.amount) || 0),
    0
  );
  const totalBonusGross = totalBonusMonths * value;

  // ─── CPF applicability (editable) ────────────────────────────────────────
  const initialSubjectToCpf = !!income.subjectToCpf;
  const [subjectToCpf, setSubjectToCpf] = useState(initialSubjectToCpf);
  useEffect(() => {
    setSubjectToCpf(!!income.subjectToCpf);
  }, [income.id, income.subjectToCpf]);
  const cpfDirty = subjectToCpf !== initialSubjectToCpf;
  const memberAge = ageFromDob(income.familyMember?.dateOfBirth);
  // CPF computed live from the current amount + age, so the breakdown updates
  // as the user types or toggles applicability (independent of stored values).
  const cpfRateIdx = memberAge !== null ? getCPFBracketIndex(memberAge) : 0;
  const empRatePct = CPF_RATE_BRACKETS[cpfRateIdx].employee;
  const erRatePct = CPF_RATE_BRACKETS[cpfRateIdx].employer;
  const cappedWage = Math.min(value, OW_CEILING_AMOUNT);
  const liveEmployeeCpf = subjectToCpf ? cappedWage * (empRatePct / 100) : 0;
  const liveEmployerCpf = subjectToCpf ? cappedWage * (erRatePct / 100) : 0;
  const liveNetTakeHome = value - liveEmployeeCpf;

  // Open on the Bonus tab when requested (clicking a bonus pill). Page order is
  // Overview(0), CPF(1), Bonus(2) — CPF is always present now.
  const [pageIdx, setPageIdx] = useState(() => (openToBonus ? 2 : 0));

  const pages = useMemo<DetailPage[]>(() => {
    // Overview comes from buildPages; CPF + bonus are built here (editable).
    const base = buildPages(income, { skipBonus: true, skipCpf: true });

    // Editable CPF page — always present so the user can mark an income
    // CPF-applicable (or not) via the checkbox.
    const cpfPage: DetailPage = {
      key: "cpf",
      title: "CPF",
      body: (
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={subjectToCpf}
              onCheckedChange={(v) => setSubjectToCpf(v === true)}
            />
            <span className="text-xs font-semibold text-foreground">
              CPF applicable
            </span>
          </label>
          {subjectToCpf ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  OW ceiling
                  <OWCeilingInfo age={memberAge} grossMonthly={value} />
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {fmtMoney(OW_CEILING_AMOUNT)}
                </span>
              </div>
              <CpfSplitRow
                label="Employee"
                pct={`${empRatePct}%`}
                amount={fmtMoney(liveEmployeeCpf)}
              />
              <CpfSplitRow
                label="Employer"
                pct={`${erRatePct}%`}
                amount={fmtMoney(liveEmployerCpf)}
              />
              <DetailRow k="Net take-home" v={fmtMoney(liveNetTakeHome)} />
            </div>
          ) : (
            <p className="text-xs leading-snug text-muted-foreground">
              This income isn&rsquo;t subject to CPF — take-home equals the gross
              amount.
            </p>
          )}
        </div>
      ),
    };

    if (!(canEditBonus && bonusEnabled)) return [...base, cpfPage];
    const bonusPage: DetailPage = {
      key: "bonus-edit",
      title: "Bonuses",
      body: (
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={accountForBonus}
              onCheckedChange={(v) => setAccountForBonus(v === true)}
            />
            <span className="text-xs font-semibold text-foreground">
              Account for Bonus
            </span>
          </label>
          {accountForBonus && (
            <div className="space-y-2">
              {bonusGroups.length > 0 && (
                <div className="flex gap-1.5 px-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="flex-1">Month</span>
                  <span className="w-16 shrink-0">× Months</span>
                  <span className="w-5 shrink-0" />
                </div>
              )}
              {bonusGroups.map((g, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <select
                    value={g.month}
                    onChange={(e) =>
                      updateBonusGroup(i, "month", Number(e.target.value))
                    }
                    className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-xs"
                    aria-label="Bonus month"
                  >
                    {MONTH_LABELS.map((m, idx) => (
                      <option key={idx} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    inputMode="decimal"
                    placeholder="e.g. 1.5"
                    value={g.amount}
                    onChange={(e) =>
                      updateBonusGroup(i, "amount", e.target.value)
                    }
                    className="h-8 w-16 shrink-0 text-xs"
                    aria-label="Bonus number of months"
                  />
                  <button
                    type="button"
                    onClick={() => removeBonusGroup(i)}
                    aria-label="Remove bonus"
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBonusGroup}
                className="h-8 w-full text-xs"
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Bonus
              </Button>
              {cleanedBonus.length > 0 && (
                <div className="space-y-1 rounded-md bg-muted/60 px-2.5 py-2">
                  <DetailRow
                    k="Total bonus months"
                    v={`${totalBonusMonths}`}
                  />
                  <DetailRow k="Total bonus (gross)" v={fmtMoney(totalBonusGross)} />
                </div>
              )}
              {cleanedBonus.length > 0 &&
                income.subjectToCpf &&
                (() => {
                  const age = ageFromDob(income.familyMember?.dateOfBirth);
                  const b = computeBonusCPF(value, totalBonusGross, age);
                  return (
                    <div className="space-y-1 rounded-md bg-muted/60 px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Bonus CPF
                          <AWCeilingInfo
                            age={age}
                            monthlyGross={value}
                            totalBonusGross={totalBonusGross}
                          />
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          on {fmtMoney(b.cpfApplicableBonus)}
                        </span>
                      </div>
                      <CpfSplitRow
                        label="Employee"
                        pct={`${b.employeeRatePct}%`}
                        amount={fmtMoney(b.employee)}
                      />
                      <CpfSplitRow
                        label="Employer"
                        pct={`${b.employerRatePct}%`}
                        amount={fmtMoney(b.employer)}
                      />
                    </div>
                  );
                })()}
            </div>
          )}
        </div>
      ),
    };
    return [...base, cpfPage, bonusPage];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    income,
    canEditBonus,
    bonusEnabled,
    accountForBonus,
    bonusGroups,
    cleanedBonus.length,
    totalBonusMonths,
    totalBonusGross,
    value,
    subjectToCpf,
    memberAge,
  ]);

  // Tabs are the primary nav now, so we render only the active page (the popup
  // sizes to its content instead of being padded to the tallest page).
  const activeIdx = Math.min(pageIdx, Math.max(0, pages.length - 1));

  const amountDirty = value !== initialAmount;
  const dirty = amountDirty || bonusDirty || cpfDirty;
  const handleConfirm = () => {
    const roundedAmount = Math.max(0, Math.round(value));
    const extra: {
      accountForBonus?: boolean;
      bonusGroups?: string | null;
      subjectToCpf?: boolean;
      familyMemberAge?: number;
    } = {};
    if (canEditBonus) {
      extra.accountForBonus = bonusOn;
      extra.bonusGroups = serializedBonus;
    }
    // Always send CPF applicability + age so the server recomputes the CPF
    // split for the (possibly new) amount or toggled applicability.
    extra.subjectToCpf = subjectToCpf;
    if (memberAge !== null) extra.familyMemberAge = memberAge;
    onConfirm(roundedAmount, extra);
  };

  // Short, scannable tab labels per carousel page (keyed by page.key).
  const TAB_LABELS: Record<string, string> = {
    overview: "Overview",
    cpf: "CPF",
    bonus: "Bonus",
    "bonus-edit": "Bonus",
    notes: "Notes",
  };

  return (
    <div
      data-bar-popup=""
      onPointerDown={(e) => e.stopPropagation()}
      className="w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border/40 bg-popover text-popover-foreground shadow-xl"
    >
      {/* Labelled tabs — make every page (esp. Bonus) discoverable. */}
      {pages.length > 1 && (
        <div
          role="tablist"
          aria-label="Income details"
          className="flex items-stretch gap-0.5 border-b border-border/40 px-2 pt-2"
        >
          {pages.map((page, i) => (
            <button
              key={page.key}
              type="button"
              role="tab"
              aria-selected={i === activeIdx}
              onClick={() => setPageIdx(i)}
              className={cn(
                "-mb-px flex-1 truncate border-b-2 px-1 pb-2 pt-0.5 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors",
                i === activeIdx
                  ? "border-brand-terracotta text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {TAB_LABELS[page.key] ?? page.title}
            </button>
          ))}
        </div>
      )}

      {/* Active page only — the popup sizes to its content (no tall empty gap). */}
      <div className="px-5 pt-3 pb-2">{pages[activeIdx]?.body}</div>

      <div className="border-t border-border/40 px-5 pb-4 pt-3">
        <label
          htmlFor="bar-amount-input"
          className="block text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
        >
          Monthly amount
        </label>
        <div className="mt-1.5 flex items-center justify-center">
          <span className="font-display text-3xl font-bold tracking-tight text-muted-foreground">
            $
          </span>
          <input
            id="bar-amount-input"
            type="text"
            inputMode="decimal"
            value={amountStr}
            onChange={(e) =>
              setAmountStr(e.target.value.replace(/[^0-9.]/g, ""))
            }
            onFocus={(e) => e.currentTarget.select()}
            placeholder="0"
            aria-label="Monthly amount"
            className="w-40 bg-transparent text-center font-display text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40"
          />
        </div>

        <div className="mt-3 flex gap-2">
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
