"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

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
 */
interface FieldProps {
  label?: React.ReactNode
  htmlFor?: string
  required?: boolean
  optional?: boolean
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
          {label}
          {required && (
            <span className="text-on-danger" aria-hidden="true">
              {" *"}
            </span>
          )}
          {optional && (
            <span className="text-muted-foreground font-normal">
              {" "}
              (Optional)
            </span>
          )}
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
