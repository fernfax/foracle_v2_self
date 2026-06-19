import * as React from "react"
import { Plus, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/cn"
import { Button } from "@/components/ui/button"

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void; icon?: LucideIcon }
  className?: string
}

/**
 * EmptyState — the consistent empty surface: centered icon tile, title, one-line
 * sub, and a primary Add button. Used wherever a tab has no rows yet.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  const ActionIcon = action?.icon ?? Plus
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className
      )}>
      <span className="bg-muted text-muted-foreground inline-flex size-14 items-center justify-center rounded-2xl">
        <Icon className="size-6" />
      </span>
      <h3 className="font-display mt-4 text-base font-semibold tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-5">
          <ActionIcon className="size-4" />
          {action.label}
        </Button>
      )}
    </div>
  )
}
