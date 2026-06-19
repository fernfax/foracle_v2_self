"use client"

import * as React from "react"
import {
  addMonths,
  addYears,
  format,
  setMonth,
  setYear,
  subMonths,
  subYears
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

type ViewMode = "days" | "months" | "years"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const [view, setView] = React.useState<ViewMode>("days")
  const selectedDate =
    "selected" in props && props.selected instanceof Date
      ? props.selected
      : new Date()
  const [displayDate, setDisplayDate] = React.useState(selectedDate)

  const months = [
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

  const currentYear = displayDate.getFullYear()
  const startYear = Math.floor(currentYear / 12) * 12
  const years = Array.from({ length: 12 }, (_, i) => startYear + i)

  const handleMonthClick = (monthIndex: number) => {
    setDisplayDate(setMonth(displayDate, monthIndex))
    setView("days")
  }

  const handleYearClick = (year: number) => {
    setDisplayDate(setYear(displayDate, year))
    setView("months")
  }

  const handlePrev = () => {
    if (view === "days") {
      setDisplayDate(subMonths(displayDate, 1))
    } else if (view === "months") {
      setDisplayDate(subYears(displayDate, 1))
    } else {
      setDisplayDate(subYears(displayDate, 12))
    }
  }

  const handleNext = () => {
    if (view === "days") {
      setDisplayDate(addMonths(displayDate, 1))
    } else if (view === "months") {
      setDisplayDate(addYears(displayDate, 1))
    } else {
      setDisplayDate(addYears(displayDate, 12))
    }
  }

  const getHeaderLabel = () => {
    if (view === "days") {
      return format(displayDate, "MMMM yyyy")
    } else if (view === "months") {
      return displayDate.getFullYear().toString()
    } else {
      return `${startYear} - ${startYear + 11}`
    }
  }

  const handleHeaderClick = () => {
    if (view === "days") {
      setView("months")
    } else if (view === "months") {
      setView("years")
    }
  }

  // Months view
  if (view === "months") {
    return (
      <div className={cn("w-[280px] p-3", className)}>
        <div className="relative mb-4 flex items-center justify-center pt-1">
          <Button
            variant="outline"
            className="absolute left-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            onClick={handlePrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <button
            onClick={handleHeaderClick}
            className="bg-muted hover:bg-muted/70 text-foreground rounded-full px-4 py-1.5 text-sm font-medium transition-colors">
            {getHeaderLabel()}
          </button>
          <Button
            variant="outline"
            className="absolute right-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            onClick={handleNext}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {months.map((month, index) => (
            <button
              key={month}
              onClick={() => handleMonthClick(index)}
              className={cn(
                "font-display text-foreground h-9 w-full rounded-md text-[13px] font-normal transition-colors",
                "hover:bg-muted/60 focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none",
                displayDate.getMonth() === index &&
                  "bg-primary text-primary-foreground hover:bg-primary"
              )}>
              {month}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Years view
  if (view === "years") {
    return (
      <div className={cn("w-[280px] p-3", className)}>
        <div className="relative mb-4 flex items-center justify-center pt-1">
          <Button
            variant="outline"
            className="absolute left-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            onClick={handlePrev}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="bg-muted rounded-full px-4 py-1.5 text-sm font-medium">
            {getHeaderLabel()}
          </span>
          <Button
            variant="outline"
            className="absolute right-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            onClick={handleNext}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => handleYearClick(year)}
              className={cn(
                "font-display text-foreground h-9 w-full rounded-md text-[13px] font-normal tabular-nums transition-colors",
                "hover:bg-muted/60 focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none",
                displayDate.getFullYear() === year &&
                  "bg-primary text-primary-foreground hover:bg-primary"
              )}>
              {year}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Days view (default)
  return (
    <div className={cn("w-[280px] p-3", className)}>
      <div className="relative mb-4 flex items-center justify-center pt-1">
        <Button
          variant="outline"
          className="absolute left-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          onClick={handlePrev}>
          <ChevronLeft className="size-4" />
        </Button>
        <button
          onClick={handleHeaderClick}
          className="bg-muted hover:bg-muted/70 text-foreground rounded-full px-4 py-1.5 text-sm font-medium transition-colors">
          {getHeaderLabel()}
        </button>
        <Button
          variant="outline"
          className="absolute right-1 size-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          onClick={handleNext}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <DayPicker
        showOutsideDays={showOutsideDays}
        month={displayDate}
        onMonthChange={setDisplayDate}
        className=""
        classNames={{
          months:
            "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "hidden",
          caption_label: "hidden",
          nav: "hidden",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "size-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
          day: cn(
            "inline-flex size-9 items-center justify-center rounded-full font-display text-[13px] font-normal text-foreground transition-colors tabular-nums",
            "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            "aria-selected:opacity-100"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "font-semibold ring-1 ring-primary/40",
          day_outside:
            "day-outside text-muted-foreground/50 aria-selected:bg-primary/30 aria-selected:text-muted-foreground",
          day_disabled: "text-muted-foreground/50",
          day_range_middle:
            "aria-selected:bg-muted aria-selected:text-foreground rounded-none",
          day_hidden: "invisible",
          ...classNames
        }}
        components={{
          IconLeft: () => <ChevronLeft className="size-4" />,
          IconRight: () => <ChevronRight className="size-4" />
        }}
        {...props}
      />
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
