"use client";

import { useEffect, useState } from "react";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { ArrowDownRight, ArrowUpRight, CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FutureMilestone } from "@/lib/future-change";

// Re-exported so existing imports from this module keep working. The pure logic
// lives in lib/future-change (no React) so calculation code can share it.
export {
  resolveEffectiveAmount,
  priorEffectiveAmount,
  activeMilestoneAt,
  type FutureMilestone,
} from "@/lib/future-change";

function cryptoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

interface FutureChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incomeName: string;
  // The current effective amount at the change's start — shown for reference and
  // used to label the change as an increment or a decrement.
  priorAmount?: number;
  // Default start month ("YYYY-MM"), e.g. the month the user clicked. Editable.
  defaultStartMonth?: string;
  initial?: FutureMilestone;
  onSave: (milestone: FutureMilestone) => void;
  onDelete?: () => void;
}

export function FutureChangeDialog({
  open,
  onOpenChange,
  incomeName,
  priorAmount,
  defaultStartMonth,
  initial,
  onSave,
  onDelete,
}: FutureChangeDialogProps) {
  const defaultStart = () =>
    defaultStartMonth ? parseISO(`${defaultStartMonth}-01`) : nextMonthStart();

  const [targetMonth, setTargetMonth] = useState<Date>(() =>
    initial ? parseISO(`${initial.targetMonth}-01`) : defaultStart()
  );
  const [amount, setAmount] = useState<string>(() =>
    (initial?.amount ?? "").toString()
  );
  // "permanent" = ongoing until a later change; "temporary" = reverts after end.
  const [mode, setMode] = useState<"permanent" | "temporary">(() =>
    initial?.endMonth ? "temporary" : "permanent"
  );
  const [endMonth, setEndMonth] = useState<Date>(() =>
    initial?.endMonth
      ? parseISO(`${initial.endMonth}-01`)
      : addMonths(initial ? parseISO(`${initial.targetMonth}-01`) : defaultStart(), 6)
  );
  const [startCalOpen, setStartCalOpen] = useState(false);
  const [endCalOpen, setEndCalOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const start = initial ? parseISO(`${initial.targetMonth}-01`) : defaultStart();
    setTargetMonth(start);
    setAmount(initial?.amount != null ? String(initial.amount) : "");
    setMode(initial?.endMonth ? "temporary" : "permanent");
    setEndMonth(initial?.endMonth ? parseISO(`${initial.endMonth}-01`) : addMonths(start, 6));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, defaultStartMonth]);

  // Keep end >= start.
  useEffect(() => {
    if (endMonth < targetMonth) setEndMonth(targetMonth);
  }, [targetMonth, endMonth]);

  const isEdit = Boolean(initial);
  const parsedAmount = Number(amount);
  const validAmount = parsedAmount > 0 && !Number.isNaN(parsedAmount);
  const canSave =
    validAmount && (mode === "permanent" || endMonth >= targetMonth);

  // Increment / decrement classification for the live hint + intent.
  const direction =
    priorAmount == null || !validAmount
      ? null
      : parsedAmount > priorAmount
      ? "up"
      : parsedAmount < priorAmount
      ? "down"
      : "same";

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: initial?.id ?? cryptoId(),
      targetMonth: format(targetMonth, "yyyy-MM"),
      amount: parsedAmount,
      endMonth: mode === "temporary" ? format(endMonth, "yyyy-MM") : null,
      reason: initial?.reason,
      notes: initial?.notes,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit income change" : "Adjust income"}</DialogTitle>
          <DialogDescription>
            Change <span className="font-semibold">{incomeName}</span> from a
            chosen month — permanently, or for a set period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Permanent vs temporary */}
          <div className="grid grid-cols-2 gap-2">
            <ModeButton
              active={mode === "permanent"}
              title="Permanent"
              subtitle="Ongoing from the start month"
              onClick={() => setMode("permanent")}
            />
            <ModeButton
              active={mode === "temporary"}
              title="Temporary"
              subtitle="Reverts after an end month"
              onClick={() => setMode("temporary")}
            />
          </div>

          {/* Start month */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {mode === "temporary" ? "From" : "Starting month"}
            </Label>
            <MonthPicker
              value={targetMonth}
              onChange={setTargetMonth}
              open={startCalOpen}
              onOpenChange={setStartCalOpen}
            />
          </div>

          {/* End month (temporary only) */}
          {mode === "temporary" && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Until (last month)
              </Label>
              <MonthPicker
                value={endMonth}
                onChange={setEndMonth}
                open={endCalOpen}
                onOpenChange={setEndCalOpen}
              />
              <p className="text-[11px] text-muted-foreground">
                After this month it reverts to {fmtMoney(priorAmount)}.
              </p>
            </div>
          )}

          {/* New amount */}
          <div className="space-y-2">
            <Label
              htmlFor="future-change-amount"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              New monthly amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="future-change-amount"
                type="number"
                min={0}
                step="50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 font-display text-lg font-semibold"
                placeholder="0"
                autoFocus={!isEdit}
              />
            </div>
            {priorAmount != null && (
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span>Currently {fmtMoney(priorAmount)}.</span>
                {direction === "up" && (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-[#2E8B57]">
                    <ArrowUpRight className="h-3 w-3" /> increase
                  </span>
                )}
                {direction === "down" && (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-[#9A6A12]">
                    <ArrowDownRight className="h-3 w-3" /> decrease
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          <div>
            {isEdit && onDelete && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onDelete();
                  onOpenChange(false);
                }}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Remove
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="bg-brand-jungle hover:bg-brand-jungle/90 text-white"
            >
              {isEdit ? "Save" : "Apply change"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeButton({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg border px-3 py-2 text-left transition-colors",
        active
          ? "border-brand-jungle bg-brand-jungle/5 ring-1 ring-brand-jungle/40"
          : "border-border/40 hover:bg-muted"
      )}
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground">{subtitle}</p>
    </button>
  );
}

function MonthPicker({
  value,
  onChange,
  open,
  onOpenChange,
}: {
  value: Date;
  onChange: (d: Date) => void;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start font-display"
        >
          <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
          {format(value, "MMMM yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            if (d) {
              onChange(startOfMonth(d));
              onOpenChange(false);
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

function nextMonthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

function fmtMoney(n: number | undefined): string {
  if (n == null) return "the prior amount";
  return `$${Math.round(n).toLocaleString()}`;
}
