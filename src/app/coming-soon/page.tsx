import type { Metadata } from "next"
import Image from "next/image"

import { LayoutTileMotif } from "@/components/layout/layout-tile-motif"

export const metadata: Metadata = {
  title: "Foracle — Coming soon",
  description: "Foracle is being built. Check back shortly.",
  robots: { index: false, follow: false }
}

// Hard WIP screen. Every route is rewritten here by the middleware while
// NEXT_PUBLIC_SITE_LOCKED is on (see src/proxy.ts), so this page renders for
// any path the user hits. Self-contained — no app chrome, auth, or data.
export default function ComingSoonPage() {
  return (
    <main className="bg-brand-deep-forest text-brand-cream relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="relative z-10 flex max-w-md flex-col items-center">
        <Image
          src="/wordmark-168.png"
          alt="Foracle"
          width={160}
          height={46}
          priority
          className="object-contain opacity-95 invert"
        />

        <p className="font-display text-brand-coral mt-10 text-xs font-semibold tracking-[0.25em] uppercase">
          Coming soon
        </p>

        <h1 className="font-editorial mt-4 text-3xl leading-tight text-balance sm:text-4xl">
          We&rsquo;re putting the finishing touches on Foracle.
        </h1>

        <p className="text-brand-cream/70 mt-5 text-base leading-relaxed">
          The site is temporarily under construction. Thanks for your patience —
          we&rsquo;ll be live soon.
        </p>
      </div>

      <div className="absolute right-0 bottom-0 left-0 z-0 opacity-60">
        <LayoutTileMotif />
      </div>
    </main>
  )
}
