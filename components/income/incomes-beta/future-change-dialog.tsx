"use client";

import { useEffect, useState } from "react";
import { format, parseISO, startOfMonth } from "date-fns";
import { CalendarDays } from "lucide-react";
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

export interface FutureMilestone {
  id: string;
  targetMonth: string; // "YYYY-MM"
  amount: number;
  reason?: string;
  notes?: string;
}

interface FutureChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incomeName: string;
  initial?: FutureMilestone;
  onSave: (milestone: FutureMilestone) => void;
  onDelete?: () => void;
}

export function FutureChangeDialog({
  open,
  onOpenChange,
  incomeName,
  initial,
  onSave,
  onDelete,
}: FutureChangeDialogProps) {
  const [targetMonth, setTargetMonth] = useState<Date>(() =>
    initial ? parseISO(`${initial.targetMonth}-01`) : nextMonthStart()
  );
  const [amount, setAmount] = useState<string>(() => (initial?.amount ?? "").toString());
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setTargetMonth(initial ? parseISO(`${initial.targetMonth}-01`) : nextMonthStart());
      setAmount(initial?.amount.toString() ?? "");
    }
  }, [open, initial]);

  const isEdit = Boolean(initial);
  const parsedAmount = Number(amount);
  const canSave = parsedAmount > 0 && !Number.isNaN(parsedAmount);

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: initial?.id ?? cryptoId(),
      targetMonth: format(targetMonth, "yyyy-MM"),
      amount: parsedAmount,
      reason: initial?.reason,
      notes: initial?.notes,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit future change" : "Add future change"}</DialogTitle>
          <DialogDescription>
            Set a new amount for <span className="font-semibold">{incomeName}</span>{" "}
            starting from a future month.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Starting month
            </Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start font-display"
                >
                  <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                  {format(targetMonth, "MMMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={targetMonth}
                  onSelect={(d) => {
                    if (d) {
                      setTargetMonth(startOfMonth(d));
                      setCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="future-change-amount"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              New amount
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
              {isEdit ? "Save" : "Add change"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function nextMonthStart(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

function cryptoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
