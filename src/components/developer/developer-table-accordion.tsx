"use client"

import { useState, useTransition } from "react"
import { getTableRows } from "@/actions/developer"
import { ChevronRight } from "lucide-react"

import type {
  DeveloperTableScope,
  TableRowsResult
} from "@/lib/developer/developer-tables"
import { cn } from "@/lib/utils"

interface DeveloperTableAccordionProps {
  name: string
  scope: DeveloperTableScope
}

const SCOPE_LABEL: Record<DeveloperTableScope, string> = {
  self: "your user row",
  primaryFamily: "your family row",
  familyId: "rows where family_id = your family",
  userId: "rows where user_id = you",
  global: "global table (capped 100)"
}

export function DeveloperTableAccordion({
  name,
  scope
}: DeveloperTableAccordionProps) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<TableRowsResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    // Lazy-load on first open. The server action only runs when this accordion
    // is expanded, so navigating to /developer doesn't fan out 22 queries.
    if (next && data === null && !pending) {
      startTransition(async () => {
        try {
          const result = await getTableRows(name)
          setData(result)
          setError(null)
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e))
        }
      })
    }
  }

  return (
    <section className="border-border/40 bg-card overflow-hidden rounded-md border">
      <button
        type="button"
        onClick={handleToggle}
        className="hover:bg-muted/40 flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors"
        aria-expanded={open}>
        <span className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              "text-muted-foreground size-4 transition-transform",
              open && "rotate-90"
            )}
          />
          <span className="text-foreground font-mono text-[13px] font-semibold">
            {name}
          </span>
          <span className="text-muted-foreground text-[11px] tracking-wider uppercase">
            {SCOPE_LABEL[scope]}
          </span>
        </span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {data
            ? `${data.returned} / ${data.totalForScope}${data.truncated ? "+" : ""}`
            : pending
              ? "loading…"
              : ""}
        </span>
      </button>

      {open && (
        <div className="border-border/40 bg-background/40 border-t">
          {pending && (
            <div className="text-muted-foreground px-4 py-3 text-xs">
              Loading…
            </div>
          )}
          {error && (
            <div className="text-destructive px-4 py-3 text-xs">
              Error: {error}
            </div>
          )}
          {!pending && !error && data && <TableBody data={data} />}
        </div>
      )}
    </section>
  )
}

function TableBody({ data }: { data: TableRowsResult }) {
  if (data.rows.length === 0) {
    return (
      <div className="text-muted-foreground px-4 py-3 text-xs">
        No rows for this scope.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead className="bg-muted/30">
          <tr>
            {data.columns.map((col) => (
              <th
                key={col}
                className="border-border/40 text-muted-foreground border-b px-3 py-2 text-left font-mono text-[11px] font-semibold">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr
              key={i}
              className="border-border/20 hover:bg-muted/20 border-b last:border-b-0">
              {data.columns.map((col) => (
                <td
                  key={col}
                  className="text-foreground/80 max-w-[280px] truncate px-3 py-1.5 align-top font-mono text-[11px]"
                  title={formatCell(row[col])}>
                  {formatCell(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.truncated && (
        <div className="text-muted-foreground px-3 py-2 text-[11px]">
          Showing first {data.returned} of {data.totalForScope} rows.
        </div>
      )}
    </div>
  )
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}
