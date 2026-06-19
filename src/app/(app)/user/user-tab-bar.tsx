"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Briefcase,
  Building2,
  DollarSign,
  Receipt,
  Users,
  Waves
} from "lucide-react"

import { SlidingTabs } from "@/components/ui/sliding-tabs"

const TABS = [
  { value: "overview", label: "Overview", icon: Waves },
  { value: "family", label: "Family", icon: Users },
  { value: "incomes", label: "Incomes", icon: DollarSign },
  { value: "expenses", label: "Expenses", icon: Receipt },
  { value: "cpf", label: "CPF", icon: Building2 },
  { value: "holdings", label: "Holdings", icon: Briefcase }
]

/**
 * Route-aware tab bar for /user/*. Active tab derives from the pathname segment;
 * clicking navigates to the nested route. Keeps the sliding-indicator UX
 * optimistic (set on click, re-synced to the URL on commit / back-forward) via
 * the prev-value render pattern.
 */
export function UserTabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const segment = pathname.split("/")[2] ?? "overview"

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
        router.push(`/user/${value}`, { scroll: false })
      }}
    />
  )
}
