import type { ReactNode } from "react"

import { PageHeader } from "@/components/layout/layout-page-header"
import { AssetsTabBar } from "@/app/(app)/assets/assets-tab-bar"

export const metadata = {
  title: "Assets | Foracle",
  description: "Manage your property, vehicle, and other assets"
}

/**
 * Shared chrome for the Assets tabs. The header + tab bar live here so they stay
 * mounted across tab navigations (smooth indicator, no re-fetch); each tab's
 * data + heavy components are code-split into the child route.
 */
export default function AssetsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <PageHeader title="Assets" tabs={<AssetsTabBar />} />
      {children}
    </div>
  )
}
