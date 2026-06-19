"use client"

import * as React from "react"
import { format as formatDate } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { today } from "@/lib/date-helpers"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { fieldShellClassName } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"

/**
 * DatePicker — the single date field for the whole app. The trigger reuses
 * fieldShellClassName (the Input shell), so a date field is visually identical
 * to a text field (h-10, card surface, 6px radius, terracotta focus) instead of
 * the old Button-outline trigger that drifted. Wraps the existing Calendar in a
 * Popover; never a native <input type="date">. See design guide §10.3.
 */
interface DatePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  id?: string
  placeholder?: string
  /** date-fns format for the trigger label. */
  displayFormat?: string
  fromYear?: number
  toYear?: number
  /** Disable dates after today (e.g. date of birth, purchase date). */
  disableFuture?: boolean
  /** Disable dates before today (e.g. a future target/maturity date). */
  disablePast?: boolean
  /** Explicit react-day-picker matcher; overrides disableFuture/disablePast. */
  disabled?: React.ComponentProps<typeof Calendar>["disabled"]
  triggerClassName?: string
}

function DatePicker({
  value,
  onChange,
  id,
  placeholder = "Pick a date",
  displayFormat = "MMMM do, yyyy",
  fromYear = 1900,
  toYear = new Date().getFullYear(),
  disableFuture,
  disablePast,
  disabled,
  triggerClassName
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const matcher =
    disabled ??
    (disableFuture
      ? { after: today() }
      : disablePast
        ? { before: today() }
        : undefined)

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            fieldShellClassName,
            "items-center gap-2 text-left font-normal",
            !value && "text-muted-foreground",
            triggerClassName
          )}>
          <CalendarIcon className="h-4 w-4 shrink-0" />
          {value ? formatDate(value, displayFormat) : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date)
            setOpen(false)
          }}
          initialFocus
          fixedWeeks
          captionLayout="dropdown"
          fromYear={fromYear}
          toYear={toYear}
          disabled={matcher}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
