// Deployment environment flags — the single source of truth for which
// environment the app runs in. Source: NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT
// (development | staging | production), set per environment. NEXT_PUBLIC_ so
// the value is readable in both server and client code.
//
// Flat boolean exports by design (cf. debt-free-mastermind): an unset/unknown
// value leaves all three false, which safely blocks dev-only surfaces like
// /developer. No resolver/fail-safe indirection needed.
export const IS_PROD =
  process.env.NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT === "production"
export const IS_STAGING =
  process.env.NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT === "staging"
export const IS_DEV =
  process.env.NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT === "development"

// Hard WIP lock — when "true", every route redirects to /coming-soon (see
// src/proxy.ts). Set PER INSTANCE, decoupled from the deployment-env flags
// above: foracle.io (production) sets NEXT_PUBLIC_SITE_LOCKED=true to stay
// sealed, while demo.foracle.io (a clone of main) leaves it unset so beta
// testers can use the app. NEXT_PUBLIC_ so the middleware can read it.
export const IS_SITE_LOCKED = process.env.NEXT_PUBLIC_SITE_LOCKED === "true"
