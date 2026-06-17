// Builds the developer-mode infra diagram by scanning the project tree.
//
// Sources of truth:
//   - db/schema.ts          → table nodes
//   - lib/actions/*.ts      → action nodes (one per exported async function)
//   - app/**/page.tsx       → page nodes
//   - app/api/**/route.ts   → api route nodes
//
// Edges are extracted from `import { X } from "@/db/schema"` and
// `import { X } from "@/lib/actions/<file>"` statements. Type-only imports
// are skipped. The scanner uses fs/promises so it only works server-side
// and only in dev (where the project tree is on disk).

import type { Dirent } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

import {
  getActionInfo,
  type ActionCategory
} from "@/lib/developer-action-catalog"

const PROJECT_ROOT = process.cwd()

export type DiagramNodeKind = "table" | "page" | "action" | "api"

export type DiagramNode = {
  id: string
  kind: DiagramNodeKind
  label: string
  // Human-readable file location relative to project root (for the side panel).
  filePath?: string
  // For pages / api routes: the URL path.
  route?: string
  // For tables: the snake_case DB name.
  dbName?: string
  // For actions: curated functional metadata (lib/developer-action-catalog.ts).
  category?: ActionCategory
  description?: string
}

export type DiagramEdge = {
  id: string
  source: string
  target: string
}

export type Diagram = {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

export async function buildDiagram(): Promise<Diagram> {
  const [tables, actions, pages, apis] = await Promise.all([
    discoverTables(),
    discoverActions(),
    discoverPages(),
    discoverApiRoutes()
  ])

  const tableByExport = new Map<string, TableMeta>()
  for (const t of tables) tableByExport.set(t.exportName, t)

  // Action lookup is keyed by (relative-import-path, export-name) because
  // two files can export the same function name (e.g. getCurrentUserId).
  const actionByImportPath = new Map<string, ActionMeta>()
  for (const a of actions) {
    const key = `${a.importPath}::${a.exportName}`
    actionByImportPath.set(key, a)
  }

  const edges: DiagramEdge[] = []
  const addEdge = (source: string, target: string) => {
    edges.push({ id: `${source}->${target}`, source, target })
  }

  const sourcesToScan: Array<{ nodeId: string; absPath: string }> = [
    ...pages.map((p) => ({
      nodeId: p.id,
      absPath: path.join(PROJECT_ROOT, p.filePath!)
    })),
    ...apis.map((a) => ({
      nodeId: a.id,
      absPath: path.join(PROJECT_ROOT, a.filePath!)
    })),
    ...actions.map((a) => ({
      nodeId: a.nodeId,
      absPath: path.join(PROJECT_ROOT, a.filePath)
    }))
  ]

  // Avoid duplicate edges.
  const seen = new Set<string>()

  for (const { nodeId, absPath } of sourcesToScan) {
    let content: string
    try {
      content = await readFile(absPath, "utf-8")
    } catch {
      continue
    }
    const imports = parseImports(content)
    for (const imp of imports) {
      if (imp.isType) continue
      // Tables: target is "db/schema".
      if (imp.target === "db/schema") {
        for (const name of imp.names) {
          const t = tableByExport.get(name)
          if (!t) continue
          const k = `${nodeId}->${t.id}`
          if (seen.has(k)) continue
          seen.add(k)
          addEdge(nodeId, t.id)
        }
      } else if (imp.target.startsWith("lib/actions/")) {
        for (const name of imp.names) {
          const a = actionByImportPath.get(`${imp.target}::${name}`)
          if (!a) continue
          // Don't draw self-edges (a file importing from itself shouldn't be possible,
          // but action files can call helpers in other action files — keep cross-file edges).
          if (a.nodeId === nodeId) continue
          const k = `${nodeId}->${a.nodeId}`
          if (seen.has(k)) continue
          seen.add(k)
          addEdge(nodeId, a.nodeId)
        }
      }
    }
  }

  const nodes: DiagramNode[] = [
    ...tables.map(toTableNode),
    ...actions.map(toActionNode),
    ...pages.map(toPageNode),
    ...apis.map(toApiNode)
  ]

  return { nodes, edges }
}

// ---------- discovery ----------

type TableMeta = {
  id: string
  exportName: string // camelCase JS export
  dbName: string // snake_case pg name
  filePath: string
}

async function discoverTables(): Promise<TableMeta[]> {
  const schemaPath = "db/schema.ts"
  const content = await readFile(path.join(PROJECT_ROOT, schemaPath), "utf-8")
  const regex =
    /^\s*export\s+const\s+(\w+)\s*=\s*pgTable\s*\(\s*["']([^"']+)["']/gm
  const out: TableMeta[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(content)) !== null) {
    const exportName = m[1]
    const dbName = m[2]
    out.push({
      id: `table:${dbName}`,
      exportName,
      dbName,
      filePath: schemaPath
    })
  }
  return out
}

type ActionMeta = {
  nodeId: string
  exportName: string
  // Path used in `import ... from "@/<importPath>"` (no .ts).
  importPath: string
  filePath: string
  fileLabel: string // e.g. "income"
}

async function discoverActions(): Promise<ActionMeta[]> {
  const dir = "lib/actions"
  const files = await readdir(path.join(PROJECT_ROOT, dir))
  const out: ActionMeta[] = []
  for (const f of files) {
    if (!f.endsWith(".ts")) continue
    const stem = f.replace(/\.ts$/, "")
    const filePath = `${dir}/${f}`
    const importPath = `${dir}/${stem}`
    const content = await readFile(path.join(PROJECT_ROOT, filePath), "utf-8")
    const regex = /^\s*export\s+(?:async\s+)?function\s+(\w+)/gm
    let m: RegExpExecArray | null
    while ((m = regex.exec(content)) !== null) {
      const exportName = m[1]
      out.push({
        nodeId: `action:${stem}:${exportName}`,
        exportName,
        importPath,
        filePath,
        fileLabel: stem
      })
    }
  }
  return out
}

type PageMeta = {
  id: string
  filePath: string
  route: string
}

async function discoverPages(): Promise<PageMeta[]> {
  const out: PageMeta[] = []
  await walk(path.join(PROJECT_ROOT, "app"), async (absPath) => {
    if (!absPath.endsWith("/page.tsx") && !absPath.endsWith("\\page.tsx"))
      return
    const rel = path.relative(PROJECT_ROOT, absPath)
    const route =
      "/" +
        rel
          .replace(/^app\//, "")
          .replace(/\/page\.tsx$/, "")
          .replace(/\(.*?\)\//g, "") // strip route groups
          .replace(/\/$/, "") || "/"
    out.push({ id: `page:${route}`, filePath: rel, route })
  })
  return out
}

type ApiMeta = {
  id: string
  filePath: string
  route: string
}

async function discoverApiRoutes(): Promise<ApiMeta[]> {
  const out: ApiMeta[] = []
  const apiRoot = path.join(PROJECT_ROOT, "app/api")
  await walk(apiRoot, async (absPath) => {
    if (!absPath.endsWith("/route.ts") && !absPath.endsWith("\\route.ts"))
      return
    const rel = path.relative(PROJECT_ROOT, absPath)
    const route = "/" + rel.replace(/^app\//, "").replace(/\/route\.ts$/, "")
    out.push({ id: `api:${route}`, filePath: rel, route })
  })
  return out
}

async function walk(root: string, visit: (absPath: string) => Promise<void>) {
  let entries: Dirent[]
  try {
    entries = (await readdir(root, { withFileTypes: true })) as Dirent[]
  } catch {
    return
  }
  for (const entry of entries) {
    const name = String(entry.name)
    const abs = path.join(root, name)
    if (entry.isDirectory()) {
      if (name === "node_modules" || name.startsWith(".")) continue
      await walk(abs, visit)
    } else if (entry.isFile()) {
      await visit(abs)
    }
  }
}

// ---------- import parsing ----------

type ParsedImport = {
  isType: boolean
  names: string[]
  target: string // path after "@/"
}

function parseImports(content: string): ParsedImport[] {
  // Captures: import [type] { Name1, Name2 as Alias } from "@/<path>"
  // Multi-line tolerant via [\s\S]* inside the braces.
  const regex =
    /import\s+(type\s+)?\{([\s\S]*?)\}\s+from\s+["']@\/([^"']+)["']/g
  const out: ParsedImport[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(content)) !== null) {
    const isType = Boolean(m[1])
    const namesStr = m[2]
    const target = m[3]
    const names = namesStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        // Strip "type" prefix on individual import specifier ("import { type X }").
        const noTypePrefix = s.replace(/^type\s+/, "")
        // Use the original (LHS) of `X as Y`, since that's the export name.
        return noTypePrefix.split(/\s+as\s+/)[0].trim()
      })
    out.push({ isType, names, target })
  }
  return out
}

// ---------- node mappers ----------

function toTableNode(t: TableMeta): DiagramNode {
  return {
    id: t.id,
    kind: "table",
    label: t.dbName,
    filePath: t.filePath,
    dbName: t.dbName
  }
}

function toActionNode(a: ActionMeta): DiagramNode {
  const info = getActionInfo(a.fileLabel, a.exportName)
  return {
    id: a.nodeId,
    kind: "action",
    label: `${a.fileLabel}.${a.exportName}`,
    filePath: a.filePath,
    category: info?.category,
    description: info?.description
  }
}

function toPageNode(p: PageMeta): DiagramNode {
  return {
    id: p.id,
    kind: "page",
    label: p.route,
    filePath: p.filePath,
    route: p.route
  }
}

function toApiNode(a: ApiMeta): DiagramNode {
  return {
    id: a.id,
    kind: "api",
    label: a.route,
    filePath: a.filePath,
    route: a.route
  }
}
