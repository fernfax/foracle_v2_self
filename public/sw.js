/* Foracle Budget Tracker — hand-rolled service worker.
 *
 * Strategy (financial app, multi-user, auth-gated):
 *   - /api/auth/* and Clerk handshake traffic   → pass through, never touched.
 *   - /api/*  → network-FIRST, NEVER cached. On network failure return a
 *               503 JSON {offline:true}. We never serve stale financial data.
 *   - static assets (/_next/static, /icons, fonts, images) → cache-FIRST
 *               (these are content-hashed / immutable, safe to keep).
 *   - document navigations → network-FIRST, falling back to the precached
 *               /offline page. Authed HTML (e.g. /budget) is intentionally
 *               NOT cached, so we never serve a stale or another user's shell.
 *
 * Bump CACHE_VERSION on any change here; `activate` deletes every cache that
 * isn't in the current version, so old shells/assets are cleaned up.
 *
 * iOS Safari caveats:
 *   - Cache eviction: iOS purges a PWA's CacheStorage after ~7 days without
 *     use (and earlier under storage pressure). Treat offline support as
 *     best-effort, not durable storage.
 *   - No Background Sync / Periodic Background Sync on iOS — we can't refresh
 *     data in the background; everything here is request-time only.
 *   - Web Push works only for PWAs ADDED TO THE HOME SCREEN (iOS 16.4+) and
 *     requires a user gesture — not available to plain Safari tabs. (No push
 *     wired up here; noting it for when it's added.)
 */

const CACHE_VERSION = "v2";
const STATIC_CACHE = `foracle-static-${CACHE_VERSION}`;
const SHELL_CACHE = `foracle-shell-${CACHE_VERSION}`;
const CURRENT_CACHES = [STATIC_CACHE, SHELL_CACHE];

// Precache the offline fallback + its assets so /offline works with no network.
const PRECACHE_URLS = [
  "/offline",
  "/icons/icon-192.png",
  "/logo-144.png", // logo shown on the /offline page — must be cached to render offline
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // Activate this SW immediately rather than waiting for old tabs to close.
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !CURRENT_CACHES.includes(key)).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// --- helpers ---------------------------------------------------------------

function isClerkOrAuth(url) {
  // Clerk handshake / FAPI lives on *.clerk.* (cross-origin, already skipped)
  // or arrives with a __clerk* query param; /api/auth/* is our auth surface.
  return (
    url.pathname.startsWith("/api/auth") ||
    url.hostname.includes("clerk") ||
    url.search.includes("__clerk")
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:css|js|png|jpe?g|webp|gif|svg|ico|woff2?|ttf)$/.test(url.pathname)
  );
}

async function networkOnlyOr503(request) {
  try {
    // No cache read and no cache write — financial responses stay fresh-only.
    return await fetch(request);
  } catch {
    return new Response(JSON.stringify({ offline: true }), {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  // Only cache successful, basic/cors responses (skip opaque/partial/range).
  if (response && response.ok && response.status === 200) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkThenOffline(request) {
  try {
    return await fetch(request);
  } catch {
    const offline = await caches.match("/offline");
    return (
      offline ||
      new Response("<h1>You are offline</h1>", {
        status: 503,
        headers: { "Content-Type": "text/html" },
      })
    );
  }
}

// --- router ----------------------------------------------------------------

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only ever handle same-origin GETs. Mutations (POST/PATCH/...) and
  // cross-origin (Clerk, Neon, image CDNs) go straight to the network.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Auth must never be intercepted/cached — let it always hit the network raw.
  if (isClerkOrAuth(url)) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkOnlyOr503(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkThenOffline(request));
    return;
  }
  // Everything else: default browser handling (no respondWith).
});
