# Kindred

Plan a playdate with families you already know: pick friends, a time and a place; friends answer in the app or from a text link; the organizer confirms.

- What to build: `docs/DESIGN.md` (from the Kindred design doc)
- What to build next: `docs/NEXT.md`
- Open decisions: `docs/QUESTIONS.md`
- How Claude Code works in this repo: `CLAUDE.md`

## Commands
Node 22 (`.nvmrc`), npm.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` / `npm run test:watch` | Vitest |
| `npm run test:smoke` | Playwright smoke tests: the full loop against a production build and the local Supabase (`npm run db:start` first; run `npx playwright install webkit` once) |
| `npm run db:start` / `db:stop` | Local Supabase in Docker (ports 54520–54529, so it runs beside Lash and Aquatix) |
| `npm run db:reset` | Rebuild the LOCAL database from `supabase/migrations` and `supabase/seed.sql` |
| `npm run db:types` | Regenerate `src/lib/db/types.ts` from the local database (commit it; CI fails when it drifts) |
| `npm run test:db` | Database tests in `supabase/tests` against the local Supabase (`db:start` first) |

Local setup: `npm run db:start` (Docker), then copy `.env.example` to `.env.local` and fill it from `npx supabase status -o env` (`API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`) plus `PHONE_HASH_KEY=$(openssl rand -hex 32)` and `PUBLIC_LINK_BASE=http://localhost:3200` (where invite links point). `AI_MODE=fake` (the default) gives built-in message ideas; `AI_MODE=live` with `ANTHROPIC_API_KEY` asks Claude. To try it from a phone on the same Wi-Fi, set `DEV_ORIGINS` to the laptop's address (`ipconfig getifaddr en0`) and `PUBLIC_LINK_BASE` to `http://<that address>:3200`, then run `npx next dev -H 0.0.0.0 -p 3200`. Sign in locally with the test numbers in `supabase/config.toml` (e.g. (416) 555-0101, code 123456); nothing is sent.

Before every commit: `npm run lint && npm run typecheck && npm test`. Copy `.env.example` to `.env.local` when a task needs variables.

To start building, open a Claude Code session on this repo and send: "Do T01 in docs/NEXT.md."
