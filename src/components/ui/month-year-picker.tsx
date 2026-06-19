"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/cn"

const MONTHS = [
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
  "Dec"
]

interface MonthYearPickerProps {
  value: Date
  onChange: (date: Date) => void
  className?: string
}

export function MonthYearPicker({
  value,
  onChange,
  className
}: MonthYearPickerProps) {
  const [viewYear, setViewYear] = useState(value.getFullYear())

  return (
    <div className={cn("w-[220px] p-3", className)}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewYear((y) => y - 1)}
          className="hover:bg-muted rounded p-1 transition-colors"
          aria-label="Previous year">
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold tabular-nums">{viewYear}</span>
        <button
          type="button"
          onClick={() => setViewYear((y) => y + 1)}
          className="hover:bg-muted rounded p-1 transition-colors"
          aria-label="Next year">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {MONTHS.map((m, i) => {
          const isSelected =
            value.getFullYear() === viewYear && value.getMonth() === i
          return (
            <button
              key={m}
              type="button"
              onClick={() => onChange(new Date(viewYear, i, 1))}
              className={cn(
                "rounded px-2 py-2 text-center text-sm transition-colors",
                isSelected
                  ? "bg-brand-jungle font-semibold text-white"
                  : "hover:bg-muted text-foreground"
              )}>
              {m}
            </button>
          )
        })}
      </div>
    </div>
  )
}
