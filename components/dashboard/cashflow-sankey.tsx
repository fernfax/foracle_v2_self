"use client";

/**
 * Cashflow Sankey — alternative Overview view.
 *
 * Horizontal flow (left → right):
 *
 *   incomes  →  Total Income hub  →  CPF + expense categories + savings
 *
 * Built on Recharts' `<Sankey>` so we stay inside the project's "Recharts for
 * all data viz" convention. Click a category node to drill down to its line
 * items (an extra column appears on the right); click again to collapse.
 */

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  Sankey,
  Tooltip,
  Rectangle,
} from "recharts";

// Recharts doesn't re-export `NodeProps`/`LinkProps` from its root entry, so
// we mirror the shapes here (matches `recharts/chart/Sankey` exactly).
interface SankeyNodeRenderProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: unknown;
  containerWidth?: number;
}

interface SankeyLinkRenderProps {
  sourceX: number;
  targetX: number;
  sourceY: number;
  targetY: number;
  sourceControlX: number;
  targetControlX: number;
  linkWidth: number;
  index: number;
  payload: unknown;
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers } from "lucide-react";
import { CHART_PALETTE, STATUS_COLORS } from "@/lib/chart-palette";
import {
  buildCashflowModel,
  type CashflowExpenseInput,
  type CashflowIncomeInput,
  type CashflowNode as ModelNode,
} from "@/lib/cashflow-sankey";

interface CashflowSankeyProps {
  incomes: CashflowIncomeInput[];
  expenses: CashflowExpenseInput[];
}

// Input nodes we feed into Recharts — Recharts spreads any extra fields onto
// `payload`, so we can read `id`, `kind`, `color`, `meta` back from the
// custom node/link/tooltip renderers.
interface SankeyInputNode {
  name: string;
  id: string;
  kind: ModelNode["kind"];
  value: number;
  color: string;
  meta?: ModelNode["meta"];
}

interface SankeyInputLink {
  source: number;
  target: number;
  value: number;
  /** Pre-computed link color so the custom link renderer doesn't need lookups. */
  color: string;
}

const fmt = (n: number) =>
  `$${Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function colorForKind(kind: ModelNode["kind"]): string {
  switch (kind) {
    case "cpf": return "#B8622A"; // brand-terracotta
    case "savings": return STATUS_COLORS.positive;
    case "shortfall": return STATUS_COLORS.danger;
    case "income": return "#3A6B52"; // brand-jungle
    case "hub": return "#2C3E3D"; // forest-mid
    case "category":
    case "item":
      return CHART_PALETTE[0]; // overridden per category in build step
  }
}

export function CashflowSankey({ incomes, expenses }: CashflowSankeyProps) {
  const model = useMemo(() => buildCashflowModel(incomes, expenses), [incomes, expenses]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Recharts' Sankey mutates the nodes you pass in (it overwrites `value`
  // with cumulative throughput, ~2x the real number for the hub). Snapshot
  // the real monthly amounts into a Map keyed by id *before* the data ever
  // reaches Recharts, then read from this map in the tooltip.
  const realValueById = useMemo(() => {
    const m = new Map<string, number>();
    m.set(model.hub.id, model.totalGross); // hub label uses raw income total
    for (const n of model.incomeNodes) m.set(n.id, n.value);
    for (const n of model.outflowNodes) m.set(n.id, n.value);
    for (const c of model.categories) for (const i of c.items) m.set(i.id, i.value);
    return m;
  }, [model]);
  const realTotalGross = model.totalGross;

  const expandedCategory =
    expandedId ? model.categories.find((c) => c.id === expandedId) ?? null : null;

  // Build the Recharts data graph. Categories get unique palette colors
  // assigned in the order they appear (size desc). Items inherit their
  // parent category's color so the drill-down reads as one continuous flow.
  const data = useMemo(() => {
    const nodes: SankeyInputNode[] = [];
    const idToIndex = new Map<string, number>();
    const categoryColor = new Map<string, string>();

    const addNode = (n: SankeyInputNode) => {
      idToIndex.set(n.id, nodes.length);
      nodes.push(n);
    };

    // Layer 0: incomes (+ shortfall, when present)
    for (const inc of model.incomeNodes) {
      addNode({
        id: inc.id,
        name: inc.label,
        kind: inc.kind,
        value: inc.value,
        color: colorForKind(inc.kind),
        meta: inc.meta,
      });
    }

    // Layer 1: hub
    addNode({
      id: model.hub.id,
      name: model.hub.label,
      kind: model.hub.kind,
      value: model.hub.value,
      color: colorForKind(model.hub.kind),
    });

    // Layer 2: outflows. The expanded category (if any) is swapped *in place*
    // for its item nodes — same slot, same column. Pre-assigning palette colors
    // in outflow order before we know which one is expanded keeps the colour
    // for each non-expanded category stable across drill-down toggles.
    let catIdx = 0;
    for (const out of model.outflowNodes) {
      if (out.kind === "category") {
        categoryColor.set(out.id, CHART_PALETTE[catIdx % CHART_PALETTE.length]);
        catIdx++;
      }
    }

    for (const out of model.outflowNodes) {
      if (out.kind === "category" && expandedCategory?.id === out.id) {
        // Substitute: emit item nodes in this slot, ordered just like the
        // category was (largest first). Same colour as the parent so the
        // drill-down reads as one continuous flow.
        const parentColor = categoryColor.get(out.id) ?? CHART_PALETTE[0];
        for (const item of expandedCategory.items) {
          addNode({
            id: item.id,
            name: item.name,
            kind: "item",
            value: item.value,
            color: parentColor,
            meta: { parentCategoryId: out.id },
          });
        }
        continue;
      }
      const color =
        out.kind === "category"
          ? categoryColor.get(out.id) ?? CHART_PALETTE[0]
          : colorForKind(out.kind);
      addNode({
        id: out.id,
        name: out.label,
        kind: out.kind,
        value: out.value,
        color,
      });
    }

    // Links. Color = the "outer" end (source for left half, target for right
    // half) so each ribbon reads as a continuation of its node.
    const links: SankeyInputLink[] = [];
    for (const link of model.links) {
      const s = idToIndex.get(link.sourceId);
      const t = idToIndex.get(link.targetId);
      if (s === undefined || t === undefined) continue;
      // When a category is expanded, its hub→category link's target is gone
      // from the graph (we substituted items for the category). idToIndex.get
      // returns undefined for it, so the link is naturally dropped above. We
      // re-emit hub→item links below in the same slot so d3-sankey keeps the
      // items contiguous on the right column.
      const color = nodes[t].kind === "hub" ? nodes[s].color : nodes[t].color;
      links.push({ source: s, target: t, value: link.value, color });
    }
    if (expandedCategory) {
      const hubIdx = idToIndex.get(model.hub.id);
      const parentColor = categoryColor.get(expandedCategory.id) ?? CHART_PALETTE[0];
      if (hubIdx !== undefined) {
        for (const item of expandedCategory.items) {
          const i = idToIndex.get(item.id);
          if (i === undefined) continue;
          links.push({ source: hubIdx, target: i, value: item.value, color: parentColor });
        }
      }
    }

    return { nodes, links };
  }, [model, expandedCategory]);

  // ---- Empty state -----------------------------------------------------
  if (model.incomeNodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" /> Monthly Cashflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
            Add an income to see your monthly cashflow.
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Custom renderers ------------------------------------------------

  // Place node labels OUTSIDE the diagram so they don't fight the ribbons:
  // left of node when it's a source (depth 0), right of node otherwise.
  // The hub is the only middle column, and we label it above its rectangle.
  function renderNode(props: SankeyNodeRenderProps) {
    const { x, y, width, height, payload } = props;
    const n = payload as unknown as SankeyInputNode & { depth: number };
    const isLeft = n.depth === 0;
    const isHub = n.kind === "hub";
    const isCategory = n.kind === "category";
    const isItem = n.kind === "item";
    const isInteractive = isCategory || isItem;
    const labelX = isLeft ? x - 6 : x + width + 6;
    const labelAnchor = isLeft ? "end" : "start";

    // Recharts may have mutated `n.value` (e.g. the hub gets inflated to
    // cumulative throughput). Always render the *real* monthly amount.
    const realValue = realValueById.get(n.id) ?? n.value;

    const ariaHint = isCategory
      ? ". Click to drill down."
      : isItem
        ? ". Click to return to categories."
        : "";

    return (
      <g
        role={isInteractive ? "button" : "img"}
        tabIndex={isInteractive ? 0 : -1}
        aria-label={`${n.name}, ${fmt(realValue)} monthly${ariaHint}`}
        style={{ cursor: isInteractive ? "pointer" : "default", outline: "none" }}
        onClick={() => {
          if (isCategory) setExpandedId(n.id);
          else if (isItem) setExpandedId(null);
        }}
        onKeyDown={(e) => {
          if (!isInteractive) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (isCategory) setExpandedId(n.id);
            else if (isItem) setExpandedId(null);
          }
        }}
      >
        <Rectangle
          x={x}
          y={y}
          width={width}
          height={height}
          fill={n.color}
          fillOpacity={1}
        />
        {isHub ? (
          // Hub label sits above the rectangle so it doesn't compete with the
          // ribbons crossing through.
          <text
            x={x + width / 2}
            y={y - 6}
            textAnchor="middle"
            fontSize={12}
            fontWeight={600}
            fontFamily='"Space Grotesk", system-ui, sans-serif'
            fill="#1C2B2A"
          >
            {n.name} · {fmt(realValue)}
          </text>
        ) : (
          height > 10 && (
            <text
              x={labelX}
              y={y + height / 2}
              textAnchor={labelAnchor}
              dominantBaseline="middle"
              fontSize={12}
              fontFamily='"Space Grotesk", system-ui, sans-serif'
              fill="#1C2B2A"
            >
              <tspan fontWeight={600}>{n.name}</tspan>
              <tspan dx={6} fill="rgba(28,43,42,0.6)">{fmt(realValue)}</tspan>
            </text>
          )
        )}
      </g>
    );
  }

  function renderLink(props: SankeyLinkRenderProps) {
    const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload } = props;
    // Recharts hands us the link with `source`/`target` resolved to full node
    // objects. Our colour was precomputed on the input link — recover it via
    // the link index... actually easier: we tucked it onto the link directly
    // and Recharts preserves extra fields on the link object.
    const color = (payload as unknown as SankeyInputLink).color ?? "#3A6B52";
    return (
      <path
        d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
        fill="none"
        stroke={color}
        strokeOpacity={0.42}
        strokeWidth={linkWidth}
      />
    );
  }

  // Custom tooltip — Recharts wraps the hovered item twice:
  //   entry            = payload[0]               // { name, value, payload: <wrap> }
  //   wrap             = entry.payload            // { payload: <ours>, name, value }
  //   ours             = wrap.payload             // for nodes: the input node
  //                                              // for links: { source: <wrap>, target: <wrap>, value, color }
  // Detect a link by whether `ours.source` is a node-like object.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderTooltip({ active, payload }: { active?: boolean; payload?: any }) {
    if (!active || !payload || payload.length === 0) return null;
    const entry = payload[0];
    const wrap = entry?.payload;
    const ours = wrap?.payload;
    if (!ours) return null;

    const isLink = typeof ours.source === "object" && typeof ours.target === "object";

    if (isLink) {
      // `ours.source` / `.target` are Recharts-wrapped nodes with my input
      // fields spread at the top level — `name`, `kind`, etc. are direct.
      const src = ours.source as { name?: string };
      const tgt = ours.target as { name?: string };
      const value = (ours.value as number) ?? entry.value ?? 0;
      return (
        <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm max-w-[260px]">
          <div className="font-display text-[13px] font-semibold mb-1">
            {src.name ?? "Source"} → {tgt.name ?? "Target"}
          </div>
          <div className="text-xs text-muted-foreground">
            Flow: <span className="text-foreground font-medium tabular-nums">{fmt(value)}</span>
          </div>
        </div>
      );
    }

    // Node hover. Read amounts from the snapshot map — `ours.value` and
    // even `model.*.value` are unreliable here because Recharts mutates the
    // node objects in place during layout.
    const n = ours as SankeyInputNode;
    const realValue = realValueById.get(n.id) ?? n.value;
    const pct = realTotalGross > 0 ? (realValue / realTotalGross) * 100 : 0;
    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm max-w-[260px]">
        <div className="font-display text-[13px] font-semibold mb-1">{n.name}</div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div>
            Monthly: <span className="text-foreground font-medium tabular-nums">{fmt(realValue)}</span>
          </div>
          {n.kind !== "shortfall" && n.kind !== "hub" && (
            <div>
              Share of income:{" "}
              <span className="text-foreground font-medium tabular-nums">{pct.toFixed(1)}%</span>
            </div>
          )}
          {n.kind === "income" && n.meta?.cpf != null && n.meta.cpf > 0 && (
            <div className="pt-1 mt-1 border-t border-border/50">
              <div>
                Gross: <span className="text-foreground tabular-nums">{fmt(n.meta.gross ?? 0)}</span>
              </div>
              <div>
                Employee CPF:{" "}
                <span className="text-foreground tabular-nums">{fmt(n.meta.cpf)}</span>
              </div>
              <div>
                Net take-home:{" "}
                <span className="text-foreground tabular-nums">{fmt(n.meta.net ?? 0)}</span>
              </div>
            </div>
          )}
          {n.kind === "category" && (
            <div className="pt-1 mt-1 border-t border-border/50 text-[11px]">
              Click to see line items
            </div>
          )}
          {n.kind === "item" && (
            <div className="pt-1 mt-1 border-t border-border/50 text-[11px]">
              Click to return to categories
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- Render ----------------------------------------------------------
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" /> Monthly Cashflow
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Gross income flows into the pool, then out to CPF, your expense categories, and savings.
          Click a category to break it down. Hover any node or ribbon for detail.
        </p>
      </CardHeader>
      <CardContent>
        {expandedCategory && (
          // When a category is expanded, the category bar itself is gone from
          // the diagram (the items occupy its slot). Give the user an obvious
          // way back to the categories view.
          <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm">
            <span className="text-muted-foreground">
              Showing{" "}
              <span className="font-display font-semibold text-foreground">
                {expandedCategory.name}
              </span>{" "}
              breakdown · {fmt(expandedCategory.value)} across{" "}
              {expandedCategory.items.length}{" "}
              {expandedCategory.items.length === 1 ? "item" : "items"}
            </span>
            <button
              type="button"
              onClick={() => setExpandedId(null)}
              className="rounded-md px-2 py-1 font-display text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              ← Show categories
            </button>
          </div>
        )}
        <div className="w-full h-[520px]">
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={data}
              node={renderNode}
              link={renderLink}
              nodeWidth={12}
              nodePadding={24}
              iterations={48}
              margin={{ top: 24, right: 160, bottom: 12, left: 140 }}
            >
              <Tooltip content={renderTooltip} />
            </Sankey>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <LegendDot color="#3A6B52" label="Income" />
          <LegendDot color="#B8622A" label="CPF" />
          <LegendDot color={CHART_PALETTE[0]} label="Expense categories" />
          <LegendDot color={STATUS_COLORS.positive} label="Savings" />
          {model.shortfall > 0 && <LegendDot color={STATUS_COLORS.danger} label="Shortfall" />}
        </div>
      </CardContent>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block w-2.5 h-2.5 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <span>{label}</span>
    </div>
  );
}
