"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import {
  Briefcase,
  Building2,
  Calculator,
  Car,
  DollarSign,
  Home,
  LineChart,
  Package,
  PanelLeft,
  PanelLeftClose,
  Home as PropertyIcon,
  Receipt,
  Shield,
  Target,
  TrendingUp,
  User,
  Users
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ClerkUserButton } from "@/components/clerk-user-button"

import { useSidebar } from "./sidebar-context"
import { SidebarNavItem } from "./sidebar-nav-item"

const mainNavItems = [
  {
    href: "/user",
    label: "User Homepage",
    icon: User,
    subItems: [
      { href: "/user?tab=overview", label: "Overview", icon: Home },
      { href: "/user?tab=family", label: "Family", icon: Users },
      { href: "/user?tab=incomes", label: "Incomes", icon: DollarSign },
      { href: "/user?tab=expenses", label: "Expenses", icon: Receipt },
      { href: "/user?tab=cpf", label: "CPF", icon: Building2 },
      { href: "/user?tab=current", label: "Holdings", icon: Briefcase }
    ]
  },
  {
    href: "/assets",
    label: "Assets",
    icon: TrendingUp,
    subItems: [
      { href: "/assets?tab=property", label: "Property", icon: PropertyIcon },
      { href: "/assets?tab=vehicle", label: "Vehicle", icon: Car },
      { href: "/assets?tab=others", label: "Others", icon: Package }
    ]
  },
  { href: "/policies", label: "Insurance", icon: Shield },
  { href: "/investments", label: "Investments", icon: LineChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/budget", label: "Budget", icon: Calculator }
  // Hidden for now — AI Assistant feature paused.
  // { href: "/assistant", label: "AI Assistant", icon: Sparkles },
]

export function Sidebar() {
  const { isPinned, setIsPinned, isHovered, setIsHovered, isExpanded } =
    useSidebar()
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  const { user, isLoaded } = useUser()

  const handleToggleSubmenu = (href: string) => {
    setOpenSubmenu(openSubmenu === href ? null : href)
  }

  return (
    <aside
      data-tour="sidebar-nav"
      className={cn(
        // Sticky participates in the parent CSS Grid; the grid column drives the visible width.
        "sticky top-0 h-screen w-full self-start overflow-hidden border-r border-[rgba(240,235,224,0.06)] bg-[#1C2B2A]",
        // Mobile-hidden via CSS (not JS) so SSR/first paint never shows the
        // desktop sidebar on phones. display:none drops it from the grid flow.
        "desktop:flex z-50 hidden flex-col"
      )}
      onMouseEnter={() => !isPinned && setIsHovered(true)}
      onMouseLeave={() => !isPinned && setIsHovered(false)}>
      {/*
        Inner contents stay laid out at the full expanded width (260px) and are clipped
        by the aside's `overflow-hidden` when the grid column shrinks. This keeps icon
        positions stable, removes layout work during the transition, and avoids
        per-element width animation.
      */}
      <div className="flex h-full w-[260px] flex-col">
        {/* Logo lockup — both images mounted, swap via opacity to avoid mid-animation Image swap */}
        <div className="relative flex h-[70px] flex-shrink-0 items-center px-3">
          <Link
            href="/user?tab=overview"
            className="relative flex h-full w-full items-center">
            {/* Compact mark — visible when collapsed, sits at left edge of the 72px column */}
            <Image
              src="/logo-72.png"
              alt="Foracle"
              width={40}
              height={40}
              className={cn(
                "object-contain brightness-0 invert transition-opacity duration-200",
                isExpanded ? "opacity-0" : "opacity-95"
              )}
              priority
            />
            {/* Wordmark — overlays the compact mark when expanded */}
            <Image
              src="/wordmark-400.png"
              alt="Foracle"
              width={112}
              height={32}
              className={cn(
                "absolute top-1/2 left-2 -translate-y-1/2 object-contain brightness-0 invert transition-opacity duration-200",
                isExpanded ? "opacity-95" : "pointer-events-none opacity-0"
              )}
              priority
            />
          </Link>
        </div>

        {/* Navigation — overflow-x-hidden prevents label overflow from creating horizontal scroll */}
        <nav className="flex-1 space-y-0.5 overflow-x-hidden overflow-y-auto px-3 pt-6 pb-4 sm:pt-8">
          {mainNavItems.map((item) => (
            <SidebarNavItem
              key={item.href}
              {...item}
              isExpanded={isExpanded}
              isSubmenuOpen={openSubmenu === item.href}
              onToggleSubmenu={() => handleToggleSubmenu(item.href)}
            />
          ))}
        </nav>

        {/* Bottom section — pin toggle + user profile */}
        <div className="flex-shrink-0 border-t border-[rgba(240,235,224,0.06)]">
          <div className="px-3 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPinned(!isPinned)}
              className="flex w-full items-center justify-start gap-2 border-transparent bg-transparent text-[rgba(240,235,224,0.55)] hover:border-transparent hover:bg-[#2C3E3D] hover:text-[#F0EBE0]">
              {isPinned ? (
                <>
                  <PanelLeftClose className="h-4 w-4 flex-shrink-0" />
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap transition-opacity duration-200",
                      isExpanded
                        ? "opacity-100"
                        : "pointer-events-none opacity-0"
                    )}>
                    Minimize
                  </span>
                </>
              ) : (
                <>
                  <PanelLeft className="h-4 w-4 flex-shrink-0" />
                  <span
                    className={cn(
                      "text-xs whitespace-nowrap transition-opacity duration-200",
                      isExpanded
                        ? "opacity-100"
                        : "pointer-events-none opacity-0"
                    )}>
                    Pin Open
                  </span>
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-3 border-t border-[rgba(240,235,224,0.06)] px-3 py-3">
            {isLoaded && user ? (
              <>
                <ClerkUserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10"
                    }
                  }}
                />
                <div
                  className={cn(
                    "min-w-0 flex-1 transition-opacity duration-200",
                    isExpanded ? "opacity-100" : "pointer-events-none opacity-0"
                  )}>
                  <p className="font-display truncate text-sm font-medium text-[#F0EBE0]">
                    {user.fullName || user.firstName || "User"}
                  </p>
                  <p className="truncate text-xs text-[rgba(240,235,224,0.45)]">
                    {user.primaryEmailAddress?.emailAddress || ""}
                  </p>
                </div>
              </>
            ) : (
              <div className="h-10 w-10 animate-pulse rounded-full bg-[#2C3E3D]" />
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
