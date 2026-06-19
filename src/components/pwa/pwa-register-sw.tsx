"use client"

import { useEffect } from "react"
import { IS_DEV } from "@/configs/env.config"

/**
 * Registers the service worker (public/sw.js) on the client, after window load.
 *
 * Production only by design: a service worker in `npm run dev` caches _next
 * chunks and fights hot-reload. To test offline locally, run a production
 * build: `npm run build && npm start`, then toggle offline in DevTools.
 *
 * Renders nothing. Mounted once in the root layout body.
 */
export function PwaRegisterSw() {
  useEffect(() => {
    if (IS_DEV) return
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
      return

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) =>
          console.error("[pwa] service worker registration failed", err)
        )
    }

    if (document.readyState === "complete") {
      register()
      return
    }
    window.addEventListener("load", register, { once: true })
    return () => window.removeEventListener("load", register)
  }, [])

  return null
}
