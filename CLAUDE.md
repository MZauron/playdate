# Kindred: plan a playdate with families you already know

Mobile app: a parent picks friends, a time and a place, writes a short message; friends answer in the app or from a text link with nothing to install; the organizer sees answers live and confirms.
The product is defined by the design doc "Kindred: Product & Design Document" (claude.ai, 2026-11-14), summarised in `docs/DESIGN.md`. Product decisions belong to its author: when the doc is silent, use the default in `docs/QUESTIONS.md` or ask; never invent product behaviour.
User-facing text: Canadian English, as in the doc ("favourite", "colour", "neighbourhood"). Code, comments, commits, docs: English.
Built by one developer in evenings (~8 h/week) plus background sessions started from a phone. Keep changes small; `main` must always be green.

## Docs (read on demand, do not preload all)
- `docs/DESIGN.md` — screens, rules KD-01…KD-17, architecture, data access, visual design, privacy. Read the parts your task touches.
- `docs/NEXT.md` — task list. Do ONE task per session; tick it when its "done when" is met.
- `docs/QUESTIONS.md` — open decisions. Code built on an open question uses its default and says so in a comment with the id (`// Q3 default`).
- `docs/schema.sql` + `docs/schema.test.sql` — the first migration and its 42 checks, until T03 moves them into `supabase/`.
- `docs/rules.test-cases.md` — cases the rules must pass (created by T02). Test names reuse the ids (`KD-03a`…).

## Stack
- `apps/mobile`: Expo (React Native) with TypeScript strict, Expo Router, Zustand; `expo-contacts`, `expo-sms`, `expo-secure-store`; iOS first (Q15).
- `apps/web`: Next.js (App Router, TypeScript strict) as ONE Railway service: the invite page `/r/[token]`, the API `/api/*`, landing and privacy pages.
- `packages/core`: the rules, pure TypeScript, used by the app, the page and the API. `packages/ui-copy`: every user-facing string.
- Supabase: Postgres + RLS, phone sign-in, Realtime, pg_cron. Zod. date-fns + @date-fns/tz. libphonenumber-js. Vitest. @anthropic-ai/sdk (server only).
- Node 22, npm workspaces. Pin exact versions (no `^`).

## Commands (created by T01; keep this list in sync)
`npm run dev:mobile` · `dev:web` · `lint` · `typecheck` · `test` · `build:web`
`npm run db:start` (local Supabase) · `db:reset` · `db:types` · `db:test`
Before every commit: `npm run lint && npm run typecheck && npm test`.

## Conventions
- ONE place for each rule: `packages/core`. Screens, the web page and the API call it; never re-implement a rule elsewhere. Rules take data in and return a `Decision` with stable error codes (listed in DESIGN.md); copy for each code lives in `packages/ui-copy`.
- No clock and no I/O in `packages/core`: pass `now` and the time zone in.
- Time: store `timestamptz`. A playdate's times are interpreted in `playdates.timezone` (the organizer's zone at creation); never hard-code a zone outside `config.ts` defaults.
- Phones: E.164 (`+14165550111`) via libphonenumber-js; Canada/US first (Q10).
- Data access as in DESIGN.md "Data access": the app reads with RLS and writes only owner-only data directly (its first name, children, groups, group members, saved places, and a friend's label or removal). Adding a friend and every playdate, invite and answer write go through the API: zod → `auth.getUser()` → core rules → service-role write scoped to that user. Never trust an id or a phone number sent by the client.
- Friends without the app never get an account. The web page acts only through the link token (sha256 lookup).
- Texts come from the organizer's own phone: the app opens the Messages composer (`expo-sms`). The server never sends invite or update texts.
- DB changes: a new numbered migration (never edit an applied one), plus a test for every constraint, privilege or policy.
- Integrations (AI, places, push) sit behind an interface with a fake; tests and phone sessions use the fake. Every AI feature has a non-AI fallback.
- UI: follow DESIGN.md "Visual design" (teal brand, coral for the ONE main action per screen, 44 px touch targets, status lines not badges). Copy is short, warm and plain; buttons say what happens.
- Logging: ids and codes only. Phones masked to the last 4. Never log messages, codes, tokens, contacts or children's names.
- Commits: small, imperative, English. One branch + PR per task. Justify any new dependency in the PR description.

## Privacy (from the doc; tested, never weakened)
- Friends lists, groups and saved places are private to their owner.
- Invitees see first names only: the organizer's first name, children's first names in the title, other invitees' first names in Everyone's picks (KD-17). Never phone numbers, groups, ages or saved places.
- Only the numbers a parent picks leave the phone, and only to check which use Kindred.
- Invite links: 128-bit random, stored as sha256 only, one playdate each, expire after the playdate (KD-14).
- `profiles.phone_hash`, `friends.phone_hash` and `invites.token_hash` are never readable by a client (column privileges, tested).

## Secrets and environments
- Secrets live in Railway variables and `.env.local` (gitignored). `.env.example` lists names only.
- The app gets only `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` and `EXPO_PUBLIC_API_URL`.
- Server only: `SUPABASE_SERVICE_ROLE_KEY`, `PHONE_HASH_KEY`, `ANTHROPIC_API_KEY`, the places key, `PUBLIC_LINK_BASE`.
- Development signs in with Supabase test phone numbers and fixed codes; no real SMS until Q10 is decided.

## NEVER do
- Never put the service-role key or any API key in the app, in `EXPO_PUBLIC_*` / `NEXT_PUBLIC_*`, logs or commits.
- Never confirm a playdate automatically (KD-01). Never add wording to a parent's message (KD-05).
- Never send a text or push without the organizer's action, and never from the server for invites.
- Never upload the whole address book. Never show one parent's friends, groups or saved places to another.
- Never disable RLS, add a permissive policy, grant a hidden column, or use the service role on a path a client can steer without checking ownership first.
- Never store place data the provider's terms forbid (Q6).
- Never edit an applied migration; never run destructive SQL, `db:reset` or `git push --force` against anything but local.
- Never start unrelated refactors or features beyond the current NEXT.md task; note ideas in NEXT.md "Later".

## Session hygiene (Pro plan limits)
Read only the files the task needs. Prefer pure-function work + tests for background sessions (no secrets, no Docker, no device).
Stop and report when blocked by a missing credential or an open question in QUESTIONS.md that changes the task.

## Before starting a task
`git fetch origin`, check open PRs and remote branches, read the latest `docs/NEXT.md` and `git log origin/main`.
If the task is merged, has an open PR or a branch, STOP and say so. Branch from fresh `origin/main`.
