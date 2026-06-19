import type { ReactNode } from "react"

import { PageHeader } from "@/components/layout/layout-page-header"
import { UserTabBar } from "@/app/(app)/user/user-tab-bar"

/**
 * Shared chrome for the User Homepage tabs. Header + tab bar stay mounted across
 * tab navigations (smooth indicator, no re-fetch); each tab's data + heavy
 * components (timeline, expenses, sankey) are code-split into the child route.
 */
export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <PageHeader title="User Homepage" tabs={<UserTabBar />} />
      {children}
    </div>
  )
}
