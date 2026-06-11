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

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Sankey,
  Rectangle,
} from "recharts";
import { ResponsiveChart } from "@/components/ui/responsive-chart";

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarDays, ChevronLeft, ChevronRight, Layers, LineChart, Waves } from "lucide-react";
import { CHART_PALETTE, STATUS_COLORS } from "@/lib/chart-palette";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { MonthlyBalanceGraph } from "@/components/expenses/monthly-balance-graph";
import {
  buildCashflowModel,
  type CashflowNode as ModelNode,
} from "@/lib/cashflow-sankey";

// Permissive row shapes that satisfy both the Sankey model
// (CashflowIncomeInput/CashflowExpenseInput) and MonthlyBalanceGraph's own
// expected fields. Overview/client.tsx already passes data of this richer
// shape, so extra fields just get ignored by whichever consumer doesn't need
// them.
interface IncomeRow {
  id: string;
  name: string;
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string;
  endDate: string | null;
  incomeCategory: string | null;
  isActive: boolean | null;
  netTakeHome: string | null;
  subjectToCpf: boolean | null;
  futureMilestones: string | null;
  accountForFutureChange: boolean | null;
  accountForBonus: boolean | null;
  bonusGroups: string | null;
}

interface ExpenseRow {
  id: string;
  name: string;
  category: string;
  amount: string;
  frequency: string;
  customMonths: string | null;
  startDate: string | null;
  endDate: string | null;
  expenseCategory: string | null;
  isActive: boolean | null;
}

interface HoldingRow {
  id: string;
  userId: string;
  familyMemberId: string | null;
  bankName: string;
  holdingAmount: string;
  createdAt: Date;
  updatedAt: Date;
  familyMemberName?: string | null;
}

interface InvestmentRow {
  id: string;
  name: string;
  type: string;
  currentCapital: string;
  projectedYield: string;
  contributionAmount: string;
  contributionFrequency: string;
  customMonths: string | null;
  isActive: boolean | null;
}

interface CashflowSankeyProps {
  incomes: IncomeRow[];
  expenses: ExpenseRow[];
  /** Required for the embedded Projection view. Pass through from overview. */
  holdings?: HoldingRow[];
  /** Optional — projection's "include investments" toggle is hidden when empty. */
  investments?: InvestmentRow[];
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
  /** True for the first category in the outflow stack — the renderer draws
   *  a dashed divider above it to separate non-discretionary outflows
   *  (Savings, CPF) from discretionary spending categories. */
  isFirstCategory?: boolean;
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

export function CashflowSankey({ incomes, expenses, holdings = [], investments = [] }: CashflowSankeyProps) {
  const router = useRouter();

  // Custom hover tooltip for inflow/outflow nodes + their ribbons. Replaces the
  // Recharts <Tooltip> so it can STAY open while the cursor moves onto it — the
  // user needs to reach the "Go to …" link inside. Hover-intent: a short close
  // delay bridges the gap between the bar/ribbon and the tooltip.
  type NodeTip = {
    x: number;
    y: number;
    nodeId: string;
    name: string;
    kind: ModelNode["kind"];
    realValue: number;
    meta?: ModelNode["meta"];
    link?: "incomes" | "expenses";
  };
  const [nodeTip, setNodeTip] = useState<NodeTip | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHideTip = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };
  const scheduleHideTip = () => {
    cancelHideTip();
    hideTimer.current = setTimeout(() => setNodeTip(null), 220);
  };
  // The highlighted ("lit up") node follows whatever the tooltip is showing.
  const hoveredNodeId = nodeTip?.nodeId ?? null;

  // Navigation from a tooltip link is gated behind a confirm dialog. Clicking a
  // bar / ribbon never navigates — only the "Go to …" link does.
  const [confirmNav, setConfirmNav] = useState<"incomes" | "expenses" | null>(null);
  const NAV_TARGET: Record<"incomes" | "expenses", string> = {
    incomes: "/user?tab=incomes",
    expenses: "/expenses",
  };

  // Inner toggle between the two views of the same card.
  const [chartView, setChartView] = useState<"sankey" | "projection">("sankey");
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

  // Open the hover tooltip for a node — shared by the node rect and its ribbon,
  // so hovering the inflow/outflow BODY behaves the same as hovering the bar.
  const showNodeTip = (
    node: { id: string; name: string; kind: ModelNode["kind"]; meta?: ModelNode["meta"] },
    clientX: number,
    clientY: number
  ) => {
    cancelHideTip();
    setNodeTip({
      x: clientX,
      y: clientY,
      nodeId: node.id,
      name: node.name,
      kind: node.kind,
      realValue: realValueById.get(node.id) ?? 0,
      meta: node.meta,
      link:
        node.kind === "income"
          ? "incomes"
          : node.kind === "category"
          ? "expenses"
          : undefined,
    });
  };

  const expandedCategory =
    expandedId ? model.categories.find((c) => c.id === expandedId) ?? null : null;

  // Headline "Total Expenses" = consumption only. The model already excludes
  // savings/investment/retirement categories (they roll into Savings), so this
  // is simply the model's expense total.
  const totalSpending = model.totalExpenses;

  // Total take-home = gross income minus employee CPF. Shown alongside gross in
  // the summary so it matches the per-inflow gross/nett split. Only meaningful
  // when CPF actually applies.
  const totalNetIncome = model.totalGross - model.totalCpf;
  const showNetTotal = model.totalCpf > 0 && totalNetIncome < model.totalGross - 0.5;

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
    // Mark the first category so the renderer can draw a divider above it,
    // visually separating Savings + CPF (anchored at top) from the spending
    // categories below.
    let catIdx = 0;
    let firstCategoryMarked = false;
    for (const out of model.outflowNodes) {
      const isCategory = out.kind === "category";
      const color = isCategory
        ? CHART_PALETTE[catIdx++ % CHART_PALETTE.length]
        : colorForKind(out.kind);
      const isFirstCategory = isCategory && !firstCategoryMarked;
      if (isFirstCategory) firstCategoryMarked = true;
      addNode({
        id: out.id,
        name: out.label,
        kind: out.kind,
        value: visualize(out.value) * outflowScale,
        color,
        isFirstCategory,
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

  // Empty-state is handled inline in the Sankey branch of the main render
  // below (so the Projection toggle still works when there's no current-month
  // income — the projection may still have data from one-off / future items).
  const isEmptyForCurrentMonth = model.incomeNodes.length === 0;

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

    // For income inflows that are CPF-subject, show the take-home (nett) next
    // to the gross so the label reflects gross/nett. Only when CPF actually
    // applies (net < gross) — otherwise gross == net and the second figure is
    // noise. `realValue` is the gross for an income node.
    const netValue = n.meta?.net;
    const showNet =
      n.kind === "income" &&
      netValue != null &&
      (n.meta?.cpf ?? 0) > 0 &&
      netValue < realValue - 0.5;

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

    // Any node lights up while its tooltip is showing. Navigation never happens
    // from a node click — only from the tooltip's "Go to …" link.
    const isHovered = hoveredNodeId === n.id;

    return (
      <g
        role={isCategory ? "button" : "img"}
        tabIndex={isCategory ? 0 : -1}
        aria-label={`${n.name}, ${fmt(realValue)} monthly${
          isCategory
            ? isExpandedSelf
              ? ". Expanded. Click to collapse."
              : ". Click to drill down."
            : ""
        }`}
        aria-pressed={isCategory ? isExpandedSelf : undefined}
        style={{ cursor: isCategory ? "pointer" : "default", outline: "none" }}
        onMouseEnter={(e) => showNodeTip(n, e.clientX, e.clientY)}
        onMouseLeave={scheduleHideTip}
        onClick={(e) => {
          if (!isCategory) return;
          // Stop the bubble — the chart's click-away handler would otherwise
          // immediately collapse us right after we expand.
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
        {/* Divider above the first category bar — visually separates the
            non-discretionary outflows (Savings, CPF) at the top of the
            stack from the discretionary spending categories below. The
            line sits in the middle of the existing nodePadding gap, so it
            doesn't push the layout. Pointer-events:none so it doesn't
            interfere with hover/click on the bars or ribbons. */}
        {n.isFirstCategory && (
          <line
            x1={x - 30}
            y1={y - (isNarrow ? 5 : 7)}
            x2={x + width + 90}
            y2={y - (isNarrow ? 5 : 7)}
            stroke="rgba(28, 43, 42, 0.18)"
            strokeWidth={1}
            strokeDasharray="3 4"
            pointerEvents="none"
          />
        )}

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
          style={{
            ...transition,
            opacity: nodeOpacity,
            // Light up the hovered node (inflow or outflow): brighten + glow.
            filter: isHovered
              ? `brightness(1.15) drop-shadow(0 0 4px ${n.color})`
              : undefined,
          }}
        />

        {/* The hub no longer carries a label — the "Total Income" figure now
            lives in the totals strip below the chart, so a hub caption would
            just duplicate it. */}
        {isHub ? null : (
          height > 10 && (
            showNet ? (
              // Income with CPF: two lines — name, then "gross · net take-home"
              // so the inflow reflects gross/nett. Stacks on both layouts since
              // it's two pieces of info; "take-home" word dropped on narrow.
              <text
                x={labelX}
                y={y + height / 2}
                textAnchor={labelAnchor}
                fontSize={isNarrow ? 10 : 12}
                fontFamily='"Space Grotesk", system-ui, sans-serif'
                fill="#1C2B2A"
                style={transition}
                opacity={isDimTarget ? 0.25 : 1}
              >
                <tspan x={labelX} dy={isNarrow ? -2 : -3} fontWeight={600}>
                  {isNarrow ? truncateLabel(n.name, 12) : n.name}
                </tspan>
                <tspan x={labelX} dy={isNarrow ? 11 : 13} fill="rgba(28,43,42,0.6)">
                  {fmt(realValue)} · {fmt(netValue ?? realValue)}{isNarrow ? "" : " take-home"}
                </tspan>
              </text>
            ) : isNarrow ? (
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
      source: SankeyInputNode & { id?: string };
      target: SankeyInputNode & { id?: string };
    };
    const color = pl.color ?? "#3A6B52";
    const sourceId = pl.source?.id;
    const targetId = pl.target?.id;
    const isHubToOutflow = sourceId === model.hub.id;
    const isFocusRibbon = expandedId !== null && targetId === expandedId;
    const dimmed = expandedId !== null && isHubToOutflow && !isFocusRibbon;
    // Hovering a ribbon BODY shows the same tooltip / light-up as its node — the
    // "interesting" (non-hub) end of the ribbon.
    const tipNode = pl.source?.kind === "hub" ? pl.target : pl.source;
    const ribbonHandlers = {
      onMouseEnter: (e: { clientX: number; clientY: number }) =>
        tipNode && showNodeTip(tipNode, e.clientX, e.clientY),
      onMouseLeave: scheduleHideTip,
    };
    // The ribbon brightens with whichever node it connects to the hub.
    const linkHovered =
      hoveredNodeId !== null &&
      (sourceId === hoveredNodeId || targetId === hoveredNodeId);
    const baseOpacity = linkHovered
      ? 0.72
      : expandedId === null
      ? 0.42
      : dimmed
      ? 0.08
      : 0.42;

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
        {...ribbonHandlers}
        d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
        fill="none"
        stroke={color}
        strokeOpacity={baseOpacity}
        strokeWidth={linkWidth}
        style={transitionStyle}
      />
    );
  }

  // (Node/ribbon hover info is rendered by the custom, hoverable tooltip in the
  // render tree below — see `nodeTip`. Recharts' built-in <Tooltip> was replaced
  // because it can't stay open long enough for the user to click its link.)

  // ---- Render ----------------------------------------------------------
  const isProjection = chartView === "projection";
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              {isProjection ? "Balance Projection" : "Monthly Cashflow"}
            </CardTitle>
            {/* Inline status text — same line height as the default description,
                so swapping between the two never reflows the chart below. */}
            {isProjection ? (
              <p className="text-xs text-muted-foreground mt-1">
                Projected balance based on current recurring income, expenses, and one-off items.
              </p>
            ) : expandedCategory ? (
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

          <div data-tour="cashflow-controls" className="flex flex-col gap-2 sm:items-end shrink-0">
            {/* Sankey / Projection view toggle. */}
            <SlidingTabs
              tabs={[
                { value: "sankey", label: "Sankey", icon: Waves },
                { value: "projection", label: "Projection", icon: LineChart },
              ]}
              value={chartView}
              onValueChange={(v) => setChartView(v as "sankey" | "projection")}
            />

            {/* Month nav — only meaningful for the Sankey view (the projection
                has its own time-range controls inside MBG's header). */}
            {!isProjection && (
              <div className="flex items-center gap-2">
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
                    disabled={isCurrentMonth}
                    className="p-1.5 hover:bg-muted rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isProjection ? (
          // MBG provides its own controls (View Mode, Time Range, Investment
          // toggle), summary stats, and the chart. Rendering in embedded mode
          // skips the Card wrapper so it sits cleanly inside ours.
          <MonthlyBalanceGraph
            incomes={incomes}
            expenses={expenses}
            holdings={holdings}
            investments={investments}
            embedded
          />
        ) : isEmptyForCurrentMonth ? (
          <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground text-center px-6">
            No income recorded for {formatMonthDisplay(selectedMonth)} — try a different month, switch to Projection, or add an income.
          </div>
        ) : (
          <>
            <div
              data-tour="cashflow-diagram"
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
              <ResponsiveChart width="100%" height="100%">
                <Sankey
                  data={data}
                  node={renderNode}
                  link={renderLink}
                  nodeWidth={isNarrow ? 8 : 12}
                  nodePadding={isNarrow ? 10 : 14}
                  iterations={48}
                  // Disable Recharts' final ascendingY sort so the input order
                  // in our outflow array (Savings + CPF first, then
                  // categories) is preserved as the visual top-to-bottom
                  // order in each column.
                  sort={false}
                  // Narrow viewports get drastically smaller side margins so
                  // the ribbons themselves get the screen width they need.
                  // Stacked labels (renderNode) compensate for the lost
                  // horizontal room.
                  //
                  // The left margin reserves the space inflow labels render
                  // into (income name + amount, drawn left of the bar with
                  // textAnchor="end"). Long names like "Recurring Side Income
                  // $2,000" were clipping at the SVG edge against the old 140px
                  // budget. 220px fits the realistic longest names in full —
                  // desktop labels are intentionally NOT truncated, so the
                  // margin is what guarantees they stay visible.
                  margin={
                    isNarrow
                      ? { top: 20, right: 80, bottom: 8, left: 80 }
                      : { top: 12, right: 160, bottom: 8, left: 220 }
                  }
                >
                </Sankey>
              </ResponsiveChart>
            </div>

            {/* Column totals — total income sits under the inflow (left),
                total expenses under the outflow (right), mirroring the two
                sides of the diagram. */}
            <div className="mt-1 flex items-center justify-between gap-3 text-xs sm:text-sm font-display pr-12 sm:pr-0">
              <div className="text-left">
                <span className="text-muted-foreground">Total Income</span>{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {fmt(model.totalGross)}
                </span>
                {showNetTotal && (
                  <span className="text-muted-foreground tabular-nums">
                    {" · "}
                    {fmt(totalNetIncome)}
                    <span className="hidden sm:inline"> take-home</span>
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-muted-foreground">Total Expenses</span>{" "}
                <span className="font-semibold text-foreground tabular-nums">
                  {fmt(totalSpending)}
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <LegendDot color="#3A6B52" label="Income" />
              <LegendDot color="#B8622A" label="CPF" />
              <LegendDot color={CHART_PALETTE[0]} label="Expense categories" />
              <LegendDot color={STATUS_COLORS.positive} label="Savings" />
              {model.shortfall > 0 && <LegendDot color={STATUS_COLORS.danger} label="Shortfall" />}
            </div>
          </>
        )}
      </CardContent>

      {/* Cursor-following tooltip for the in-bar item segments. Items live
          outside the Recharts graph (they're an overlay on the parent bar),
          so the Recharts <Tooltip> never sees them — this fixed-positioned
          floater fills the gap. Rendered last + pointer-events: none so it
          never steals hover from anything below. */}
      {itemHover && typeof document !== "undefined" && createPortal(
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
        </div>,
        document.body
      )}

      {/* Hoverable node/ribbon tooltip. Unlike the Recharts default it has
          pointer-events:auto and a hover-intent close delay, so the cursor can
          travel onto it and click the "Go to …" link. Hovering a bar OR its
          ribbon opens it (see showNodeTip in renderNode/renderLink). */}
      {/* Portaled to <body> so its position:fixed is viewport-relative — a
          transformed ancestor (the app shell) would otherwise offset it by the
          sidebar width, the "far from cursor" bug. */}
      {nodeTip && typeof document !== "undefined" && createPortal(
        <div
          role="tooltip"
          className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm animate-in fade-in"
          style={{ ...tooltipStyle(nodeTip.x, nodeTip.y), pointerEvents: "auto" }}
          onMouseEnter={cancelHideTip}
          onMouseLeave={scheduleHideTip}
        >
          <div className="font-display text-[13px] font-semibold mb-1">{nodeTip.name}</div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>
              Monthly:{" "}
              <span className="text-foreground font-medium tabular-nums">
                {fmt(nodeTip.realValue)}
              </span>
            </div>
            {nodeTip.kind !== "shortfall" && nodeTip.kind !== "hub" && (
              <div>
                Share of income:{" "}
                <span className="text-foreground font-medium tabular-nums">
                  {(realTotalGross > 0 ? (nodeTip.realValue / realTotalGross) * 100 : 0).toFixed(1)}%
                </span>
              </div>
            )}
            {nodeTip.kind === "income" && nodeTip.meta?.cpf != null && nodeTip.meta.cpf > 0 && (
              <div className="pt-1 mt-1 border-t border-border/50">
                <div>
                  Gross:{" "}
                  <span className="text-foreground tabular-nums">{fmt(nodeTip.meta.gross ?? 0)}</span>
                </div>
                <div>
                  Employee CPF:{" "}
                  <span className="text-foreground tabular-nums">{fmt(nodeTip.meta.cpf)}</span>
                </div>
                <div>
                  Net take-home:{" "}
                  <span className="text-foreground tabular-nums">{fmt(nodeTip.meta.net ?? 0)}</span>
                </div>
              </div>
            )}
            {nodeTip.kind === "category" && (
              <div className="pt-1 mt-1 text-[11px]">
                {expandedId === nodeTip.nodeId
                  ? "Click the bar to collapse"
                  : "Click the bar to see line items"}
              </div>
            )}
            {nodeTip.link && (
              <div className="pt-1.5 mt-1.5 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => {
                    const target = nodeTip.link!;
                    cancelHideTip();
                    setNodeTip(null);
                    setConfirmNav(target);
                  }}
                  className="inline-flex items-center gap-1 font-medium text-brand-terracotta hover:underline"
                >
                  {nodeTip.link === "incomes" ? "Go to Incomes" : "Go to Expenses"}{" "}
                  <span aria-hidden>→</span>
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Confirm before leaving the dashboard. Only the tooltip link opens this;
          clicking a bar or ribbon never navigates. */}
      <AlertDialog
        open={confirmNav !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmNav(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmNav === "expenses" ? "Go to Expenses?" : "Go to Incomes?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll leave the dashboard and open the{" "}
              {confirmNav === "expenses" ? "Expenses" : "Incomes"} page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmNav(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmNav) router.push(NAV_TARGET[confirmNav]);
                setConfirmNav(null);
              }}
              className="bg-brand-terracotta hover:bg-brand-terracotta/90 text-white"
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function tooltipStyle(x: number, y: number): CSSProperties {
  const vw = typeof window !== "undefined" ? window.innerWidth : 9999;
  const vh = typeof window !== "undefined" ? window.innerHeight : 9999;
  const TIP_W = 240;
  const TIP_H = 160;
  const OFFSET = 14;
  // Flip to the other side of the cursor (rather than clamping) when it would
  // overflow, so the tooltip always sits right next to the pointer.
  const left =
    x + OFFSET + TIP_W > vw ? Math.max(8, x - OFFSET - TIP_W) : x + OFFSET;
  const top =
    y + OFFSET + TIP_H > vh ? Math.max(8, y - OFFSET - TIP_H) : y + OFFSET;
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
