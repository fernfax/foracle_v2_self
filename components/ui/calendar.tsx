"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { format, setMonth, setYear, addYears, subYears, addMonths, subMonths } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
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
  const selectedDate = ('selected' in props && props.selected instanceof Date) ? props.selected : new Date()
  const [displayDate, setDisplayDate] = React.useState(selectedDate)

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
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
      <div className={cn("p-3 w-[280px]", className)}>
        <div className="flex justify-center pt-1 relative items-center mb-4">
          <Button
            variant="outline"
            className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            onClick={handleHeaderClick}
            className="text-sm font-medium bg-gray-100 hover:bg-gray-200 px-4 py-1.5 rounded-full transition-colors"
          >
            {getHeaderLabel()}
          </button>
          <Button
            variant="outline"
            className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {months.map((month, index) => (
            <button
              key={month}
              onClick={() => handleMonthClick(index)}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "h-9 w-full p-0 font-normal",
                displayDate.getMonth() === index && "bg-accent text-accent-foreground"
              )}
            >
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
      <div className={cn("p-3 w-[280px]", className)}>
        <div className="flex justify-center pt-1 relative items-center mb-4">
          <Button
            variant="outline"
            className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium bg-gray-100 px-4 py-1.5 rounded-full">{getHeaderLabel()}</span>
          <Button
            variant="outline"
            className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => handleYearClick(year)}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "h-9 w-full p-0 font-normal",
                displayDate.getFullYear() === year && "bg-accent text-accent-foreground"
              )}
            >
              {year}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Days view (default)
  return (
    <div className={cn("p-3 w-[280px]", className)}>
      <div className="flex justify-center pt-1 relative items-center mb-4">
        <Button
          variant="outline"
          className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
          onClick={handlePrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          onClick={handleHeaderClick}
          className="text-sm font-medium bg-gray-100 hover:bg-gray-200 px-4 py-1.5 rounded-full transition-colors"
        >
          {getHeaderLabel()}
        </button>
        <Button
          variant="outline"
          className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
          onClick={handleNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <DayPicker
        showOutsideDays={showOutsideDays}
        month={displayDate}
        onMonthChange={setDisplayDate}
        className=""
        {...(props as any)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "hidden",
          caption_label: "hidden",
          nav: "hidden",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          IconLeft: ({ ...iconProps }) => <ChevronLeft className="h-4 w-4" />,
          IconRight: ({ ...iconProps }) => <ChevronRight className="h-4 w-4" />,
        }}
        {...props}
      />
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
