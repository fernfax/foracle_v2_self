"use client"

import * as React from "react"
import { Pencil, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface RowActionsProps {
  onEdit?: () => void
  onDelete?: () => void
  editLabel?: string
  deleteLabel?: string
  /** Hide the edit button (e.g. read-only rows that can only be removed). */
  hideEdit?: boolean
  className?: string
}

/**
 * RowActions — the standardized always-visible Edit + Delete affordance used on
 * table rows AND cards across every tab. 32px ghost icon buttons: pencil tints
 * to the brand accent on hover, trash tints to danger. No "⋯" overflow menus,
 * no hover-to-reveal. Stops propagation so it nests inside clickable rows/cards.
 */
export function RowActions({
  onEdit,
  onDelete,
  editLabel = "Edit",
  deleteLabel = "Delete",
  hideEdit = false,
  className
}: RowActionsProps) {
  const stop = (fn?: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    fn?.()
  }

  return (
    <div className={cn("flex items-center justify-end gap-1", className)}>
      {!hideEdit && onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={editLabel}
          title={editLabel}
          onClick={stop(onEdit)}
          className="text-muted-foreground hover:text-primary hover:bg-brand-terracotta/[0.1] border-transparent hover:border-transparent">
          <Pencil className="size-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={deleteLabel}
          title={deleteLabel}
          onClick={stop(onDelete)}
          className="text-muted-foreground hover:text-on-danger hover:bg-brand-alert-red/[0.1] dark:hover:text-brand-alert-red-dark border-transparent hover:border-transparent">
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  )
}
