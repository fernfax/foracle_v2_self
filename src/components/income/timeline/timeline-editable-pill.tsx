"use client"

import { ReactNode, useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"

interface EditablePillProps {
  className?: string
  ariaLabel: string
  children: ReactNode
  renderEditor: (close: () => void) => ReactNode
  align?: "start" | "center" | "end"
  disabled?: boolean
}

export function TimelineEditablePill({
  className,
  ariaLabel,
  children,
  renderEditor,
  align = "center",
  disabled = false
}: EditablePillProps) {
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open && !disabled}
      onOpenChange={(v) => !disabled && setOpen(v)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "font-display mx-0.5 inline-flex items-center rounded-md border px-2 py-0.5 text-sm font-semibold transition-all",
            "focus-visible:ring-ring hover:scale-[1.02] hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
            disabled &&
              "cursor-not-allowed opacity-70 hover:scale-100 hover:shadow-none",
            className
          )}>
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-auto border-0 bg-transparent p-0 shadow-none">
        {renderEditor(() => setOpen(false))}
      </PopoverContent>
    </Popover>
  )
}

interface TextPillEditorProps {
  initial: string
  onCommit: (next: string) => void
  onCancel: () => void
  placeholder?: string
  minWidth?: number
}

export function TextPillEditor({
  initial,
  onCommit,
  onCancel,
  placeholder,
  minWidth = 200
}: TextPillEditorProps) {
  const [value, setValue] = useState(initial)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.select()
  }, [])

  const commit = () => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== initial) onCommit(trimmed)
    else onCancel()
  }

  return (
    <div
      className="border-border/40 bg-popover text-popover-foreground rounded-xl border p-2 shadow-xl"
      style={{ minWidth }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            commit()
          } else if (e.key === "Escape") {
            e.preventDefault()
            onCancel()
          }
        }}
        onBlur={commit}
        className="font-display w-full bg-transparent px-2 py-1 text-sm font-semibold focus:outline-none"
      />
    </div>
  )
}

interface DatePillEditorProps {
  initial: Date
  onCommit: (next: Date) => void
  onClear?: () => void
  clearLabel?: string
}

export function DatePillEditor({
  initial,
  onCommit,
  onClear,
  clearLabel = "No end date"
}: DatePillEditorProps) {
  return (
    <div className="border-border/40 bg-popover text-popover-foreground rounded-xl border p-2 shadow-xl">
      <Calendar
        mode="single"
        selected={initial}
        onSelect={(d) => {
          if (d) onCommit(d)
        }}
        initialFocus
      />
      {onClear && (
        <div className="flex justify-end px-1 pb-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            {clearLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
