"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditablePillProps {
  className?: string;
  ariaLabel: string;
  children: ReactNode;
  renderEditor: (close: () => void) => ReactNode;
  align?: "start" | "center" | "end";
  disabled?: boolean;
}

export function EditablePill({
  className,
  ariaLabel,
  children,
  renderEditor,
  align = "center",
  disabled = false,
}: EditablePillProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open && !disabled} onOpenChange={(v) => !disabled && setOpen(v)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "mx-0.5 inline-flex items-center rounded-md border px-2 py-0.5 font-display text-sm font-semibold transition-all",
            "hover:shadow-sm hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            disabled && "cursor-not-allowed opacity-70 hover:scale-100 hover:shadow-none",
            className
          )}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="p-0 border-0 bg-transparent shadow-none w-auto"
      >
        {renderEditor(() => setOpen(false))}
      </PopoverContent>
    </Popover>
  );
}

interface TextPillEditorProps {
  initial: string;
  onCommit: (next: string) => void;
  onCancel: () => void;
  placeholder?: string;
  minWidth?: number;
}

export function TextPillEditor({
  initial,
  onCommit,
  onCancel,
  placeholder,
  minWidth = 200,
}: TextPillEditorProps) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== initial) onCommit(trimmed);
    else onCancel();
  };

  return (
    <div
      className="rounded-xl border border-border/40 bg-popover text-popover-foreground p-2 shadow-xl"
      style={{ minWidth }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        onBlur={commit}
        className="w-full bg-transparent px-2 py-1 font-display text-sm font-semibold focus:outline-none"
      />
    </div>
  );
}

interface DatePillEditorProps {
  initial: Date;
  onCommit: (next: Date) => void;
  onClear?: () => void;
  clearLabel?: string;
}

export function DatePillEditor({
  initial,
  onCommit,
  onClear,
  clearLabel = "No end date",
}: DatePillEditorProps) {
  return (
    <div className="rounded-xl border border-border/40 bg-popover text-popover-foreground p-2 shadow-xl">
      <Calendar
        mode="single"
        selected={initial}
        onSelect={(d) => {
          if (d) onCommit(d);
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
  );
}
