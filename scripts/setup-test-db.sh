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

# Derive the test DB URL by stripping the db-name segment off the end of
# DATABASE_URL and re-appending "/foracle_test". Bash parameter expansion is
# portable across mac (BSD) and linux (GNU) without sed regex differences.
# Any trailing query string is dropped — fine for our use case.
TEST_DB_URL="${DATABASE_URL%/*}/foracle_test"

if [[ "$TEST_DB_URL" != *foracle_test* ]]; then
  echo "ERROR: Could not derive a test DB URL from DATABASE_URL." >&2
  echo "       Expected URL ending with /<dbname>; got: $DATABASE_URL" >&2
  exit 1
fi

if [ "$TEST_DB_URL" = "$DATABASE_URL" ]; then
  echo "ERROR: Test DB URL is identical to DATABASE_URL — refusing to proceed." >&2
  exit 1
fi

echo "→ Test DB URL: $TEST_DB_URL"

echo "→ Creating foracle_test (skip if exists)..."
if createdb foracle_test 2>/dev/null; then
  echo "  ✓ Created"
else
  echo "  • Already exists"
fi

echo "→ Enabling pgvector extension..."
psql foracle_test -c "CREATE EXTENSION IF NOT EXISTS vector" >/dev/null

echo "→ Pushing schema (drizzle-kit push --force)..."
# Override DATABASE_URL just for this command so drizzle.config.ts picks up
# the test DB. drizzle-kit reads dialect + schema path from the config file.
DATABASE_URL="$TEST_DB_URL" npx drizzle-kit push --force

echo ""
echo "✓ Test DB ready. Run 'npm test' to use it."
