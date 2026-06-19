"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { NAV_ITEMS } from "@/configs/sidebar.config"
import { useUser } from "@clerk/nextjs"
import { PanelLeft, PanelLeftClose } from "lucide-react"

import { cn } from "@/lib/cn"
import { NavigationClerkUserButton } from "@/components/navigation/navigation-clerk-user-button"
import { useSidebar } from "@/components/navigation/navigation-sidebar-context"
import { NavigationSidebarItem } from "@/components/navigation/navigation-sidebar-item"

export function NavigationSidebar() {
  const { isPinned, setIsPinned, setIsHovered, isExpanded } = useSidebar()
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  const { user, isLoaded } = useUser()
  const profileRowRef = useRef<HTMLDivElement>(null)

  const handleToggleSubmenu = (href: string) => {
    setOpenSubmenu(openSubmenu === href ? null : href)
  }

  return (
    <aside
      data-tour="sidebar-nav"
      className={cn(
        // Sticky participates in the parent CSS Grid; the grid column drives the visible width.
        "border-brand-cream/[0.06] bg-brand-deep-forest sticky top-0 h-screen w-full self-start overflow-hidden border-r",
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
            href="/user/overview"
            className="relative flex h-full w-full items-center">
            {/* Compact mark — centered in the same w-12 leading slot as every
                nav icon, so it sits on the shared rail centerline when collapsed. */}
            <span className="flex w-12 shrink-0 items-center justify-center">
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
            </span>
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
          {NAV_ITEMS.map((item) => (
            <NavigationSidebarItem
              key={item.href}
              {...item}
              isExpanded={isExpanded}
              isSubmenuOpen={openSubmenu === item.href}
              onToggleSubmenu={() => handleToggleSubmenu(item.href)}
            />
          ))}
        </nav>

        {/* Bottom section — pin toggle + user profile. Both mirror the nav row
            layout (w-12 leading slot + text-sm label) so icons share the rail
            centerline and labels align with the nav. */}
        <div className="border-brand-cream/[0.06] flex-shrink-0 border-t">
          <div className="px-3 py-2">
            <button
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className="group text-brand-cream/[0.55] hover:bg-brand-forest-mid hover:text-brand-cream font-display flex w-full items-center overflow-hidden rounded-md py-2 text-sm transition-colors duration-150">
              <span className="flex w-12 shrink-0 items-center justify-center">
                {isPinned ? (
                  <PanelLeftClose className="h-[18px] w-[18px]" />
                ) : (
                  <PanelLeft className="h-[18px] w-[18px]" />
                )}
              </span>
              <span
                className={cn(
                  "font-medium whitespace-nowrap transition-[opacity,transform] duration-200",
                  isExpanded
                    ? "translate-x-0 opacity-100"
                    : "pointer-events-none -translate-x-1 opacity-0"
                )}>
                {isPinned ? "Minimize" : "Pin Open"}
              </span>
            </button>
          </div>

          <div className="border-brand-cream/[0.06] border-t px-3 py-2">
            {isLoaded && user ? (
              // The whole row opens the user menu: row clicks are forwarded to
              // the Clerk avatar trigger (unless the click already hit it).
              <div
                ref={profileRowRef}
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest("button")) {
                    profileRowRef.current
                      ?.querySelector<HTMLElement>("button")
                      ?.click()
                  }
                }}
                className="group hover:bg-brand-forest-mid flex w-full cursor-pointer items-center overflow-hidden rounded-md py-1 transition-colors duration-150">
                <span className="flex w-12 shrink-0 items-center justify-center">
                  <NavigationClerkUserButton
                    afterSignOutUrl="/"
                    appearance={{ elements: { avatarBox: "w-9 h-9" } }}
                  />
                </span>
                <div
                  className={cn(
                    "min-w-0 flex-1 transition-[opacity,transform] duration-200",
                    isExpanded
                      ? "translate-x-0 opacity-100"
                      : "pointer-events-none -translate-x-1 opacity-0"
                  )}>
                  <p className="font-display text-brand-cream truncate text-sm font-medium">
                    {user.fullName || user.firstName || "User"}
                  </p>
                  <p className="text-brand-cream/[0.45] truncate text-xs">
                    {user.primaryEmailAddress?.emailAddress || ""}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center py-1">
                <span className="flex w-12 shrink-0 items-center justify-center">
                  <div className="bg-brand-forest-mid size-9 animate-pulse rounded-full" />
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
