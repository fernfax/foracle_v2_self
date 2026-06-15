import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

// Public route — lives OUTSIDE app/(app)/, so the auth-gated layout never runs
// and proxy.ts (Clerk) doesn't protect it. Force-static so it can be precached
// by the service worker and served with no network.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Offline · Foracle",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      {/* `unoptimized` serves the raw /logo-144.png instead of routing through
          the Next image optimizer (which needs the server) — so the logo still
          renders with no network. The file is precached by the service worker. */}
      <Image
        src="/logo-144.png"
        alt="Foracle"
        width={64}
        height={64}
        className="object-contain opacity-90"
        unoptimized
        priority
      />
      <div className="max-w-sm space-y-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          You&apos;re offline
        </h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Foracle can&apos;t reach the network right now. Your finances need a connection to stay
          accurate, so the app is paused until you&apos;re back online.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-sm bg-primary px-5 py-2.5 font-display text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Try again
      </Link>
      <p className="font-display text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70">
        Foracle
      </p>
    </main>
  );
}
