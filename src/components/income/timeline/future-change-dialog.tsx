"use client"

import { useEffect, useState } from "react"
import { addMonths, format, max, parseISO, startOfMonth } from "date-fns"
import { ArrowDownRight, ArrowUpRight, CalendarDays } from "lucide-react"

import type { FutureMilestone } from "@/lib/future-change"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { MoneyInput } from "@/components/ui/money-input"
import { MonthYearPicker } from "@/components/ui/month-year-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"

// Re-exported so existing imports from this module keep working. The pure logic
// lives in lib/future-change (no React) so calculation code can share it.
export {
  resolveEffectiveAmount,
  priorEffectiveAmount,
  activeMilestoneAt,
  type FutureMilestone
} from "@/lib/future-change"

function cryptoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

interface FutureChangeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  incomeName: string
  // The current effective amount at the change's start — shown for reference and
  // used to label the change as an increment or a decrement.
  priorAmount?: number
  // Default start month ("YYYY-MM"), e.g. the month the user clicked. Editable.
  defaultStartMonth?: string
  initial?: FutureMilestone
  onSave: (milestone: FutureMilestone) => void
  onDelete?: () => void
}

export function FutureChangeDialog({
  open,
  onOpenChange,
  incomeName,
  priorAmount,
  defaultStartMonth,
  initial,
  onSave,
  onDelete
}: FutureChangeDialogProps) {
  const defaultStart = () => {
    const today = startOfMonth(new Date())
    if (defaultStartMonth) {
      const proposed = parseISO(`${defaultStartMonth}-01`)
      return max([proposed, today])
    }
    return nextMonthStart()
  }

  const [targetMonth, setTargetMonth] = useState<Date>(() =>
    initial ? parseISO(`${initial.targetMonth}-01`) : defaultStart()
  )
  const [amount, setAmount] = useState<string>(() =>
    initial?.amount != null
      ? String(initial.amount)
      : priorAmount != null
        ? String(priorAmount)
        : ""
  )
  // "permanent" = ongoing until a later change; "temporary" = reverts after end.
  const [mode, setMode] = useState<"permanent" | "temporary">(() =>
    initial?.endMonth ? "temporary" : "permanent"
  )
  const [endMonth, setEndMonth] = useState<Date>(() =>
    initial?.endMonth
      ? parseISO(`${initial.endMonth}-01`)
      : addMonths(
          initial ? parseISO(`${initial.targetMonth}-01`) : defaultStart(),
          6
        )
  )
  const [startCalOpen, setStartCalOpen] = useState(false)
  const [endCalOpen, setEndCalOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const start = initial
      ? parseISO(`${initial.targetMonth}-01`)
      : defaultStart()
    setTargetMonth(start)
    setAmount(
      initial?.amount != null
        ? String(initial.amount)
        : priorAmount != null
          ? String(priorAmount)
          : ""
    )
    setMode(initial?.endMonth ? "temporary" : "permanent")
    setEndMonth(
      initial?.endMonth
        ? parseISO(`${initial.endMonth}-01`)
        : addMonths(start, 6)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, defaultStartMonth])

  // Keep end >= start.
  useEffect(() => {
    if (endMonth < targetMonth) setEndMonth(targetMonth)
  }, [targetMonth, endMonth])

  const isEdit = Boolean(initial)
  const parsedAmount = Number(amount)
  const validAmount = parsedAmount > 0 && !Number.isNaN(parsedAmount)
  const canSave =
    validAmount && (mode === "permanent" || endMonth >= targetMonth)

  // Increment / decrement classification for the live hint + intent.
  const direction =
    priorAmount == null || !validAmount
      ? null
      : parsedAmount > priorAmount
        ? "up"
        : parsedAmount < priorAmount
          ? "down"
          : "same"

  const handleSave = () => {
    if (!canSave) return
    onSave({
      id: initial?.id ?? cryptoId(),
      targetMonth: format(targetMonth, "yyyy-MM"),
      amount: parsedAmount,
      endMonth: mode === "temporary" ? format(endMonth, "yyyy-MM") : null,
      reason: initial?.reason,
      notes: initial?.notes
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit income change" : "Adjust income"}
          </DialogTitle>
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
          <Field label={mode === "temporary" ? "From" : "Starting month"}>
            <MonthPicker
              value={targetMonth}
              onChange={setTargetMonth}
              open={startCalOpen}
              onOpenChange={setStartCalOpen}
            />
          </Field>

          {/* End month (temporary only) */}
          {mode === "temporary" && (
            <Field
              label="Until (last month)"
              helper={`After this month it reverts to ${fmtMoney(priorAmount)}.`}>
              <MonthPicker
                value={endMonth}
                onChange={setEndMonth}
                open={endCalOpen}
                onOpenChange={setEndCalOpen}
              />
            </Field>
          )}

          {/* New amount */}
          <div className="space-y-2">
            <Field label="New monthly amount" htmlFor="future-change-amount">
              <MoneyInput
                id="future-change-amount"
                min={0}
                step="50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="font-display text-lg font-semibold"
                placeholder="0"
                autoFocus={!isEdit}
              />
            </Field>
            {priorAmount != null && (
              <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
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

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {isEdit && onDelete && (
              <Button
                type="button"
                variant="destructiveGhost"
                onClick={() => {
                  onDelete()
                  onOpenChange(false)
                }}>
                Remove
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="bg-brand-jungle hover:bg-brand-jungle/90 text-white">
              {isEdit ? "Save" : "Apply change"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ModeButton({
  active,
  title,
  subtitle,
  onClick
}: {
  active: boolean
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg border px-3 py-2 text-left transition-colors",
        active
          ? "border-brand-jungle bg-brand-jungle/5 ring-brand-jungle/40 ring-1"
          : "border-border/40 hover:bg-muted"
      )}>
      <p className="text-foreground text-sm font-semibold">{title}</p>
      <p className="text-muted-foreground text-[11px]">{subtitle}</p>
    </button>
  )
}

function MonthPicker({
  value,
  onChange,
  open,
  onOpenChange
}: {
  value: Date
  onChange: (d: Date) => void
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="font-display w-full justify-start">
          <CalendarDays className="text-muted-foreground mr-2 h-4 w-4" />
          {format(value, "MMMM yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <MonthYearPicker
          value={value}
          onChange={(d) => {
            onChange(d)
            onOpenChange(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function nextMonthStart(): Date {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 1)
}

function fmtMoney(n: number | undefined): string {
  if (n == null) return "the prior amount"
  return `$${Math.round(n).toLocaleString()}`
}
