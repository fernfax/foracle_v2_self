"use client"

import Link from "next/link"
import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet"

interface LandingMobileNavProps {
  links: ReadonlyArray<{ href: string; label: string }>
  isSignedIn: boolean
}

/**
 * LandingMobileNav — the marketing navbar's mobile controls. The desktop navbar
 * hides its section links and CTAs below `md`; this renders the primary CTA
 * inline plus a hamburger that opens a side sheet listing every section and the
 * secondary auth action, so small screens can actually navigate.
 */
export function LandingMobileNav({ links, isSignedIn }: LandingMobileNavProps) {
  const primaryHref = isSignedIn ? "/user/overview" : "/sign-up"
  const primaryLabel = isSignedIn ? "Dashboard" : "Get Started"

  return (
    <div className="flex items-center gap-2 md:hidden">
      <Link href={primaryHref}>
        <Button>{primaryLabel}</Button>
      </Link>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[80%] max-w-xs gap-0 p-0">
          <SheetHeader className="border-border/60 border-b">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Site navigation
            </SheetDescription>
          </SheetHeader>

          <nav className="flex flex-col px-3 py-2">
            {links.map((l) => (
              <SheetClose asChild key={l.href}>
                <a
                  href={l.href}
                  className="font-display text-foreground/80 hover:text-foreground hover:bg-muted/60 flex items-center rounded-lg px-3 py-3.5 text-base font-medium transition-colors">
                  {l.label}
                </a>
              </SheetClose>
            ))}
          </nav>

          <div className="border-border/60 mt-auto flex flex-col gap-2 border-t p-4">
            {isSignedIn ? (
              <SheetClose asChild>
                <Link href="/user/overview" className="block">
                  <Button className="w-full">Go to dashboard</Button>
                </Link>
              </SheetClose>
            ) : (
              <SheetClose asChild>
                <Link href="/sign-in" className="block">
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
              </SheetClose>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
