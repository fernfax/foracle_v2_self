// Postgres connection string. Server-only — `@/db` is never imported
// client-side. Consumed by `@/db` (the Drizzle client).
export const DATABASE_URL = process.env.DATABASE_URL
