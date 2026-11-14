# Kindred: plan a playdate with families you already know

A mobile-first web app: a parent picks friends, a time and a place, writes a short message; friends answer from a text link with nothing to install (or in Kindred if they use it); the organizer sees answers live and confirms.
The product is defined by the design doc "Kindred: Product & Design Document" (claude.ai, 2026-11-14), summarised in `docs/DESIGN.md`. The doc describes a native app; this repo builds it on the owner's web stack (DESIGN.md "Platform"). Product decisions belong to the doc's author: when the doc is silent, use the default in `docs/QUESTIONS.md` or ask; never invent product behaviour.
User-facing text: Canadian English, as in the doc ("favourite", "colour", "neighbourhood"). Code, comments, commits, docs: English.
Solo dev, ~8 h/week plus background sessions started from a phone. Keep changes small; `main` must always be green.

## Docs (read on demand, do not preload all)
- `docs/DESIGN.md` — platform, screens, rules KD-01…KD-17, data access, visual design, privacy. Read the parts your task touches.
- `docs/NEXT.md` — task list. Do ONE task per session; tick it when its "done when" is met.
- `docs/QUESTIONS.md` — open decisions. Code built on an open question uses its default and says so in a comment with the id (`// Q3 default`).
- `supabase/migrations/` + `supabase/tests/` — the schema and its tests (T03). `docs/schema.sql` and `docs/schema.test.sql` are the superseded drafts.
- `docs/rules.test-cases.md` — cases the rules must pass (created by T02). Test names reuse the ids (`KD-03a`…).

## Stack (same as Lash and Aquatix)
- Next.js (App Router, TypeScript strict) as ONE Railway service: the parent app, the invite page `/r/[token]`, server actions, route handlers, cron route.
- Supabase: Postgres + RLS, phone sign-in, Realtime. Its OWN projects (staging, production), never shared with Lash, Aquatix or KidSpark.
- Tailwind. Zod. date-fns + @date-fns/tz. libphonenumber-js. Vitest. Playwright for smoke. @anthropic-ai/sdk (server only).
- Node 22, npm. Pin exact versions (no `^`). Copy versions from `../aquatix/package.json` when that repo is attached; otherwise the current stable release.
- Installable web app (manifest + service worker) so parents can add Kindred to their Home Screen; Web Push only for installed apps (Q11).
- Railway cron service calls `POST /api/cron/tick` with `Authorization: Bearer $CRON_SECRET` (link clean-up, KD-12 notices). Must be idempotent.

## Layout
```
src/app/(auth)/          sign in, setup
src/app/(app)/           home, plan/[id?], playdates/[id], groups, ask, explore (signed-in parents)
src/app/r/[token]/       invite page, same for every friend (no account)
src/app/api/             cron/tick, health, places/, suggestions/
src/lib/rules/           PURE rules: no I/O, no Date.now() (clock and zone are passed in)
src/lib/db/              server-only repositories; the only place that talks to Supabase with the service role
src/lib/domain/          services: call the rules, then the repositories (playdates, invites, answers, friends, places)
src/lib/integrations/    ai/, places/, push/ — each with index.ts, live.ts, fake.ts
src/lib/i18n/en-CA.ts    every user-facing string and the date/time formatters
src/env.ts               zod-validated env, fails fast at boot
supabase/                migrations/, seed.sql, tests/
```

## Commands (created by T01; keep this list in sync)
`npm run dev` · `build` · `lint` · `typecheck` · `test` (vitest) · `test:watch` · `test:smoke` (Playwright)
`npm run db:start` (local Supabase) · `db:stop` · `db:reset` (local only) · `db:types` (regenerate `src/lib/db/types.ts`) · `test:db`
Before every commit: `npm run lint && npm run typecheck && npm test`.

## Reusing Aquatix code (optional)
- When `../aquatix` (MZauron/aquatix) is attached, copy rather than rewrite: `src/platform/security-headers.ts`, `rate-limit.ts`, `cron/`, `error-report.ts`, the `src/env.ts` pattern, the password gate (`src/lib/gate`), the phone sign-in code-step rules. Strip anything Aquatix-specific (Spanish, +593, branches).
- First line of a copied file: `// From MZauron/aquatix <path> @ <commit>`. Copy its tests too and keep them passing.
- Never modify `../aquatix` or `../lash` from this repo. No task may depend on them being attached.

## Conventions
- ONE place for each rule: `src/lib/rules`. Pages, server actions, the invite page and the cron job call it; never re-implement a rule elsewhere. Rules take data in and return a `Decision` with stable error codes (listed in DESIGN.md); the copy for each code lives in `en-CA.ts`.
- Time: store `timestamptz`. A playdate's times are interpreted in `playdates.timezone` (the organizer's browser zone at creation) via `@date-fns/tz`; never hard-code a zone outside the rules' config defaults.
- Phones: E.164 (`+14165550111`) via libphonenumber-js; Canada/US first (Q10).
- Clients never write to the database. Mutations = server actions / route handlers → zod → `auth.getUser()` → rules → repository (service role), scoped to that parent. Never trust an id or a phone number sent by the client. The browser's Supabase client is used only for Realtime on the organizer's playdate page.
- Friends without an account act only through the link token (sha256 lookup); they never get a session.
- Texts come from the organizer's own phone: the app shows a "Text Aisha" button per text friend that opens an `sms:` link with the message and that friend's link. The server never sends invite or update texts.
- DB changes: a new numbered migration (never edit an applied one), plus a test for every constraint, privilege or policy.
- Integrations (AI, places, push): interface in `index.ts`, `live.ts`, `fake.ts`, chosen by env (`AI_MODE`, `PLACES_MODE`, `PUSH_MODE` = `fake|live`). Tests and phone sessions use fakes. Every AI feature has a non-AI fallback.
- UI: mobile-first (works at 375 px), follow DESIGN.md "Visual design" (teal brand, coral for the ONE main action per screen, 44 px touch targets, status lines not badges). Copy is short, warm and plain; buttons say what happens.
- Logging: ids and codes only. Phones masked to the last 4. Never log messages, codes, tokens, contacts or children's names.
- Commits: small, imperative, English. One branch + PR per task; the Railway PR environment must boot before merge. Justify any new dependency in the PR description.

## Privacy (from the doc; tested, never weakened)
- Friends lists, groups and saved places are private to their owner.
- Invitees see first names only: the organizer's first name, children's first names in the title, other invitees' first names in Everyone's picks (KD-17). Never phone numbers, groups, ages or saved places.
- Only the contacts a parent chooses are sent to the server, and only to check which use Kindred.
- Invite links: 128-bit random, stored as sha256 only, one playdate each, expire after the playdate (KD-14).
- `profiles.phone_hash`, `friends.phone_hash` and `invites.token_hash` are never readable by a client (column privileges, tested).

## Secrets and environments
- Secrets live in Railway variables and `.env.local` (gitignored). `.env.example` lists names only.
- Browser-visible: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` only.
- Server only: `SUPABASE_SERVICE_ROLE_KEY`, `PHONE_HASH_KEY`, `ANTHROPIC_API_KEY`, the places key, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, `PUBLIC_LINK_BASE`.
- `SITE_PASSWORD` (optional): the password curtain from Aquatix for staging and demos; the invite page `/r/*` is always outside it.
- Development signs in with Supabase test phone numbers and fixed codes; no real SMS until Q10 is decided.

## NEVER do
- Never put the service-role key or any API key in client code, `NEXT_PUBLIC_*`, logs or commits.
- Never confirm a playdate automatically (KD-01). Never add wording to a parent's message (KD-05).
- Never send a text or push without the organizer's action, and never send invite texts from the server.
- Never read or upload a parent's address book beyond the contacts they choose. Never show one parent's friends, groups or saved places to another.
- Never disable RLS, add a permissive policy, grant a client INSERT/UPDATE/DELETE or a hidden column, or use the service role on a path a client can steer without checking ownership first.
- Never store place data the provider's terms forbid (Q6).
- Never use local-timezone `Date` math or `Date.now()` inside `src/lib/rules`.
- Never hard-code user-facing strings in components.
- Never edit an applied migration; never run destructive SQL, `db:reset` or `git push --force` against anything but local.
- Never start unrelated refactors or features beyond the current NEXT.md task; note ideas in NEXT.md "Later".

## Session hygiene (Pro plan limits)
Read only the files the task needs. Prefer pure-function work + tests for background sessions (no secrets, no Docker).
Stop and report when blocked by a missing credential or an open question in QUESTIONS.md that changes the task.

## Before starting a task
`git fetch origin`, check open PRs and remote branches, read the latest `docs/NEXT.md` and `git log origin/main`.
If the task is merged, has an open PR or a branch, STOP and say so. Branch from fresh `origin/main`.
