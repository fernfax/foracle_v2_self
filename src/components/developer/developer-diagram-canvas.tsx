"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node
} from "@xyflow/react"
import { createPortal } from "react-dom"

import "@xyflow/react/dist/style.css"

import { X } from "lucide-react"

import { CATEGORY_COLOR } from "@/lib/developer/developer-action-catalog"
import type {
  Diagram,
  DiagramNode,
  DiagramNodeKind
} from "@/lib/developer/developer-diagram"
import { cn } from "@/lib/utils"

interface DiagramCanvasProps {
  diagram: Diagram
}

// Hydration flag without a setState-in-effect: the server snapshot is `false`
// and the client snapshot is `true`, so the component renders as unmounted on
// the server / first paint, then re-renders mounted after hydration. No-op
// subscribe — the value never changes after mount.
const emptySubscribe = () => () => {}
function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

const COLUMN_WIDTH = 240 // horizontal stride between columns
const HEADER_Y = -52
const SHARED_COL_LABEL = "Shared"
const API_COL_LABEL = "API"

const NODE_COLOR: Record<
  DiagramNodeKind,
  { bg: string; border: string; text: string }
> = {
  // Subtle, brand-consistent. Page = primary (terracotta), Action = jungle, Table = teal, API = sand.
  page: { bg: "#FBE5D4", border: "#E5895B", text: "#5C2E14" },
  api: { bg: "#F2EAD3", border: "#C8A95F", text: "#5C4810" },
  action: { bg: "#D9E5DF", border: "#2F5D52", text: "#1F3D36" },
  table: { bg: "#C9E9E2", border: "#00857A", text: "#003F38" }
}

const LEGEND_ENTRIES: Array<{
  kind: DiagramNodeKind
  label: string
  hint: string
}> = [
  { kind: "page", label: "Page", hint: "App router route (app/.../page.tsx)" },
  { kind: "api", label: "API route", hint: "app/api/.../route.ts" },
  {
    kind: "action",
    label: "Server action",
    hint: "lib/actions/*.ts exported function"
  },
  { kind: "table", label: "DB table", hint: "db/schema.ts pgTable export" }
]

const NODE_WIDTH = 240
const NODE_HEIGHT = 36
const ROW_GAP = 12

export function DeveloperDiagramCanvas({ diagram }: DiagramCanvasProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // The mobile sheet is portaled to <body> so it escapes the app shell's
  // `contain: layout paint` wrapper, which otherwise traps `position: fixed`
  // and parks the sheet off-screen. Portals need the DOM, so gate on mount.
  const mounted = useMounted()

  const { rfNodes, rfEdges } = useMemo(() => buildLayout(diagram), [diagram])

  // Neighbour set for highlighting.
  const neighbourIds = useMemo(() => {
    if (!selectedId) return null
    const set = new Set<string>([selectedId])
    for (const e of diagram.edges) {
      if (e.source === selectedId) set.add(e.target)
      if (e.target === selectedId) set.add(e.source)
    }
    return set
  }, [selectedId, diagram.edges])

  const styledNodes: Node[] = useMemo(() => {
    return rfNodes.map((n) => {
      if (n.data?.isHeader) return n
      const dimmed = neighbourIds && !neighbourIds.has(n.id)
      const isSelected = selectedId === n.id
      const kind = (n.data?.kind as DiagramNodeKind) ?? "page"
      const palette = NODE_COLOR[kind]
      return {
        ...n,
        style: {
          ...n.style,
          background: palette.bg,
          color: palette.text,
          border: `1.5px solid ${isSelected ? palette.text : palette.border}`,
          borderRadius: 6,
          padding: "6px 10px",
          fontSize: 11,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          width: NODE_WIDTH,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          opacity: dimmed ? 0.25 : 1,
          boxShadow: isSelected ? "0 0 0 2px rgba(0,0,0,0.08)" : undefined,
          cursor: "pointer"
        }
      }
    })
  }, [rfNodes, neighbourIds, selectedId])

  const styledEdges: Edge[] = useMemo(() => {
    return rfEdges.map((e) => {
      const incident =
        !selectedId || e.source === selectedId || e.target === selectedId
      const stroke = incident ? "#7A6E63" : "#D9D2C8"
      return {
        ...e,
        style: {
          ...e.style,
          stroke,
          strokeWidth: incident && selectedId ? 1.6 : 1,
          opacity: incident ? 0.85 : 0.25
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: stroke,
          width: 16,
          height: 16
        }
      }
    })
  }, [rfEdges, selectedId])

  const selectedNode = useMemo(
    () => diagram.nodes.find((n) => n.id === selectedId) ?? null,
    [diagram.nodes, selectedId]
  )

  const incidentEdges = useMemo(() => {
    if (!selectedId) return { incoming: [], outgoing: [] }
    const incoming: DiagramNode[] = []
    const outgoing: DiagramNode[] = []
    const byId = new Map(diagram.nodes.map((n) => [n.id, n]))
    for (const e of diagram.edges) {
      if (e.target === selectedId) {
        const src = byId.get(e.source)
        if (src) incoming.push(src)
      }
      if (e.source === selectedId) {
        const tgt = byId.get(e.target)
        if (tgt) outgoing.push(tgt)
      }
    }
    return { incoming, outgoing }
  }, [diagram, selectedId])

  return (
    <div className="border-border/40 bg-card relative h-[calc(100vh-160px)] w-full overflow-hidden rounded-md border">
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodeClick={(_, n) => {
          if (n.data?.isHeader) return
          setSelectedId(n.id)
        }}
        onPaneClick={() => setSelectedId(null)}
        fitView
        proOptions={{ hideAttribution: true }}
        minZoom={0.2}
        maxZoom={2}>
        <Background gap={20} size={1} color="#E9E2D6" />
        {/* Zoom controls + minimap eat scarce space on phones — desktop only.
            `desktop:` (≥768px AND ≥600px tall) matches the app's mobile/sidebar
            split so the diagram chrome appears exactly when the sidebar does. */}
        <Controls showInteractive={false} className="desktop:!flex !hidden" />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(0,0,0,0.05)"
          className="desktop:!block !hidden"
        />
      </ReactFlow>

      <Legend />

      {/* Desktop: in-canvas panel, top-right. Hidden below the `desktop`
          breakpoint where the bottom sheet (portaled below) takes over. */}
      {selectedNode && (
        <aside className="border-border/40 bg-background/95 desktop:block absolute top-3 right-3 z-10 hidden max-h-[calc(100%-1.5rem)] w-80 overflow-y-auto rounded-md border p-4 shadow-lg backdrop-blur">
          <NodeDetails
            node={selectedNode}
            incoming={incidentEdges.incoming}
            outgoing={incidentEdges.outgoing}
            onClose={() => setSelectedId(null)}
          />
        </aside>
      )}

      {/* Mobile: fixed bottom sheet portaled to <body> so it escapes the app
          shell's `contain: layout paint` containing block (which traps
          position:fixed). Sits above the mobile bottom-nav (z-50 pill). */}
      {selectedNode &&
        mounted &&
        createPortal(
          <aside className="border-border/40 bg-background/95 desktop:hidden fixed inset-x-2 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[60] max-h-[55svh] overflow-y-auto rounded-md border p-4 shadow-lg backdrop-blur">
            <NodeDetails
              node={selectedNode}
              incoming={incidentEdges.incoming}
              outgoing={incidentEdges.outgoing}
              onClose={() => setSelectedId(null)}
            />
          </aside>,
          document.body
        )}
    </div>
  )
}

function NodeDetails({
  node,
  incoming,
  outgoing,
  onClose
}: {
  node: DiagramNode
  incoming: DiagramNode[]
  outgoing: DiagramNode[]
  onClose: () => void
}) {
  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-block rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase"
              )}
              style={{
                background: NODE_COLOR[node.kind].bg,
                color: NODE_COLOR[node.kind].text
              }}>
              {node.kind}
            </span>
            {node.category && (
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase"
                style={{
                  background: CATEGORY_COLOR[node.category].bg,
                  color: CATEGORY_COLOR[node.category].text
                }}>
                {node.category}
              </span>
            )}
          </div>
          <p className="text-foreground mt-1 font-mono text-[13px] font-semibold break-words">
            {node.label}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:bg-muted/60 hover:text-foreground rounded-full p-1">
          <X className="size-4" />
        </button>
      </div>

      {node.description && (
        <p className="text-muted-foreground mb-3 text-[12px] leading-relaxed">
          {node.description}
        </p>
      )}

      <dl className="space-y-1.5 text-[11px]">
        {node.filePath && <Row label="File" value={node.filePath} mono />}
        {node.route && <Row label="Route" value={node.route} mono />}
        {node.dbName && <Row label="DB name" value={node.dbName} mono />}
      </dl>

      <NeighbourList title="Reads / depends on" nodes={outgoing} />
      <NeighbourList title="Used by" nodes={incoming} />
    </>
  )
}

function Row({
  label,
  value,
  mono
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd
        className={cn("text-foreground min-w-0 truncate", mono && "font-mono")}
        title={value}>
        {value}
      </dd>
    </div>
  )
}

function Legend() {
  return (
    <div className="border-border/40 bg-background/95 absolute top-3 left-3 z-10 rounded-md border px-3 py-2 shadow-sm backdrop-blur">
      <p className="text-muted-foreground mb-1.5 text-[9px] font-bold tracking-wider uppercase">
        Legend
      </p>
      <ul className="space-y-1">
        {LEGEND_ENTRIES.map((entry) => {
          const palette = NODE_COLOR[entry.kind]
          return (
            <li
              key={entry.kind}
              className="flex items-center gap-2 text-[11px]"
              title={entry.hint}>
              <span
                aria-hidden="true"
                className="inline-block h-3.5 w-5 rounded-sm"
                style={{
                  background: palette.bg,
                  border: `1.5px solid ${palette.border}`
                }}
              />
              <span className="text-foreground">{entry.label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function NeighbourList({
  title,
  nodes
}: {
  title: string
  nodes: DiagramNode[]
}) {
  if (nodes.length === 0) return null
  return (
    <div className="mt-3">
      <h4 className="text-muted-foreground mb-1 text-[10px] font-bold tracking-wider uppercase">
        {title} ({nodes.length})
      </h4>
      <ul className="space-y-0.5">
        {nodes.map((n) => (
          <li key={n.id} className="flex items-center gap-1.5 text-[11px]">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: NODE_COLOR[n.kind].border }}
            />
            <span
              className="text-foreground/80 truncate font-mono"
              title={n.label}>
              {n.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---- layout ----
//
// Columns are organised by page: each web page anchors its own column,
// containing the server actions and database tables it reaches transitively
// via imports. Nodes touched by more than one page collapse into a "Shared"
// column at the right. API routes (and any nodes only they use) sit in a
// dedicated "API" column at the far right so the page picture stays clean.
//
// Within each column the page header sits on top, followed by actions
// (alphabetical) and then tables.

function buildLayout(diagram: Diagram): { rfNodes: Node[]; rfEdges: Edge[] } {
  // Outgoing-edge adjacency for reachability traversal.
  const adj = new Map<string, string[]>()
  for (const e of diagram.edges) {
    const arr = adj.get(e.source) ?? []
    arr.push(e.target)
    adj.set(e.source, arr)
  }

  const reach = (rootId: string): Set<string> => {
    const visited = new Set<string>()
    const stack: string[] = [rootId]
    while (stack.length) {
      const cur = stack.pop()!
      if (visited.has(cur)) continue
      visited.add(cur)
      for (const next of adj.get(cur) ?? []) {
        if (!visited.has(next)) stack.push(next)
      }
    }
    visited.delete(rootId)
    return visited
  }

  const pages = diagram.nodes
    .filter((n) => n.kind === "page")
    .sort((a, b) => a.label.localeCompare(b.label))
  const apis = diagram.nodes
    .filter((n) => n.kind === "api")
    .sort((a, b) => a.label.localeCompare(b.label))

  // Compute reachability sets once.
  const pageReach = new Map<string, Set<string>>()
  for (const p of pages) pageReach.set(p.id, reach(p.id))
  const apiReach = new Map<string, Set<string>>()
  for (const a of apis) apiReach.set(a.id, reach(a.id))

  // Bucket each non-page, non-api node by ownership.
  const pageColumns = new Map<
    string,
    { page: DiagramNode; members: DiagramNode[] }
  >()
  for (const p of pages) pageColumns.set(p.id, { page: p, members: [] })
  const sharedMembers: DiagramNode[] = []
  const apiMembers: DiagramNode[] = []

  for (const n of diagram.nodes) {
    if (n.kind === "page" || n.kind === "api") continue
    const owningPages: string[] = []
    for (const [pageId, reached] of pageReach) {
      if (reached.has(n.id)) owningPages.push(pageId)
    }
    if (owningPages.length === 1) {
      pageColumns.get(owningPages[0])!.members.push(n)
    } else if (owningPages.length >= 2) {
      sharedMembers.push(n)
    } else {
      // No page reaches this node. If an API does, it lives in the API column;
      // otherwise it's an orphan — park it in Shared so it stays visible.
      const apiOwned = [...apiReach.values()].some((r) => r.has(n.id))
      ;(apiOwned ? apiMembers : sharedMembers).push(n)
    }
  }

  // Sort the inside of each column: actions first (alphabetical), tables last.
  const kindOrder: Record<DiagramNodeKind, number> = {
    page: 0,
    api: 0,
    action: 1,
    table: 2
  }
  const sortMembers = (arr: DiagramNode[]) =>
    arr.sort((a, b) =>
      kindOrder[a.kind] !== kindOrder[b.kind]
        ? kindOrder[a.kind] - kindOrder[b.kind]
        : a.label.localeCompare(b.label)
    )
  for (const col of pageColumns.values()) sortMembers(col.members)
  sortMembers(sharedMembers)
  sortMembers(apiMembers)

  // Assemble the final ordered column list.
  type Col = {
    id: string
    label: string
    head?: DiagramNode
    members: DiagramNode[]
  }
  const columns: Col[] = []
  for (const p of pages) {
    const col = pageColumns.get(p.id)!
    columns.push({
      id: p.id,
      label: p.label,
      head: col.page,
      members: col.members
    })
  }
  if (sharedMembers.length > 0) {
    columns.push({
      id: "__shared",
      label: SHARED_COL_LABEL,
      members: sharedMembers
    })
  }
  if (apis.length > 0 || apiMembers.length > 0) {
    columns.push({
      id: "__api",
      label: API_COL_LABEL,
      members: [...apis, ...apiMembers]
    })
  }

  // Materialise React Flow nodes.
  const rfNodes: Node[] = []
  columns.forEach((col, ci) => {
    const x = ci * COLUMN_WIDTH
    rfNodes.push({
      id: `header:${col.id}`,
      data: { isHeader: true, label: col.label },
      position: { x, y: HEADER_Y },
      draggable: false,
      selectable: false,
      style: {
        background: "transparent",
        border: "none",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: "#7A6E63",
        width: NODE_WIDTH,
        textAlign: "center",
        padding: 0,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      },
      type: "default"
    })
    let y = 0
    if (col.head) {
      rfNodes.push({
        id: col.head.id,
        data: { label: col.head.label, kind: col.head.kind },
        position: { x, y },
        draggable: true,
        type: "default"
      })
      y += NODE_HEIGHT + ROW_GAP
    }
    for (const m of col.members) {
      rfNodes.push({
        id: m.id,
        data: { label: m.label, kind: m.kind },
        position: { x, y },
        draggable: true,
        type: "default"
      })
      y += NODE_HEIGHT + ROW_GAP
    }
  })

  const rfEdges: Edge[] = diagram.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "smoothstep",
    animated: false
  }))

  return { rfNodes, rfEdges }
}
