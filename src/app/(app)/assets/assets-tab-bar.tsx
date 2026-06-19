"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Car, Home, Package } from "lucide-react"

import { SlidingTabs } from "@/components/ui/sliding-tabs"

const TABS = [
  { value: "property", label: "Property", icon: Home },
  { value: "vehicle", label: "Vehicle", icon: Car },
  { value: "others", label: "Others", icon: Package }
]

/**
 * Route-aware tab bar for /assets/*. Active tab is derived from the pathname
 * segment; clicking navigates to the nested route. Keeps the sliding-indicator
 * UX optimistic (set on click, re-synced to the URL on commit / back-forward)
 * via the prev-value render pattern — same approach the old single-page client
 * used, but driving routes instead of a ?tab= query param.
 */
export function AssetsTabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const segment = pathname.split("/")[2] ?? "property"

  const [active, setActive] = useState(segment)
  const [prevSegment, setPrevSegment] = useState(segment)
  if (prevSegment !== segment) {
    setPrevSegment(segment)
    setActive(segment)
  }

  return (
    <SlidingTabs
      tabs={TABS}
      value={active}
      onValueChange={(value) => {
        setActive(value)
        router.push(`/assets/${value}`, { scroll: false })
      }}
    />
  )
}
