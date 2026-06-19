import type { ReactNode } from "react"

import { LayoutPageHeader } from "@/components/layout/layout-page-header"
import { UserTabBar } from "@/app/(app)/user/user-tab-bar"

// Every tab here renders per-user, auth-gated data — never static. Declared on
// the layout so it cascades to all child tab routes (skips the build's doomed
// static-gen probe instead of bailing to dynamic via a logged error).
export const dynamic = "force-dynamic"

/**
 * Shared chrome for the User Homepage tabs. Header + tab bar stay mounted across
 * tab navigations (smooth indicator, no re-fetch); each tab's data + heavy
 * components (timeline, expenses, sankey) are code-split into the child route.
 */
export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <LayoutPageHeader title="User Homepage" tabs={<UserTabBar />} />
      {children}
    </div>
  )
}
