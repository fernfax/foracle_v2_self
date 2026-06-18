import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this project. Without it, Turbopack
  // infers the root from the parent folder (which holds many sibling repos) and
  // over-traces files (e.g. next.config.ts itself) into route bundles — the
  // "Encountered unexpected file in NFT list" warning. Mirrors the sister repos.
  turbopack: {
    root: import.meta.dirname
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
      allowedOrigins: ["localhost:3002"]
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com"
      }
    ]
  }
}

export default nextConfig
