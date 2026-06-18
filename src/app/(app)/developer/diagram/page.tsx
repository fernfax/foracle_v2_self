import { notFound } from "next/navigation"
import { IS_DEV } from "@/configs/env.config"

import { DeveloperNav } from "@/components/developer/developer-nav"
import { DiagramCanvas } from "@/components/developer/diagram-canvas"

export const dynamic = "force-dynamic"
// Scans the source tree with fs at request time, so it must run on the Node
// runtime, never Edge.
export const runtime = "nodejs"

export default async function DeveloperDiagramPage() {
  // Dev-server-only tool: `buildDiagram` reads the source tree from disk, which
  // only exists under `next dev`. `process.env.NODE_ENV` is build-static (every
  // `next build` is "production"), so this branch — and the scanner module it
  // dynamically imports — is dead-code-eliminated from builds. That keeps the
  // scanner's dynamic fs reads out of the file trace entirely (otherwise
  // Turbopack over-traces the whole project into this route).
  if (process.env.NODE_ENV !== "production" && IS_DEV) {
    const { buildDiagram } = await import("@/lib/developer-diagram")
    const diagram = await buildDiagram()

    return (
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-4">
          <h1 className="font-display text-foreground text-2xl font-semibold">
            Developer Mode
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Infra graph extracted from the codebase. Edges come from import
            statements: pages and api routes point at the server actions they
            use; server actions point at the database tables they query. Click a
            server action to see its functional category and what it does for
            the user.
          </p>
        </header>

        <DeveloperNav />

        <div className="text-muted-foreground mb-3 flex items-center gap-4 text-xs">
          <span>
            <strong className="text-foreground">{diagram.nodes.length}</strong>{" "}
            nodes
          </span>
          <span>
            <strong className="text-foreground">{diagram.edges.length}</strong>{" "}
            edges
          </span>
        </div>

        <DiagramCanvas diagram={diagram} />
      </div>
    )
  }

  notFound()
}
