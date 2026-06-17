import * as React from "react"
import { type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

export interface SectionCardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  icon?: LucideIcon
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Right side of the header — a Toolbar slot, segmented control, or buttons. */
  actions?: React.ReactNode
  /** Optional footer/legend row, separated by a hairline. */
  footer?: React.ReactNode
  bodyClassName?: string
  /** Drop body padding when the body manages its own (e.g. a flush table). */
  noBodyPadding?: boolean
}

/**
 * SectionCard — the workhorse container (hero visualizations, per-member cards,
 * table wrappers). Header row: icon chip + title/subtitle on the left, actions on
 * the right. Inherits the Card elevation; static (does not lift) by default.
 */
export function SectionCard({
  icon: Icon,
  title,
  subtitle,
  actions,
  footer,
  children,
  className,
  bodyClassName,
  noBodyPadding = false,
  ...props
}: SectionCardProps) {
  return (
    <Card className={cn("flex flex-col overflow-hidden", className)} {...props}>
      <div className="flex items-start justify-between gap-4 p-5 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="bg-muted text-muted-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
              <Icon className="size-[18px]" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-base leading-tight font-semibold tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>

      <div className={cn(!noBodyPadding && "px-5 pb-5", bodyClassName)}>
        {children}
      </div>

      {footer && (
        <div className="border-border/40 mt-auto flex items-center gap-4 border-t px-5 py-3.5 text-sm">
          {footer}
        </div>
      )}
    </Card>
  )
}
