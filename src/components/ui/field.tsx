"use client"

import * as React from "react"
import { HelpCircle } from "lucide-react"

import { cn } from "@/lib/cn"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"

/**
 * Field — the canonical form-row layout (see design guide §10.3 "Field
 * anatomy"). Standardizes the label + required asterisk + helper/error stack so
 * every field across the app is composed identically:
 *   space-y-2 wrapper · Title-case Label (default variant) · "*" in text-on-danger
 *   · helper or error as 12px text below.
 *
 * The control is passed as children, so this wraps Input, Select, Textarea,
 * DatePicker, MoneyInput, etc. Set `htmlFor`/control `id` for label association,
 * and `aria-required` on the control itself when `required`.
 *
 * Pass `tooltip` to render a help icon beside the label that reveals the given
 * content on hover/focus — prefer this over hand-building a flex span with a
 * Tooltip in the `label` prop, so the label, asterisk, and icon always align.
 */
interface FieldProps {
  label?: React.ReactNode
  htmlFor?: string
  required?: boolean
  optional?: boolean
  /** Content shown in the help tooltip beside the label. */
  tooltip?: React.ReactNode
  /** Accessible label for the tooltip trigger button. */
  tooltipLabel?: string
  helper?: React.ReactNode
  error?: React.ReactNode
  className?: string
  labelClassName?: string
  children: React.ReactNode
}

function Field({
  label,
  htmlFor,
  required,
  optional,
  tooltip,
  tooltipLabel,
  helper,
  error,
  className,
  labelClassName,
  children
}: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label != null && (
        <Label htmlFor={htmlFor} className={labelClassName}>
          <span className="inline-flex items-center gap-1">
            {label}
            {required && (
              <span className="text-on-danger" aria-hidden="true">
                *
              </span>
            )}
            {optional && (
              <span className="text-muted-foreground font-normal">
                (Optional)
              </span>
            )}
            {tooltip != null && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={tooltipLabel ?? "More information"}
                      className="text-muted-foreground hover:text-foreground transition-colors">
                      <HelpCircle className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="bg-card max-w-[320px] border p-3 text-xs shadow-lg">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </span>
        </Label>
      )}
      {children}
      {error != null ? (
        <p className="text-on-danger text-xs">{error}</p>
      ) : helper != null ? (
        <p className="text-muted-foreground text-xs">{helper}</p>
      ) : null}
    </div>
  )
}

export { Field }
