#!/usr/bin/env bash
# From MZauron/aquatix scripts/test-db.sh @ 4a87d68
# Runs the database tests (supabase/tests) against the LOCAL Supabase stack: `npm run db:start` first.
# They create and delete their own data; they never touch the seed or any hosted project.
# Without the CLI (or Docker) point KD_DB_URL at any local Postgres that has the migrations applied and Supabase's roles.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${KD_DB_URL:-}" ]; then
  status="$(npx supabase status -o env 2>/dev/null)" || { echo "The local Supabase is not running. Start it with: npm run db:start" >&2; exit 1; }
  KD_DB_URL="$(printf '%s\n' "$status" | sed -n 's/^DB_URL="\(.*\)"$/\1/p')"
fi
case "$KD_DB_URL" in
  postgresql://*@127.0.0.1:*|postgresql://*@localhost:*|postgres://*@127.0.0.1:*|postgres://*@localhost:*) ;;
  *) echo "Refusing to run: the database is not on a local address." >&2; exit 1 ;;
esac

# The repository tests (supabase/tests/*-store.test.ts) go through the real Supabase API with the local keys. They run only when
# the CLI can tell us the local API address and keys; with just KD_DB_URL they are skipped.
if [ -n "${status:-}" ]; then
  api_url="$(printf '%s\n' "$status" | sed -n 's/^API_URL="\(.*\)"$/\1/p')"
  case "$api_url" in
    http://127.0.0.1:*|http://localhost:*)
      export NEXT_PUBLIC_SUPABASE_URL="$api_url"
      export NEXT_PUBLIC_SUPABASE_ANON_KEY="$(printf '%s\n' "$status" | sed -n 's/^ANON_KEY="\(.*\)"$/\1/p')"
      export SUPABASE_SERVICE_ROLE_KEY="$(printf '%s\n' "$status" | sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"$/\1/p')"
      export KD_LOCAL_API=1 ;;
  esac
fi

KD_DB_TESTS=1 KD_DB_URL="$KD_DB_URL" npx vitest run supabase/tests "$@"
