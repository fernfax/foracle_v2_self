"use client";

import * as React from "react";
import { Plus, Search, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ToolbarProps {
  /** Count chip on the left, e.g. { value: 4, label: "members" }. */
  count?: { value: number; label: string };
  /** Convenience search box on the left. */
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  /** Extra left-side content (filter selects, segmented toggles). */
  filters?: React.ReactNode;
  /** The single primary "+ Add X" action, right-aligned, filled terracotta. */
  primaryAction?: { label: string; onClick: () => void; icon?: LucideIcon };
  className?: string;
  children?: React.ReactNode;
}

/**
 * Toolbar — the elevated bar above grids/tables: count + search + filters on the
 * left, the one primary "+ Add" button on the right. Standardizes the create
 * affordance so every tab reads the same.
 */
export function Toolbar({
  count,
  search,
  filters,
  primaryAction,
  className,
  children,
}: ToolbarProps) {
  const ActionIcon = primaryAction?.icon ?? Plus;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(28,43,42,0.06)] bg-card px-3 py-2.5 shadow-card dark:border-[rgba(240,235,224,0.08)] dark:shadow-none",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
        {count && (
          <Badge variant="neutral" className="tabular-nums">
            {count.value} {count.label}
          </Badge>
        )}
        {search && (
          <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              placeholder={search.placeholder ?? "Search…"}
              className="h-9 pl-9"
            />
          </div>
        )}
        {filters}
        {children}
      </div>
      {primaryAction && (
        <Button onClick={primaryAction.onClick} className="shrink-0">
          <ActionIcon className="size-4" />
          {primaryAction.label}
        </Button>
      )}
    </div>
  );
}
