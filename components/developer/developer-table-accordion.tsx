"use client";

import { useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTableRows } from "@/lib/actions/developer";
import type { DeveloperTableScope, TableRowsResult } from "@/lib/developer-tables";

interface DeveloperTableAccordionProps {
  name: string;
  scope: DeveloperTableScope;
}

const SCOPE_LABEL: Record<DeveloperTableScope, string> = {
  self: "your user row",
  primaryFamily: "your family row",
  userId: "rows where user_id = you",
  global: "global table (capped 100)",
};

export function DeveloperTableAccordion({ name, scope }: DeveloperTableAccordionProps) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<TableRowsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    // Lazy-load on first open. The server action only runs when this accordion
    // is expanded, so navigating to /developer doesn't fan out 22 queries.
    if (next && data === null && !pending) {
      startTransition(async () => {
        try {
          const result = await getTableRows(name);
          setData(result);
          setError(null);
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        }
      });
    }
  };

  return (
    <section className="overflow-hidden rounded-md border border-border/40 bg-card">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-90"
            )}
          />
          <span className="font-mono text-[13px] font-semibold text-foreground">
            {name}
          </span>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {SCOPE_LABEL[scope]}
          </span>
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {data
            ? `${data.returned} / ${data.totalForScope}${data.truncated ? "+" : ""}`
            : pending
            ? "loading…"
            : ""}
        </span>
      </button>

      {open && (
        <div className="border-t border-border/40 bg-background/40">
          {pending && (
            <div className="px-4 py-3 text-xs text-muted-foreground">Loading…</div>
          )}
          {error && (
            <div className="px-4 py-3 text-xs text-destructive">Error: {error}</div>
          )}
          {!pending && !error && data && (
            <TableBody data={data} />
          )}
        </div>
      )}
    </section>
  );
}

function TableBody({ data }: { data: TableRowsResult }) {
  if (data.rows.length === 0) {
    return (
      <div className="px-4 py-3 text-xs text-muted-foreground">
        No rows for this scope.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead className="bg-muted/30">
          <tr>
            {data.columns.map((col) => (
              <th
                key={col}
                className="border-b border-border/40 px-3 py-2 text-left font-mono text-[11px] font-semibold text-muted-foreground"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i} className="border-b border-border/20 last:border-b-0 hover:bg-muted/20">
              {data.columns.map((col) => (
                <td
                  key={col}
                  className="max-w-[280px] truncate px-3 py-1.5 font-mono text-[11px] text-foreground/80 align-top"
                  title={formatCell(row[col])}
                >
                  {formatCell(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.truncated && (
        <div className="px-3 py-2 text-[11px] text-muted-foreground">
          Showing first {data.returned} of {data.totalForScope} rows.
        </div>
      )}
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
