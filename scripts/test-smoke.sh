#!/usr/bin/env bash
# Runs the Playwright smoke tests (tests/smoke) against a production build of the app and the LOCAL Supabase: `npm run db:start` first.
# The full-loop test signs up the test number (416) 555-0109 (0108 on a retry) on every attempt; tests/smoke/reset.ts deletes that
# one account first, and only on a local database.
set -euo pipefail
cd "$(dirname "$0")/.."

status="$(npx supabase status -o env 2>/dev/null)" || { echo "The local Supabase is not running. Start it with: npm run db:start" >&2; exit 1; }
value() { printf '%s\n' "$status" | sed -n "s/^$1=\"\(.*\)\"$/\1/p"; }

export KD_DB_URL="$(value DB_URL)"
case "$KD_DB_URL" in
  postgresql://*@127.0.0.1:*|postgresql://*@localhost:*|postgres://*@127.0.0.1:*|postgres://*@localhost:*) ;;
  *) echo "Refusing to run: the database is not on a local address." >&2; exit 1 ;;
esac
export NEXT_PUBLIC_SUPABASE_URL="$(value API_URL)"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$(value ANON_KEY)"
export SUPABASE_SERVICE_ROLE_KEY="$(value SERVICE_ROLE_KEY)"
export PHONE_HASH_KEY="${PHONE_HASH_KEY:-smoke-test-phone-hash-key-0123456789abcdef}"
export PUBLIC_LINK_BASE="http://localhost:3100"
export AI_MODE=fake

npx playwright test "$@"
