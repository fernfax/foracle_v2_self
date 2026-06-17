import type { Metadata } from "next"

// Public route — lives OUTSIDE app/(app)/, so the auth-gated layout never runs
// and proxy.ts (Clerk) doesn't protect it. Force-static so it can be precached
// by the service worker and served with no network.
//
// IMPORTANT: this page is shown precisely when the network is down, so it must
// NOT depend on any external CSS/JS/font chunk (those may not be cached). All
// styling is inlined and theme follows prefers-color-scheme (next-themes' .dark
// class needs app JS, which we can't rely on offline). The logo is precached by
// the service worker (see public/sw.js PRECACHE_URLS).
export const dynamic = "force-static"

export const metadata: Metadata = {
  title: "Offline · Foracle"
}

const css = `
  .of-main {
    min-height: 100vh; min-height: 100svh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 24px; padding: 24px calc(24px + env(safe-area-inset-right)) 24px calc(24px + env(safe-area-inset-left));
    text-align: center;
    background: #FBF7F1; color: #1C2B2A;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .of-logo { width: 64px; height: 64px; object-fit: contain; opacity: 0.9; }
  .of-title { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: -0.01em; }
  .of-copy { margin: 8px auto 0; max-width: 22rem; font-size: 15px; line-height: 1.6; color: rgba(28,43,42,0.6); }
  .of-btn {
    display: inline-flex; align-items: center; justify-content: center;
    min-height: 44px; padding: 0 24px; border-radius: 6px;
    background: #B8622A; color: #FBF7F1;
    font-size: 15px; font-weight: 500; text-decoration: none;
  }
  .of-foot { margin: 0; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(28,43,42,0.45); }
  @media (prefers-color-scheme: dark) {
    .of-main { background: #141E1D; color: #F0EBE0; }
    .of-copy { color: rgba(240,235,224,0.6); }
    .of-btn { background: #D4845A; color: #141E1D; }
    .of-foot { color: rgba(240,235,224,0.45); }
  }
`

export default function OfflinePage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <main className="of-main">
        {/* Plain <img> on purpose: next/image needs the server-side optimizer,
            which is unavailable offline. The raw file is precached. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="of-logo"
          src="/logo-144.png"
          alt="Foracle"
          width={64}
          height={64}
        />
        <div>
          <h1 className="of-title">You&apos;re offline</h1>
          <p className="of-copy">
            Foracle can&apos;t reach the network right now. Your finances need a
            connection to stay accurate, so the app is paused until you&apos;re
            back online.
          </p>
        </div>
        <a className="of-btn" href="/">
          Try again
        </a>
        <p className="of-foot">Foracle</p>
      </main>
    </>
  )
}
