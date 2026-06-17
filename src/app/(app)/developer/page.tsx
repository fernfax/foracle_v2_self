import { notFound } from "next/navigation"
import { IS_DEV } from "@/configs/env.config"

import { DEVELOPER_TABLES } from "@/lib/developer-tables"
import { DeveloperNav } from "@/components/developer/developer-nav"
import { DeveloperTableAccordion } from "@/components/developer/developer-table-accordion"

export const dynamic = "force-dynamic"

export default function DeveloperPage() {
  if (!IS_DEV) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-4">
        <h1 className="font-display text-foreground text-2xl font-semibold">
          Developer Mode
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Inspect database tables and your data. Read-only. Rows are scoped to
          your account and capped at 100 per table. Available only in
          development (environment=
          {process.env.NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT ?? "production"}).
        </p>
      </header>

      <DeveloperNav />

      <div className="space-y-2">
        {DEVELOPER_TABLES.map((t) => (
          <DeveloperTableAccordion key={t.name} name={t.name} scope={t.scope} />
        ))}
      </div>
    </div>
  )
}
