"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Target, Trophy } from "lucide-react"

import { SlidingTabs } from "@/components/ui/sliding-tabs"

interface GoalsTabBarProps {
  activeCount: number
  achievedCount: number
}

/**
 * Route-aware tab bar for /goals/*. Counts come from the layout (server) so the
 * badges stay correct without the bar fetching. Active tab derives from the
 * pathname segment; clicking navigates to the nested route, optimistically.
 */
export function GoalsTabBar({ activeCount, achievedCount }: GoalsTabBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const segment = pathname.split("/")[2] ?? "active"

  const [active, setActive] = useState(segment)
  const [prevSegment, setPrevSegment] = useState(segment)
  if (prevSegment !== segment) {
    setPrevSegment(segment)
    setActive(segment)
  }

  return (
    <SlidingTabs
      tabs={[
        {
          value: "active",
          label: "Active Goals",
          icon: Target,
          badge: activeCount
        },
        {
          value: "achieved",
          label: "Achieved",
          icon: Trophy,
          badge: achievedCount,
          badgeVariant: "success"
        }
      ]}
      value={active}
      onValueChange={(value) => {
        setActive(value)
        router.push(`/goals/${value}`, { scroll: false })
      }}
    />
  )
}
