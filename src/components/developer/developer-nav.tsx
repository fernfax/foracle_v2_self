"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/cn"

const TABS: Array<{ href: string; label: string }> = [
  { href: "/developer", label: "Tables" },
  { href: "/developer/diagram", label: "Diagram" }
]

export function DeveloperNav() {
  const pathname = usePathname()
  return (
    <nav className="border-border/40 mb-6 flex items-center gap-1 border-b">
      {TABS.map((t) => {
        const active = pathname === t.href
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent"
            )}>
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
