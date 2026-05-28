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

import { useEffect, useMemo, useState, type CSSProperties } from "react";
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
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight, Layers } from "lucide-react";
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
  /** Visualized (sqrt-compressed + outflow-rescaled) value Recharts uses for ribbon thickness. */
  value: number;
  /** Real monthly dollar amount the ribbon represents — shown in the tooltip. */
  realValue: number;
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

// Narrow-viewport breakpoint for the chart's mobile layout. Matches Tailwind's
// `sm` (640px) so anything from phone portrait through phone landscape gets
// the compact margins, smaller labels, and stacked name/amount pairs.
function useIsNarrow(): boolean {
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isNarrow;
}

// On narrow viewports our side-margin budget is ~80px instead of ~150px, so
// long names overflow even the compact label slot. Trim to a reasonable
// width and append an ellipsis; the full name is still in the tooltip.
function truncateLabel(name: string, max: number): string {
  return name.length > max ? `${name.slice(0, max - 1).trimEnd()}…` : name;
}

export function CashflowSankey({ incomes, expenses }: CashflowSankeyProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const model = useMemo(
    () =>
      buildCashflowModel(incomes, expenses, {
        year: selectedMonth.getFullYear(),
        month: selectedMonth.getMonth() + 1,
      }),
    [incomes, expenses, selectedMonth]
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isNarrow = useIsNarrow();

  const isCurrentMonth = (() => {
    const now = new Date();
    return (
      selectedMonth.getFullYear() === now.getFullYear() &&
      selectedMonth.getMonth() === now.getMonth()
    );
  })();
  const goToPreviousMonth = () =>
    setSelectedMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const goToNextMonth = () =>
    setSelectedMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const goToCurrentMonth = () => {
    const now = new Date();
    setSelectedMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };
  const formatMonthDisplay = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Drilldown state should reset whenever the chart's data shape changes —
  // a category from May might not exist in April, so its expandedId would
  // be a dangling reference. Reset on month change to keep things tidy.
  useEffect(() => {
    setExpandedId(null);
  }, [selectedMonth]);

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

  // Hover state for the in-bar item overlay — items are NOT part of the
  // Recharts graph, so they need their own cursor-following tooltip.
  const [itemHover, setItemHover] = useState<{
    x: number;
    y: number;
    itemName: string;
    itemValue: number;
    parentName: string;
  } | null>(null);

  // Build the Recharts data graph. The graph never changes on drill-down —
  // items render as an overlay on top of the parent category's bar, so the
  // layout stays stable, items are guaranteed contiguous (inside the same
  // rectangle), and we get a clean place to attach CSS animations.
  //
  // Value compression: Sankey lays out node heights proportional to flow
  // value, so a $19k salary next to a $40 expense category leaves the small
  // categories as hair-thin ribbons and the chart half-empty. We compress
  // each side's dynamic range with sqrt — large flows still read as larger,
  // but small categories get enough vertical real estate to be visible.
  //
  // Sqrt is concave, so Σ√xᵢ ≠ √(Σxᵢ) — naively applying sqrt to every link
  // breaks Sankey's conservation invariant at the hub (sum of inflow
  // ribbons no longer equals sum of outflow ribbons), and Recharts uses
  // max(inflow, outflow) for the hub height which leaves a gap on the
  // smaller side. We restore conservation by rescaling all outflow ribbons
  // by inflowSum / outflowSum so the hub bar matches what flows into and
  // out of it visually. Real dollar amounts remain in `realValueById` for
  // every tooltip, so the user never sees compressed numbers — only the
  // visual layout changes.
  const visualize = (v: number) => Math.sqrt(Math.max(v, 0));
  const data = useMemo(() => {
    const nodes: SankeyInputNode[] = [];
    const idToIndex = new Map<string, number>();

    const addNode = (n: SankeyInputNode) => {
      idToIndex.set(n.id, nodes.length);
      nodes.push(n);
    };

    const inflowSum = model.incomeNodes.reduce(
      (acc, inc) => acc + visualize(inc.value),
      0
    );
    const outflowSum = model.outflowNodes.reduce(
      (acc, out) => acc + visualize(out.value),
      0
    );
    // Rescale outflow side so its sum matches the inflow side at the hub —
    // preserves conservation. Guard against divide-by-zero in the degenerate
    // case where the user has incomes but every outflow is exactly $0.
    const outflowScale = outflowSum > 0 ? inflowSum / outflowSum : 1;

    // Layer 0: incomes (+ shortfall, when present)
    for (const inc of model.incomeNodes) {
      addNode({
        id: inc.id,
        name: inc.label,
        kind: inc.kind,
        value: visualize(inc.value),
        color: colorForKind(inc.kind),
        meta: inc.meta,
      });
    }

    // Layer 1: hub — exactly the sum of inflows so the bar matches the
    // ribbons feeding into it.
    addNode({
      id: model.hub.id,
      name: model.hub.label,
      kind: model.hub.kind,
      value: inflowSum,
      color: colorForKind(model.hub.kind),
    });

    // Layer 2: outflows — assign categorical colors in stable order.
    let catIdx = 0;
    for (const out of model.outflowNodes) {
      const color =
        out.kind === "category"
          ? CHART_PALETTE[catIdx++ % CHART_PALETTE.length]
          : colorForKind(out.kind);
      addNode({
        id: out.id,
        name: out.label,
        kind: out.kind,
        value: visualize(out.value) * outflowScale,
        color,
      });
    }

    // Links. Color = the "outer" end (source for left half, target for right
    // half) so each ribbon reads as a continuation of its node. Outgoing
    // links from the hub get the outflow rescale so ribbon widths match
    // the rescaled outflow node heights.
    const links: SankeyInputLink[] = [];
    for (const link of model.links) {
      const s = idToIndex.get(link.sourceId);
      const t = idToIndex.get(link.targetId);
      if (s === undefined || t === undefined) continue;
      const color = nodes[t].kind === "hub" ? nodes[s].color : nodes[t].color;
      const isFromHub = nodes[s].kind === "hub";
      const linkValue =
        visualize(link.value) * (isFromHub ? outflowScale : 1);
      links.push({
        source: s,
        target: t,
        value: linkValue,
        realValue: link.value,
        color,
      });
    }

    return { nodes, links };
  }, [model]);

  // ---- Empty state -----------------------------------------------------
  if (model.incomeNodes.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Monthly Cashflow
            </CardTitle>
            <div className="flex items-center gap-2 shrink-0">
              {!isCurrentMonth && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={goToCurrentMonth}
                >
                  Current Month
                </Button>
              )}
              <div className="flex items-center justify-between bg-muted rounded-full px-1 py-1 w-[210px] sm:w-[230px]">
                <button
                  onClick={goToPreviousMonth}
                  className="p-1.5 hover:bg-muted rounded-full transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <div className="flex items-center gap-1.5 px-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{formatMonthDisplay(selectedMonth)}</span>
                </div>
                <button
                  onClick={goToNextMonth}
                  className="p-1.5 hover:bg-muted rounded-full transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground text-center px-6">
            No income recorded for {formatMonthDisplay(selectedMonth)} — try a different month or add an income.
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Custom renderers ------------------------------------------------

  // Tunable timings — kept in one place so all three transitions stay in
  // sync (dim other categories, fade the category label out, slice the bar
  // into items).
  const TRANSITION_MS = 240;
  const ITEM_STAGGER_MS = 50;

  // Place node labels OUTSIDE the diagram so they don't fight the ribbons:
  // left of node when it's a source (depth 0), right of node otherwise.
  // The hub is the only middle column, and we label it above its rectangle.
  function renderNode(props: SankeyNodeRenderProps) {
    const { x, y, width, height, payload } = props;
    const n = payload as unknown as SankeyInputNode & { depth: number };
    const isLeft = n.depth === 0;
    const isHub = n.kind === "hub";
    const isCategory = n.kind === "category";
    const labelX = isLeft ? x - 6 : x + width + 6;
    const labelAnchor = isLeft ? "end" : "start";

    // Recharts may have mutated `n.value` (e.g. the hub gets inflated to
    // cumulative throughput). Always render the *real* monthly amount.
    const realValue = realValueById.get(n.id) ?? n.value;

    const isExpandedSelf = isCategory && expandedId === n.id;
    // Dim non-focus outflow nodes (other categories, CPF, savings, shortfall)
    // when something is expanded — sources (incomes) and the hub stay bright
    // so the user can still see where the money came from.
    const isDimTarget =
      expandedId !== null &&
      !isExpandedSelf &&
      (n.kind === "category" || n.kind === "cpf" || n.kind === "savings" || n.kind === "shortfall");
    const nodeOpacity = isDimTarget ? 0.18 : 1;
    // Only opacity needs to animate (drill-down dim/fade). Recharts re-keys
    // every node on layout change, so CSS transitions on geometry never fire
    // — see the comment in the renderer for the gory details.
    const transition: CSSProperties = {
      transition: `opacity ${TRANSITION_MS}ms ease`,
    };

    return (
      <g
        role={isCategory ? "button" : "img"}
        tabIndex={isCategory ? 0 : -1}
        aria-label={`${n.name}, ${fmt(realValue)} monthly${isCategory ? (isExpandedSelf ? ". Expanded. Click to collapse." : ". Click to drill down.") : ""}`}
        aria-pressed={isCategory ? isExpandedSelf : undefined}
        style={{ cursor: isCategory ? "pointer" : "default", outline: "none" }}
        onClick={(e) => {
          if (!isCategory) return;
          // Stop the bubble — the chart's click-away handler would
          // otherwise immediately collapse us right after we expand.
          e.stopPropagation();
          setExpandedId(isExpandedSelf ? null : n.id);
        }}
        onKeyDown={(e) => {
          if (!isCategory) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setExpandedId(isExpandedSelf ? null : n.id);
          }
        }}
      >
        {/* The category/outflow rectangle stays a single solid bar even
            when expanded — the **ribbon** is what splits into sub-tendrils
            (see renderLink). Note: Recharts bakes the node's x/y into the
            React key on every layout change (`node-${i}-${x}-${y}`), so
            month-toggle remounts the whole tree fresh — CSS transitions on
            geometry never fire. Tried both styled x/y and transform-wrap
            approaches; both snapped. Leaving as plain attributes. */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={n.color}
          fillOpacity={1}
          style={{ ...transition, opacity: nodeOpacity }}
        />

        {/* Hub label sits above the rectangle so it doesn't compete with the
            ribbons crossing through. On narrow viewports we stack name above
            amount so it fits in the constrained column. */}
        {isHub ? (
          isNarrow ? (
            <text
              x={x + width / 2}
              y={y - 18}
              textAnchor="middle"
              fontSize={10}
              fontFamily='"Space Grotesk", system-ui, sans-serif'
              fill="#1C2B2A"
              style={transition}
              opacity={expandedId ? 0.6 : 1}
            >
              <tspan x={x + width / 2} fontWeight={600}>{n.name}</tspan>
              <tspan x={x + width / 2} dy={12} fill="rgba(28,43,42,0.6)">{fmt(realValue)}</tspan>
            </text>
          ) : (
            <text
              x={x + width / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              fontFamily='"Space Grotesk", system-ui, sans-serif'
              fill="#1C2B2A"
              style={transition}
              opacity={expandedId ? 0.6 : 1}
            >
              {n.name} · {fmt(realValue)}
            </text>
          )
        ) : (
          height > 10 && (
            isNarrow ? (
              // Stacked label: name on top, amount below. Easier to fit in
              // the ~80px left/right margin on phones than a single wide row.
              <text
                x={labelX}
                y={y + height / 2}
                textAnchor={labelAnchor}
                fontSize={10}
                fontFamily='"Space Grotesk", system-ui, sans-serif'
                fill="#1C2B2A"
                style={transition}
                opacity={isDimTarget ? 0.25 : 1}
              >
                <tspan x={labelX} dy={-2} fontWeight={600}>{truncateLabel(n.name, 12)}</tspan>
                <tspan x={labelX} dy={11} fill="rgba(28,43,42,0.6)">{fmt(realValue)}</tspan>
              </text>
            ) : (
              <text
                x={labelX}
                y={y + height / 2}
                textAnchor={labelAnchor}
                dominantBaseline="middle"
                fontSize={12}
                fontFamily='"Space Grotesk", system-ui, sans-serif'
                fill="#1C2B2A"
                style={transition}
                opacity={isDimTarget ? 0.25 : 1}
              >
                <tspan fontWeight={600}>{n.name}</tspan>
                <tspan dx={6} fill="rgba(28,43,42,0.6)">{fmt(realValue)}</tspan>
              </text>
            )
          )
        )}
      </g>
    );
  }

  function renderLink(props: SankeyLinkRenderProps) {
    const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload } = props;
    // Recharts hands us the link with `source`/`target` resolved to full node
    // objects. Read the colour we precomputed on the input link, and use the
    // target id to decide if this ribbon should dim when something else is
    // expanded.
    const pl = payload as unknown as SankeyInputLink & {
      source: { id?: string };
      target: { id?: string };
    };
    const color = pl.color ?? "#3A6B52";
    const sourceId = pl.source?.id;
    const targetId = pl.target?.id;
    const isHubToOutflow = sourceId === model.hub.id;
    const isFocusRibbon = expandedId !== null && targetId === expandedId;
    const dimmed = expandedId !== null && isHubToOutflow && !isFocusRibbon;
    const baseOpacity = expandedId === null ? 0.42 : dimmed ? 0.08 : 0.42;

    const transitionStyle: CSSProperties = {
      transition: `stroke-opacity ${TRANSITION_MS}ms ease`,
    };

    // ---- Focus ribbon: split into one sub-tendril per item -----------
    // The single hub→category ribbon fans out into N parallel sub-ribbons,
    // each sized to its item's share of the category. The bar at the
    // target end stays a single solid block — only the *tendril* splits.
    if (isFocusRibbon) {
      const cat = model.categories.find((c) => c.id === targetId);
      if (cat && cat.value > 0 && cat.items.length > 0) {
        const GAP = 3; // px between adjacent sub-tendrils
        const itemCount = cat.items.length;
        const contentW = Math.max(1, linkWidth - GAP * Math.max(0, itemCount - 1));
        let cumulative = -linkWidth / 2; // top edge of the original ribbon
        return (
          <g>
            {/* The original ribbon, kept rendered but fully faded out, so
                React keeps the link element mounted across drill toggles —
                lets the dim/un-dim animation on neighbours stay smooth. */}
            <path
              d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
              fill="none"
              stroke={color}
              strokeOpacity={0}
              strokeWidth={linkWidth}
              style={transitionStyle}
            />
            {cat.items.map((item, i) => {
              const itemW = (item.value / cat.value) * contentW;
              const cy = cumulative + itemW / 2;
              const subSourceY = sourceY + cy;
              const subTargetY = targetY + cy;
              cumulative += itemW + GAP;
              return (
                <path
                  key={item.id}
                  className="animate-in fade-in"
                  style={{
                    animationDuration: `${TRANSITION_MS + 100}ms`,
                    animationDelay: `${i * ITEM_STAGGER_MS}ms`,
                    animationFillMode: "backwards",
                    cursor: "pointer",
                  }}
                  d={`M${sourceX},${subSourceY}C${sourceControlX},${subSourceY} ${targetControlX},${subTargetY} ${targetX},${subTargetY}`}
                  fill="none"
                  stroke={color}
                  // Alternate opacity slightly so adjacent strands read as
                  // distinct without changing hue.
                  strokeOpacity={i % 2 === 0 ? 0.7 : 0.42}
                  strokeWidth={Math.max(1, itemW)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedId(null);
                  }}
                  onMouseMove={(e) => {
                    e.stopPropagation();
                    setItemHover({
                      x: e.clientX,
                      y: e.clientY,
                      itemName: item.name,
                      itemValue: item.value,
                      parentName: cat.name,
                    });
                  }}
                  onMouseLeave={() => setItemHover(null)}
                  aria-label={`${item.name}, ${fmt(item.value)} monthly`}
                />
              );
            })}
          </g>
        );
      }
    }

    return (
      <path
        d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
        fill="none"
        stroke={color}
        strokeOpacity={baseOpacity}
        strokeWidth={linkWidth}
        style={transitionStyle}
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
      // `ours.value` is the visualized (sqrt-compressed) ribbon width; read
      // `realValue` instead so the tooltip shows actual monthly dollars.
      const src = ours.source as { name?: string };
      const tgt = ours.target as { name?: string };
      const value = (ours.realValue as number) ?? (ours.value as number) ?? 0;
      return (
        <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm max-w-[260px]">
          <div className="font-display text-[13px] font-semibold mb-1">
            {src.name ?? "Source"} → {tgt.name ?? "Target"}
          </div>
          <div className="text-xs text-muted-foreground">
            Monthly: <span className="text-foreground font-medium tabular-nums">{fmt(value)}</span>
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
              {expandedId === n.id ? "Click to collapse" : "Click to see line items"}
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Monthly Cashflow
            </CardTitle>
            {/* Inline status text — same line height as the default description,
                so swapping between the two never reflows the chart below. */}
            {expandedCategory ? (
              <p className="text-xs text-muted-foreground mt-1">
                Showing{" "}
                <span className="font-display font-semibold text-foreground">
                  {expandedCategory.name}
                </span>{" "}
                breakdown · {fmt(expandedCategory.value)} across{" "}
                {expandedCategory.items.length}{" "}
                {expandedCategory.items.length === 1 ? "item" : "items"} ·{" "}
                <button
                  type="button"
                  onClick={() => setExpandedId(null)}
                  className="font-display font-medium text-foreground underline-offset-2 hover:underline"
                >
                  Show categories
                </button>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Gross income flows into the pool, then out to CPF, your expense categories, and savings.
                Click a category to break it down. Hover any node or ribbon for detail.
              </p>
            )}
          </div>

          {/* Month nav — mirrors the pill in DashboardHeader so users get a
              consistent control across Classic and Cashflow views. */}
          <div className="flex items-center gap-2 shrink-0">
            {!isCurrentMonth && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={goToCurrentMonth}
              >
                Current Month
              </Button>
            )}
            <div className="flex items-center justify-between bg-muted rounded-full px-1 py-1 w-[210px] sm:w-[230px]">
              <button
                onClick={goToPreviousMonth}
                className="p-1.5 hover:bg-muted rounded-full transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-1.5 px-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{formatMonthDisplay(selectedMonth)}</span>
              </div>
              <button
                onClick={goToNextMonth}
                className="p-1.5 hover:bg-muted rounded-full transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          // Mobile keeps a compact fixed height so it sits comfortably with
          // the bottom nav. Desktop fills most of the viewport below the
          // page header + card chrome — calc(90vh - 198px) is "fill" * 0.9
          // so the card stretches down but leaves a sliver of breathing room
          // at the bottom rather than abutting the viewport edge.
          className="w-full h-[340px] sm:h-[calc(90vh-198px)] sm:min-h-[400px] relative"
          // Clear the item tooltip if the cursor leaves the chart entirely.
          onMouseLeave={() => setItemHover(null)}
          // Click-away to collapse: any click that wasn't on an interactive
          // node (category bar) or item sub-tendril bubbles up to here and
          // restores the full-colour categories view. Category and item
          // handlers call stopPropagation so they don't reach this.
          onClick={() => {
            if (expandedId !== null) setExpandedId(null);
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={data}
              node={renderNode}
              link={renderLink}
              nodeWidth={isNarrow ? 8 : 12}
              nodePadding={isNarrow ? 10 : 14}
              iterations={48}
              // Disable Recharts' final ascendingY sort so the input order in
              // our outflow array (Savings + CPF first, then categories) is
              // preserved as the visual top-to-bottom order in each column.
              sort={false}
              // Narrow viewports get drastically smaller side margins so the
              // ribbons themselves get the screen width they need. Stacked
              // labels (renderNode) compensate for the lost horizontal room.
              margin={
                isNarrow
                  ? { top: 20, right: 80, bottom: 8, left: 80 }
                  : { top: 12, right: 160, bottom: 8, left: 140 }
              }
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

      {/* Cursor-following tooltip for the in-bar item segments. Items live
          outside the Recharts graph (they're an overlay on the parent bar),
          so the Recharts <Tooltip> never sees them — this fixed-positioned
          floater fills the gap. Rendered last + pointer-events: none so it
          never steals hover from anything below. */}
      {itemHover && (
        <div
          role="tooltip"
          className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm pointer-events-none animate-in fade-in"
          style={tooltipStyle(itemHover.x, itemHover.y)}
        >
          <div className="font-display text-[13px] font-semibold mb-1">{itemHover.itemName}</div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>
              Monthly:{" "}
              <span className="text-foreground font-medium tabular-nums">
                {fmt(itemHover.itemValue)}
              </span>
            </div>
            <div>
              Share of {itemHover.parentName}:{" "}
              <span className="text-foreground font-medium tabular-nums">
                {(() => {
                  const cat = model.categories.find((c) => c.name === itemHover.parentName);
                  const denom = cat?.value ?? 0;
                  return denom > 0 ? `${((itemHover.itemValue / denom) * 100).toFixed(1)}%` : "—";
                })()}
              </span>
            </div>
            <div className="pt-1 mt-1 border-t border-border/50 text-[11px]">
              Click to collapse
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function tooltipStyle(x: number, y: number): CSSProperties {
  const vw = typeof window !== "undefined" ? window.innerWidth : 9999;
  const vh = typeof window !== "undefined" ? window.innerHeight : 9999;
  const TIP_W = 240;
  const TIP_H = 120;
  const left = Math.min(Math.max(8, x + 14), vw - TIP_W - 8);
  const top = y + 14 + TIP_H > vh ? Math.max(8, y - TIP_H - 14) : y + 14;
  return { position: "fixed", left, top, zIndex: 60, maxWidth: TIP_W };
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
