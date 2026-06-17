#!/usr/bin/env bash
# One-time setup for the local test database.
#
# Creates a "foracle_test" database next to the dev one, enables pgvector,
# and applies the Drizzle schema. Idempotent — safe to re-run after schema
# changes to bring the test DB up to date.
#
# Usage: npm run test:db-setup

set -euo pipefail

cd "$(dirname "$0")/.."

# Make sure Postgres.app + Homebrew bins are on PATH so we can find psql /
# createdb in non-login shells (npm runs scripts via a minimal env).
for candidate in \
  /Applications/Postgres.app/Contents/Versions/latest/bin \
  /opt/homebrew/opt/postgresql@16/bin \
  /opt/homebrew/opt/postgresql@15/bin \
  /opt/homebrew/bin \
  /usr/local/bin; do
  if [ -d "$candidate" ]; then
    PATH="$candidate:$PATH"
  fi
done

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql not found. Add Postgres binaries to PATH and retry." >&2
  exit 1
fi
if ! command -v createdb >/dev/null 2>&1; then
  echo "ERROR: createdb not found. Add Postgres binaries to PATH and retry." >&2
  exit 1
fi

# Load .env.local if present
if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL must be set (typically in .env.local)" >&2
  exit 1
fi

# Prefer an explicit TEST_DATABASE_URL (set in .env.local). This keeps the test
# DB independent of DATABASE_URL — important now that dev/prod point at a remote
# Supabase instance that must NEVER be truncated. Fall back to deriving a sibling
# "foracle_test" from DATABASE_URL for an all-local setup.
TEST_DB_URL="${TEST_DATABASE_URL:-${DATABASE_URL%/*}/foracle_test}"

# Safety: the suite TRUNCATEs every table, so the target MUST be a throwaway
# "test" database — never the app DB.
if [[ "$TEST_DB_URL" != *test* ]]; then
  echo "ERROR: test DB URL must contain 'test'; got: $TEST_DB_URL" >&2
  exit 1
fi

if [ "$TEST_DB_URL" = "$DATABASE_URL" ]; then
  echo "ERROR: Test DB URL is identical to DATABASE_URL — refusing to proceed." >&2
  exit 1
fi

# DB name = last path segment, minus any trailing query string.
TEST_DB_NAME="${TEST_DB_URL##*/}"
TEST_DB_NAME="${TEST_DB_NAME%%\?*}"

echo "→ Test DB: $TEST_DB_NAME"

echo "→ Creating $TEST_DB_NAME (skip if exists)..."
if createdb "$TEST_DB_NAME" 2>/dev/null; then
  echo "  ✓ Created"
else
  echo "  • Already exists"
fi

echo "→ Enabling pgvector extension..."
psql "$TEST_DB_URL" -c "CREATE EXTENSION IF NOT EXISTS vector" >/dev/null

echo "→ Pushing schema (drizzle-kit push --force)..."
# Override DATABASE_URL just for this command so drizzle.config.ts picks up
# the test DB. drizzle-kit reads dialect + schema path from the config file.
DATABASE_URL="$TEST_DB_URL" npx drizzle-kit push --force

echo ""
echo "✓ Test DB ready. Run 'npm test' to use it."
