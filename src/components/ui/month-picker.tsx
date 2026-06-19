"use client"

import * as React from "react"

import { cn } from "@/lib/cn"

/**
 * MonthPicker — a multi-select grid of the 12 months (see design guide §10.3).
 * Replaces the divergent month grids (one built on Button, one on native
 * <button>; selected state hardcoded as bg-black in policies vs bg-terracotta in
 * investments). Selected = bg-primary (terracotta token), unselected = the field
 * shell surface. Value is the sorted list of selected month numbers (1–12).
 */
const MONTHS = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Aug" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dec" }
]

interface MonthPickerProps {
  value: number[]
  onChange: (months: number[]) => void
  className?: string
}

function MonthPicker({ value, onChange, className }: MonthPickerProps) {
  const toggle = (month: number) => {
    onChange(
      value.includes(month)
        ? value.filter((m) => m !== month)
        : [...value, month].sort((a, b) => a - b)
    )
  }

  return (
    <div className={cn("grid grid-cols-4 gap-2 sm:grid-cols-6", className)}>
      {MONTHS.map((month) => {
        const selected = value.includes(month.value)
        return (
          <button
            key={month.value}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(month.value)}
            className={cn(
              "font-display h-9 rounded-sm border text-sm font-medium transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/40 bg-card text-foreground hover:bg-muted/60"
            )}>
            {month.label}
          </button>
        )
      })}
    </div>
  )
}

export { MonthPicker }
