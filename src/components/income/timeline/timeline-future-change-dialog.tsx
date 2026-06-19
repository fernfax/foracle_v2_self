"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { addMonths, format, max, parseISO, startOfMonth } from "date-fns"
import { ArrowDownRight, ArrowUpRight, CalendarDays } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { cn } from "@/lib/cn"
import type { FutureMilestone } from "@/lib/finance/future-change"
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
} from "@/lib/finance/future-change"

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

// Amount must be positive; a temporary change additionally needs its end month
// on/after the start. Together these reproduce the original `canSave` gate via
// mode:"onChange" + isValid.
const formSchema = z
  .object({
    targetMonth: z.date(),
    amount: z.string(),
    mode: z.enum(["permanent", "temporary"]),
    endMonth: z.date()
  })
  .superRefine((v, ctx) => {
    if (!(Number(v.amount) > 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: "Amount must be greater than 0"
      })
    }
    if (v.mode === "temporary" && v.endMonth < v.targetMonth) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endMonth"],
        message: "End month must be on or after the start"
      })
    }
  })
type FormValues = z.infer<typeof formSchema>

export function TimelineFutureChangeDialog({
  open,
  onOpenChange,
  incomeName,
  priorAmount,
  defaultStartMonth,
  initial,
  onSave,
  onDelete
}: FutureChangeDialogProps) {
  const [startCalOpen, setStartCalOpen] = useState(false)
  const [endCalOpen, setEndCalOpen] = useState(false)

  // Default start: the clicked month (clamped to >= this month), else next month.
  const defaultStart = (): Date => {
    const today = startOfMonth(new Date())
    if (defaultStartMonth) {
      return max([parseISO(`${defaultStartMonth}-01`), today])
    }
    return nextMonthStart()
  }

  const toFormValues = (): FormValues => {
    const start = initial
      ? parseISO(`${initial.targetMonth}-01`)
      : defaultStart()
    return {
      targetMonth: start,
      amount:
        initial?.amount != null
          ? String(initial.amount)
          : priorAmount != null
            ? String(priorAmount)
            : "",
      mode: initial?.endMonth ? "temporary" : "permanent",
      endMonth: initial?.endMonth
        ? parseISO(`${initial.endMonth}-01`)
        : addMonths(start, 6)
    }
  }

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isValid }
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: toFormValues()
  })

  const targetMonth = useWatch({ control, name: "targetMonth" })
  const amount = useWatch({ control, name: "amount" })
  const mode = useWatch({ control, name: "mode" })
  const endMonth = useWatch({ control, name: "endMonth" })

  // Re-hydrate when the dialog opens / the milestone or default month changes.
  useEffect(() => {
    if (open) reset(toFormValues())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, defaultStartMonth, priorAmount])

  // Keep end >= start (setValue is RHF, not a React setState).
  useEffect(() => {
    if (endMonth < targetMonth) setValue("endMonth", targetMonth)
  }, [targetMonth, endMonth, setValue])

  const isEdit = Boolean(initial)
  const parsedAmount = Number(amount)
  const validAmount = parsedAmount > 0 && !Number.isNaN(parsedAmount)

  // Increment / decrement classification for the live hint.
  const direction =
    priorAmount == null || !validAmount
      ? null
      : parsedAmount > priorAmount
        ? "up"
        : parsedAmount < priorAmount
          ? "down"
          : "same"

  const onSubmit = (values: FormValues) => {
    onSave({
      id: initial?.id ?? cryptoId(),
      targetMonth: format(values.targetMonth, "yyyy-MM"),
      amount: Number(values.amount),
      endMonth:
        values.mode === "temporary" ? format(values.endMonth, "yyyy-MM") : null,
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

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-2">
            {/* Permanent vs temporary */}
            <div className="grid grid-cols-2 gap-2">
              <ModeButton
                active={mode === "permanent"}
                title="Permanent"
                subtitle="Ongoing from the start month"
                onClick={() => setValue("mode", "permanent")}
              />
              <ModeButton
                active={mode === "temporary"}
                title="Temporary"
                subtitle="Reverts after an end month"
                onClick={() => setValue("mode", "temporary")}
              />
            </div>

            {/* Start month */}
            <Field label={mode === "temporary" ? "From" : "Starting month"}>
              <MonthPicker
                value={targetMonth}
                onChange={(d) => setValue("targetMonth", d)}
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
                  onChange={(d) => setValue("endMonth", d)}
                  open={endCalOpen}
                  onOpenChange={setEndCalOpen}
                />
              </Field>
            )}

            {/* New amount */}
            <div className="space-y-2">
              <Field label="New monthly amount" htmlFor="future-change-amount">
                <Controller
                  control={control}
                  name="amount"
                  render={({ field }) => (
                    <MoneyInput
                      id="future-change-amount"
                      min={0}
                      step="50"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      className="font-display text-lg font-semibold"
                      placeholder="0"
                      autoFocus={!isEdit}
                    />
                  )}
                />
              </Field>
              {priorAmount != null && (
                <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                  <span>Currently {fmtMoney(priorAmount)}.</span>
                  {direction === "up" && (
                    <span className="inline-flex items-center gap-0.5 font-semibold text-[#2E8B57]">
                      <ArrowUpRight className="size-3" /> increase
                    </span>
                  )}
                  {direction === "down" && (
                    <span className="inline-flex items-center gap-0.5 font-semibold text-[#9A6A12]">
                      <ArrowDownRight className="size-3" /> decrease
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
                type="submit"
                disabled={!isValid}
                className="bg-brand-jungle hover:bg-brand-jungle/90 text-white">
                {isEdit ? "Save" : "Apply change"}
              </Button>
            </div>
          </DialogFooter>
        </form>
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
          <CalendarDays className="text-muted-foreground mr-2 size-4" />
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
