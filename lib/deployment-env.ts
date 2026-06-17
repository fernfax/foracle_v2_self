/**
 * Deployment environment — the single, deliberate source of truth for which
 * environment the app is running in. Set via NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT
 * (development | staging | production) in each environment's config, rather than
 * inferring intent from Node's NODE_ENV (which is just the bundler/runtime mode
 * and is "production" for every deployed build, staging included).
 *
 * It is NEXT_PUBLIC_ so the same value is readable in both server and client code.
 */
export type DeploymentEnvironment = "development" | "staging" | "production"

function resolveDeploymentEnvironment(): DeploymentEnvironment {
  const raw = process.env.NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT
  if (raw === "development" || raw === "staging" || raw === "production") {
    return raw
  }
  // Fail safe: an unset or unrecognised value is treated as production — the
  // most locked-down environment (developer tools off, no dev-only shortcuts).
  return "production"
}

export const DEPLOYMENT_ENVIRONMENT: DeploymentEnvironment =
  resolveDeploymentEnvironment()

export const isDevelopment = DEPLOYMENT_ENVIRONMENT === "development"
export const isStaging = DEPLOYMENT_ENVIRONMENT === "staging"
export const isProduction = DEPLOYMENT_ENVIRONMENT === "production"
