import { DATABASE_URL } from "@/configs/db.config"
import { IS_DEV } from "@/configs/env.config"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/db/schema"

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

// Cache the client across HMR boundaries in dev — Next/Turbopack re-evals
// this module on every hot reload, and without caching, each re-eval opens
// a fresh pool while the old pool's sockets sit idle. We've seen Postgres
// hit "too many clients" after a few hours of dev. Per Drizzle's HMR guidance.
//
// max=10 bounds the pool size; idle_timeout reaps connections after 30s of
// no use so dead sockets (e.g. after laptop sleep) get recycled before the
// next query stumbles on them.
declare global {
  var __postgresClient: ReturnType<typeof postgres> | undefined
}

const client =
  global.__postgresClient ??
  postgres(DATABASE_URL, {
    max: 10,
    idle_timeout: 30,
    max_lifetime: 60 * 30
  })

if (IS_DEV) {
  global.__postgresClient = client
}

export const db = drizzle(client, { schema })
