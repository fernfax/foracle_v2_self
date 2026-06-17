import { notFound } from "next/navigation"

import { isDevelopment } from "@/lib/deployment-env"
import { buildDiagram } from "@/lib/developer-diagram"
import { DeveloperNav } from "@/components/developer/developer-nav"
import { DiagramCanvas } from "@/components/developer/diagram-canvas"

export const dynamic = "force-dynamic"

export default async function DeveloperDiagramPage() {
  if (!isDevelopment) {
    notFound()
  }

  const diagram = await buildDiagram()

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-4">
        <h1 className="font-display text-foreground text-2xl font-semibold">
          Developer Mode
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Infra graph extracted from the codebase. Edges come from import
          statements: pages and api routes point at the server actions they use;
          server actions point at the database tables they query. Click a server
          action to see its functional category and what it does for the user.
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
