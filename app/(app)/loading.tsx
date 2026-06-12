import Image from "next/image";

/**
 * Route-segment loading UI for the whole (app) group.
 *
 * Next.js renders this as the Suspense fallback for the page slot while a tab's
 * server component streams, so switching bottom-nav / sidebar destinations shows
 * instant branded feedback instead of a frozen previous screen. The shell
 * (sidebar on desktop, floating nav + wordmark on mobile) stays mounted — only
 * the content area swaps to this. Centered and size-agnostic, so it reads well
 * on both desktop and mobile.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4">
      <div className="relative flex h-16 w-16 items-center justify-center">
        {/* Spinning brand ring */}
        <span
          aria-hidden
          className="absolute inset-0 animate-spin rounded-full border-2 border-primary/15 border-t-primary/70"
        />
        {/* Foracle "F" mark */}
        <Image
          src="/logo-144.png"
          alt="Foracle"
          width={32}
          height={32}
          priority
          className="opacity-90"
        />
      </div>
      <span
        aria-live="polite"
        className="font-display text-xs tracking-wide text-muted-foreground"
      >
        Loading…
      </span>
    </div>
  );
}
