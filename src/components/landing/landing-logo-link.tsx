"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

/**
 * LandingLogoLink — the navbar wordmark. Next's <Link> scroll-to-top is
 * unreliable for a same-route click (navigating to "/" while already on "/"
 * often no-ops), so when we're already on the landing page we handle the
 * scroll-to-top ourselves; otherwise the link navigates home as usual.
 */
export function LandingLogoLink() {
  const pathname = usePathname()

  return (
    <Link
      href="/"
      aria-label="Foracle home"
      className="flex items-center"
      onClick={(e) => {
        if (pathname !== "/") return
        e.preventDefault()
        const reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
      }}>
      <Image
        src="/wordmark-168.png"
        alt="Foracle"
        width={97}
        height={28}
        className="object-contain"
        priority
      />
    </Link>
  )
}
