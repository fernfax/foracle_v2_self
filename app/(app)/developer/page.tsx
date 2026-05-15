import { notFound } from "next/navigation";
import { DEVELOPER_TABLES } from "@/lib/developer-tables";
import { DeveloperTableAccordion } from "@/components/developer/developer-table-accordion";
import { DeveloperNav } from "@/components/developer/developer-nav";

export const dynamic = "force-dynamic";

export default function DeveloperPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-4">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Developer Mode
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inspect database tables and your data. Read-only. Rows are scoped to
          your account and capped at 100 per table. Available only in development
          (NODE_ENV={process.env.NODE_ENV}).
        </p>
      </header>

      <DeveloperNav />

      <div className="space-y-2">
        {DEVELOPER_TABLES.map((t) => (
          <DeveloperTableAccordion key={t.name} name={t.name} scope={t.scope} />
        ))}
      </div>
    </div>
  );
}
