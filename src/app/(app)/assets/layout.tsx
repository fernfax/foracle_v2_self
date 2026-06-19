import type { ReactNode } from "react"

import { LayoutPageHeader } from "@/components/layout/layout-page-header"
import { AssetsTabBar } from "@/app/(app)/assets/assets-tab-bar"

export const metadata = {
  title: "Assets | Foracle",
  description: "Manage your property, vehicle, and other assets"
}

// Auth-gated, per-user data — never static. Cascades to all child tab routes.
export const dynamic = "force-dynamic"

/**
 * Shared chrome for the Assets tabs. The header + tab bar live here so they stay
 * mounted across tab navigations (smooth indicator, no re-fetch); each tab's
 * data + heavy components are code-split into the child route.
 */
export default function AssetsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <LayoutPageHeader title="Assets" tabs={<AssetsTabBar />} />
      {children}
    </div>
  )
}
