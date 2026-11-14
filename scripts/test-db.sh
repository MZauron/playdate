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

KD_DB_TESTS=1 KD_DB_URL="$KD_DB_URL" npx vitest run supabase/tests "$@"
