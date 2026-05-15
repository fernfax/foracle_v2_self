import { notFound } from "next/navigation";
import { buildDiagram } from "@/lib/developer-diagram";
import { DiagramCanvas } from "@/components/developer/diagram-canvas";
import { DeveloperNav } from "@/components/developer/developer-nav";

export const dynamic = "force-dynamic";

export default async function DeveloperDiagramPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const diagram = await buildDiagram();

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <header className="mb-4">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Developer Mode
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Infra graph extracted from the codebase. Edges come from import
          statements: pages and api routes point at the server actions they use;
          server actions point at the database tables they query. Click a node
          for details.
        </p>
      </header>

      <DeveloperNav />

      <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{diagram.nodes.length}</strong> nodes
        </span>
        <span>
          <strong className="text-foreground">{diagram.edges.length}</strong> edges
        </span>
      </div>

      <DiagramCanvas diagram={diagram} />
    </div>
  );
}
