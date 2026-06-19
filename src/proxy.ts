import { NextResponse } from "next/server"
import { IS_SITE_LOCKED } from "@/configs/env.config"
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// Hard WIP lock: when NEXT_PUBLIC_SITE_LOCKED is on (foracle.io), every route
// is redirected to the WIP screen so nothing renders or responds. The screen
// itself must stay reachable to avoid a redirect loop. Static assets are
// already excluded by the matcher below, so the WIP page can show its wordmark.
const LOCK_PASSTHROUGH = "/coming-soon"
const isLockPassthrough = createRouteMatcher([LOCK_PASSTHROUGH])

// Protected routes - all authenticated app pages
const isProtectedRoute = createRouteMatcher([
  "/overview(.*)",
  "/user(.*)",
  "/expenses(.*)",
  "/assets(.*)",
  "/budget(.*)",
  "/goals(.*)",
  "/investments(.*)",
  "/policies(.*)",
  "/mobile-guide(.*)"
])

export default clerkMiddleware(async (auth, req) => {
  // Hard WIP lock takes precedence over auth: redirect every request to the WIP
  // screen so no page renders and no API responds. A 307 (temporary) keeps the
  // canonical URL at /coming-soon and isn't cached, so flipping the flag off
  // restores every route immediately. /coming-soon is let through to avoid a loop.
  if (IS_SITE_LOCKED && !isLockPassthrough(req)) {
    return NextResponse.redirect(new URL(LOCK_PASSTHROUGH, req.url))
  }

  if (isProtectedRoute(req)) await auth.protect()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)"
  ]
}
