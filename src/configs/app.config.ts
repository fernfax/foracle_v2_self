// App-level config. Client-safe (NEXT_PUBLIC_*).

// Absolute origin of this instance, e.g. https://foracle.example.com. Used when
// building absolute URLs (e.g. the Clerk family-invitation redirect). Must be
// set per environment/host — Render and Vercel each get their own value.
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? ""
