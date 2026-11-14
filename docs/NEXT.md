# NEXT — task list

One task per Claude Code session. Tick it when its "done when" is met; add a one-line note if you deviated or decided something.
Read CLAUDE.md + only the docs a task names.
**[phone]** = safe for a background cloud session: no secrets, no Docker, tests use fakes.
**[laptop]** = needs consoles, keys or local Supabase.
**[desk]** = done in the Claude desktop app on the laptop: the local app, the browser pane, a phone in hand.
Estimates are session time (1–2 h each).

## Where we are (2026-11-14)
- **Built:** the T01 scaffold (Next.js app, tooling, CI, `/api/health`, placeholder home); the T02 rules in `src/lib/rules` (86 cases in `docs/rules.test-cases.md`); the T03 database (`supabase/migrations/0001_init.sql`, 55 DB tests in CI); the T06 components and Home (`src/components`, tab placeholders); the T05 sign-in and Setup (verified locally with Supabase test numbers; staging waits for T04). Also in the repo, the starter kit: `CLAUDE.md`, `docs/DESIGN.md` (from the Kindred design doc, on the owner's Next.js + Supabase stack), `docs/schema.sql` + `docs/schema.test.sql` (46 checks passing on Postgres 16), `docs/QUESTIONS.md`.
- **Next:** T04 (the owner's accounts, for staging), T07 Friends and T08 Plan a playdate (both build on T05, tested locally) (both [phone], they can run in parallel after T01).
- **Alongside the code:** test the clickable prototype with 5–8 parents (the doc's next step 2). Note what they stumble on in `docs/QUESTIONS.md`.

## Plan
- **Phase 0 · Foundation (T01–T04):** app scaffold, CI, rules, database, accounts.
- **Phase 1 · The core loop with text friends (T05–T11):** sign in, setup, Home, plan with Pick date and time, Text buttons, the invite page, live answers, confirm. Gate: three real parents without Kindred answer a real invite and the organizer confirms.
- **Phase 2 · The full design (T12–T19):** Share availability, invites between Kindred users, edit and updates, places, groups.
- **Phase 3 · Private beta (T20–T25):** Home Screen install and Web Push, cancel, calendar, privacy, production, one class group.

## Open tasks

### Phase 0 · Foundation
- [x] **T01 Scaffold the app** [phone]
  Next.js App Router, TypeScript strict, Tailwind, zod, date-fns + @date-fns/tz, libphonenumber-js, Vitest, ESLint, Playwright; exact versions (copy from `../aquatix/package.json` if attached, else current stable).
  `.nvmrc` 22, `src/env.ts` (zod, fails fast; only the vars this task needs), `GET /api/health`, `.env.example`, README with the commands, `src/lib/i18n/en-CA.ts` (empty to start), Tailwind theme with the colours and radii of DESIGN.md "Visual design", a web manifest (name, teal theme colour, icons placeholder).
  CI (GitHub Actions): install, lint, typecheck, test, build. Copy `security-headers.ts` (+ tests) from `../aquatix` if attached and wire it into `next.config.ts`.
  Done when: `npm run lint && npm run typecheck && npm test && npm run build` pass locally and in CI; `/api/health` answers; the home route renders a placeholder at 375 px.

- [x] **T02 Rules** [phone]
  `src/lib/rules`: `types.ts` (`Decision = {ok, errors: {code, field?}[]}`, the codes in DESIGN.md), `time.ts` (zone passed in, clock injected), `config.ts` (slot times, link grace 12 h, min pick 30 min, reason chips), and one module per rule group: `plan.ts` (KD-02, 03, 04, 05, 06), `answers.ts` (KD-07, 08), `confirm.ts` (KD-09), `edit.ts` (KD-10: returns what to change, never writes), `picks.ts` (KD-11, 12), `home.ts` (KD-13), `links.ts` (KD-14 expiry; token generation lives in `src/lib/domain`).
  Create `docs/rules.test-cases.md`: cases with ids (`KD-03a`…), each with input and expected result. Test names reuse the ids.
  Done when: every case in the file has a test named by its id (a test enforces it, both ways), and `no-clock.test.ts` fails if anything in `src/lib/rules` reads the clock or imports I/O.

- [x] **T03 Database: migration and tests** [phone]
  `supabase init` (ports chosen so they don't clash with Lash's or Aquatix's local Supabase); `supabase/migrations/0001_init.sql` = `docs/schema.sql` plus `alter publication supabase_realtime add table answers, invites, playdates;`.
  Turn `docs/schema.test.sql` into `supabase/tests` (as Aquatix does, Vitest with `pg`, or pgTAP) using real Supabase roles and `request.jwt.claims` instead of the stand-ins.
  CI: a `db` job that runs `supabase start` and the tests; a `types` job that generates `src/lib/db/types.ts` and fails when it drifts from the migrations.
  Done when: the CI `db` job passes every check from `docs/schema.test.sql`; `docs/schema.sql` gets a header line saying the migration is now the source of truth.

- [ ] **T04 Accounts: Supabase and Railway** [laptop] (mostly the owner's list below)
  Staging Supabase project; phone sign-in turned on with **test phone numbers and fixed codes** (no SMS provider until Q10); migration pushed.
  Railway service from this repo (Node 22), env vars from `.env.example`, `PHONE_HASH_KEY` (32 random bytes), `CRON_SECRET`, `SITE_PASSWORD` on staging, staging URL as `PUBLIC_LINK_BASE` (Q16). PR environments on.
  Done when: staging `/api/health` reports the database reachable, and a test number can sign in on staging.

### Phase 1 · The core loop with text friends
- [x] **T05 Sign in and Setup** [laptop]
  Phone number (+1 formatting, Q10) → code (Supabase phone sign-in, session in httpOnly cookies via `@supabase/ssr`; copy the code-step rules and per-phone limits from Aquatix if attached). Setup exactly as DESIGN.md "Screens"; a server action writes `profiles` (with `phone_hash` computed on the server from the signed-in user's phone) and `children`.
  Done when: a new user goes sign in → Setup → Home; a returning user lands on Home; empty first name or child name shows the short message; tests cover the Setup action (including a forged `parent_id` being ignored).

- [x] **T06 Layout, components and Home** [phone]
  Components in `src/components`: Card, Button (main/secondary/destructive), Chip, StatusLine, NumberedStep, TwoPartSwitch, Toast, bottom tabs (Home, Groups, Ask, Explore; the last three placeholders), as in DESIGN.md "Visual design". Home: banner (greeting by time of day, "Welcome, Alex" the first time), Plan a playdate card, the three sections from `rules/home.ts`, hidden when empty.
  Done when: Home renders with no playdates (banner + Plan card only) and with fake playdates in each section; component tests for both; works at 375 px with 44 px touch targets.

- [ ] **T07 Friends** [phone]
  Add a friend: "Choose from contacts" when `navigator.contacts` exists (Contact Picker API), otherwise name, child's name and number with "Paste a number" (Q15). A server action normalizes to E.164, computes the HMAC with `PHONE_HASH_KEY`, matches `profiles.phone_hash`, inserts for the signed-in owner only, rate-limited (copy `rate-limit.ts` from Aquatix if attached). Your friends list with has Kindred / gets a text tags; rename the label; remove.
  Done when: tests cover normalizing, hashing, matching, a duplicate, the rate limit, and that another owner's id in the form is ignored.

- [ ] **T08 Plan a playdate: set time, typed place, send** [laptop]
  The planning screen: 1 Who's invited, 2 When (Pick date and time only; Share availability shows "coming soon"), Details (place name + address, ☆ Save this place, saved-place suggestions, Your name, Message with ✨ Suggestions and ↻ New ideas), Send. "Leave this playdate?" on Back with content.
  Server: `createPlaydate` action (`rules/plan.ts` decides; creates the playdate, invites, 22-char tokens stored as sha256, `links_expire_at`) and `/api/suggestions` (AI via `integrations/ai`; with `AI_MODE=fake` or no key it returns 3 built-in templates from the plan). After sending, a list of **Text Aisha** buttons opens `sms:` links with the message and each friend's link; each ticks when tapped (Q3).
  Done when: tests cover each KD-02…06 refusal and that only token hashes are stored; on a real phone the Text button opens Messages with the right number, message and link.

- [ ] **T09 Invite page: Pick date and time** [phone]
  `/r/[token]`: look up by sha256(token); the page as in DESIGN.md "Screens" (organizer name, message bubble, details card with Directions); We're in! / Can't make it with reason chips and note; Thanks + Change my answer; This playdate is over (KD-14). The answer action uses `rules/answers.ts` (KD-07, `STALE_TIME`). `noindex`, outside the `SITE_PASSWORD` curtain, rate limit per token and IP.
  Done when: tests cover a valid answer, a change of answer, an expired link, a stale time version, a cancelled playdate, and that the page never holds phone numbers or another playdate; works at 375 px with no account.

- [ ] **T10 Organizer's playdate page, live answers, confirm** [laptop]
  Same layout as Plan: Who's invited with "2 of 3 answered · Live" and status lines (KD-08); When with "2 families can come: Dev, Maya" and Confirm and send update (KD-09); Where; Details. Realtime on `answers`, `invites`, `playdates` for this playdate (browser client, the parent's session). `confirmPlaydate` action. After confirming: ✓ Update sent card, and Text buttons for text friends with the final date, time and place (Q3). The invite page shows the "It's on! 🎉" bubble and the CONFIRMED band.
  Done when: an answer given on the invite page appears on the organizer's page without a refresh; confirm is refused with no yes (`CONFIRM_NEEDS_YES`); the confirmed state shows on both sides.

- [ ] **T11 Phase 1 run-through** [desk]
  The full loop on staging with the organizer on a phone and two friends answering from their links (one yes, one no). Fix what breaks (small fixes only; anything bigger becomes a task). Add a Playwright smoke test for the loop with fakes.
  Done when: the loop works end to end twice in a row, the smoke test passes in CI, and the result is written under "Where we are".

### Phase 2 · The full design
- [ ] **T12 Share availability: the organizer's grid** [phone]
  The When step's second option: week grid (Morning/Afternoon/Evening, arrows between weeks), Done → "5 times you're free" summary; switching clears the other option (KD-02). The server stores `availability_slots`; `links_expire_at` from the last slot.
  Done when: tests for KD-02/KD-04 through the action; an availability playdate sends like a set-time one.

- [ ] **T13 Answering availability** [phone]
  On the invite page, under "Alex's availability": Free boxes; tap one (orange tick), from/until in 30-minute steps; Send …; Can't make it; Already suggested at the top; after answering, Everyone's picks with Your pick and Switch to this (KD-11, first names only, KD-17).
  Done when: tests cover a pick outside a slot, a pick off the half hour, Switch to this, and that Everyone's picks shows first names only.

- [ ] **T14 Organizer: suggested times, Most picked, confirm** [phone]
  Your availability (sent), Times friends suggested with who picked each, Most picked on top; tap + Confirm and send update. Needs you on Home (KD-13). The majority notice (KD-12) as decided in Q2, found by the cron tick.
  Done when: confirming an availability playdate sets the final range everywhere; the majority notice appears once per text friend and never again (idempotent tick).

- [ ] **T15 Invites between Kindred users** [phone]
  A Kindred friend's Home shows "Alex invited Arjun" with the message, time and place; it opens the same invite view as `/r/[token]`, signed in. One payload builder for both.
  Done when: a Kindred friend answers and the organizer sees it live; the friend never sees other invites or friends (RLS tests already cover the reads).

- [ ] **T16 Edit playdate and updates** [phone]
  Edit playdate opens the planning screen titled Edit playdate, filled in; Send update. The action uses `rules/edit.ts` (KD-10): a new time clears answers and shows New time; other changes keep it confirmed and show Updated; added friends get invites, removed friends lose theirs. Text buttons for text friends with the update.
  Done when: tests cover each KD-10 branch, including an answer sent from an old link after a time change (`STALE_TIME`).

- [ ] **T17 Find a place** [laptop]
  Search box + quick chips; results as in DESIGN.md; Select, Directions, Call, Website; the chosen place card with Remove and Change place. Provider per Q6 behind `integrations/places` (fake for tests); store only what Q6 allows.
  Done when: a searched place goes onto a playdate and shows on the invite page; nothing the provider forbids is stored.

- [ ] **T18 Ask Kindred, Explore, favourites** [phone]
  Ask tab and "or ask Kindred": the parent's words → up to 4 places from the provider, each with a one-line reason (AI), Plan a playdate here. Explore: Your favourites, Popular with parents (most-favourited, counts only), search. The heart on every place card; favourites as chips under Where.
  Done when: Ask works with `AI_MODE=fake` (keyword fallback) and live; a heart shows up in Explore and in Plan.

- [ ] **T19 Groups** [phone]
  Groups tab: Create a group ("only you can see it"), group page (initials, last playdate, friends with Remove, Edit), Plan a playdate · N families (pre-selected), Plan again: same place, next week, Delete group under ⋯ with confirmation.
  Done when: planning from a group pre-selects its members; removing a member keeps them as a friend.

### Phase 3 · Private beta
- [ ] **T20 Add to Home Screen and Web Push** [laptop] (Q11). Service worker, install prompt after the first playdate, VAPID keys, push on invite, confirmation, update and cancellation only. Done when: a push arrives on an iPhone with Kindred on the Home Screen and opens the right page.
- [ ] **T21 Cancel playdate** [phone] (Q1, KD-15). Done when: cancelling asks first, invites show Cancelled, links say so, text friends get a Text button.
- [ ] **T22 Add to calendar** [phone]. `.ics` on the invite page and the playdate page, only after confirmation. Done when: the event has the final time, place and message, and opens in iPhone and Google calendars.
- [ ] **T23 Clean-up in the cron tick** [phone]. Playdates over for 30 days lose their invite token hashes and notes. Done when: tested and idempotent.
- [ ] **T24 Privacy page, consent, delete my account** [phone] (Q13). Found in T03: today an invited parent with Kindred cannot delete their account while they hold an app invite (`invites.invitee_user_id` is `on delete set null`, which the app-invite check refuses; `supabase/tests/account-deletion.test.ts` pins this). Decide what their invites become, then fix it in a new migration. Done when: the page is linked from Setup and the invite page; deleting an account removes the profile, children, friends, groups, saved places and their playdates.
- [ ] **T25 Production** [laptop]. Production Supabase and Railway environments, the domain (Q16), a real SMS provider for codes (Q10), error alerts and an uptime check. Done when: a parent outside the family signs up on production.

### The owner's list (not tasks for Claude)
- **Test the prototype** with 5–8 parents, including two group playdates and two friends without the app (doc, next step 2). Ask iPhone parents whether typing a friend's number is OK (Q15).
- **Supabase:** a staging project (later production); URL, anon key and service-role key into Railway and `.env.local`.
- **Railway:** a project with one service from this repo, a cron service for `/api/cron/tick`, PR environments.
- **SMS provider for sign-in codes** (Q10), when moving past test numbers.
- **Anthropic API key** for message suggestions and Ask Kindred (T08, T18). Both work without it, with plainer results.
- **Places provider key** (Q6), for T17.
- **The domain** for invite links (Q16).
- **Answers** in `docs/QUESTIONS.md`: Q3, Q10, Q12, Q15, Q16 before Phase 1.

## Later
(Ideas that come up during a task go here instead of being built.)
- A native shell (Capacitor or Expo) around the web app, only if parents need the iPhone contact picker or richer notifications (Q15).

## Done
(Move each task here when it is ticked, with its note.)
- **T01 Scaffold the app** (2026-11-14). Notes: versions copied from Aquatix @ 4a87d68 (TypeScript 6.0.3, ESLint 9, Tailwind 4.3.3, React 19.3.0, …) except: `next` 16.4.6 + `eslint-config-next` 16.4.6 and `zod` 4.6.7, because Aquatix's next 16.3.8 has critical RCE advisories (GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr) and zod 4.6.5 a high one (GHSA-mrhx-c7xc-m3w5); `vitest` 5.1.0, because 5.0.3 crashes npm's peer resolution alongside `@playwright/test`. Packages Aquatix doesn't use are the current stable release. `src/platform/security-headers.ts` (+ tests) copied from Aquatix and wired into `next.config.ts`, with Aquatix's `agentRules: false`. `src/env.ts` validates only `NODE_ENV` for now and loads at boot from `src/instrumentation.ts`. The manifest icon is a placeholder SVG (PNG icons come with T20). Playwright is installed with one smoke spec (`tests/smoke`), not in CI yet (T11). `npm audit`: one moderate minimatch advisory inside `eslint-config-next`'s dev-only lint toolchain.
- **T02 Rules** (2026-11-14). Notes: two codes added to DESIGN.md: `MESSAGE_TOO_LONG` (KD-05, over 1000) and `INVALID_ANSWER` (KD-07: answers the schema would refuse). Rules return data only; `planEdit` and the derivations (`playdateTitle`, `groupPicks`, `homeSection`…) return plain values, the checks return a `Decision`. Where the doc is silent the case file marks the reading used *(reading)*: an unconfirmed availability playdate takes answers until its link expires; "changed to Can't make it" (KD-13) = a no after `confirmed_at`; KD-12 compares with the Most picked range. `playdateTitle` takes one child name per family: what to do for a friend saved without a child's name is left to T08. Copy for the error codes is not in `en-CA.ts` yet (the screens that show them add it). Built on the T01 branch while PR #1 was open.
- **T03 Database: migration and tests** (2026-11-14). Notes: local ports 54520–54529 (Lash + 200; Aquatix is + 100). `0001_init.sql` = `docs/schema.sql` + the Realtime publication; both draft files now say they are superseded. The 46 checks run as Vitest + `pg` tests (Aquatix's pattern, `KD_DB_TESTS`/`KD_DB_URL`, Supabase's real roles and `request.jwt.claims`), one test per label; `schema-labels.test.ts` keeps them in step with `docs/schema.test.sql` and runs in `npm test`. Added `privileges.test.ts` (RLS on every table, no client write or hidden-column privilege on any table, Realtime tables), so a future migration that forgets to revoke Supabase's default grants fails. Found: deleting an invited parent's account fails while they hold an app invite; pinned by `account-deletion.test.ts` and noted under T24. `supabase` CLI 2.119.0 and `pg` 8.23.1 pinned as in Aquatix (dev dependencies for now). `src/lib/db/types.ts` is committed unformatted, as the generator writes it, so the CI drift check compares like with like.
- **T06 Layout, components and Home** (2026-11-14). Notes: components in `src/components` (Card, Button/ButtonLink, Chip, StatusLine/FriendStatusLine, NumberedStep, TwoPartSwitch, Toast, BottomTabs + AppTabs); Home in `src/components/home` (`HomeView` takes the parent, the playdates, `now` and a zone as props; sections come from `rules/home.ts` through `groupForHome`). The real `/` renders the empty Home (banner + Plan a playdate card): there is no profile until T05 and no playdates until T08, so `src/app/(app)/page.tsx` passes none; fake playdates live in `src/components/home/fixtures.ts` for tests. Component tests render to static markup with `react-dom/server`, so no new dependency (no jsdom or Testing Library); interaction tests can add one when a screen needs them. Added to `en-CA.ts`: tab names, banner and section words, KD-07 reason chips, KD-08 status words and the date/time formatters (times as "9:00 AM", ranges "9:00 AM to 12:00 PM", as the doc writes them). Where the doc is silent: greeting = morning until 11:59, afternoon until 16:59, evening after, in the zone passed in; the banner names the first child only (Q4 default); Needs you shows the same "N of M families answered" line as Waiting (no extra wording invented). Known gaps: dates show in the playdate's zone, not yet the viewer's (KD-16); the Plan card links to `/plan` (T08) and playdates to `/playdates/[id]` (T10), which 404 until then; the (app) layout has no sign-in check until T05.
- **T05 Sign in and Setup** (2026-11-14). Notes: built and checked against the LOCAL Supabase (`supabase/config.toml` has test phone numbers 416 555 0101–0103 with code 123456 and dummy Twilio values, nothing is sent); no T04 account was needed. Sign-in is one server action with two steps (`src/app/(auth)/sign-in`): phone in, code in; sessions are httpOnly cookies through `@supabase/ssr`, renewed by `src/proxy.ts`, and the guards (`src/lib/auth/require-parent.ts`) send a signed-out visitor to sign-in and a new parent to Setup. Limits copied from Aquatix (`rate-limit.ts`, `login-code-limit.ts`, code input rules): 60 s between codes and 5 per hour per phone (kept in this process's memory, so a restart forgets them), 20 codes per address per hour, 8 code tries per phone per 15 minutes. Setup writes through migration 0002 (`create_profile_with_children`, service role only, all or nothing, once per parent) with `phone_hash` = HMAC of the signed-in user's own number, computed on the server; a forged `parent_id`/`id`/`phone` in the form is ignored (tests at the action, the service and the database). Where the doc is silent: at least one child is required (so "Plan playdates for Mia." always has a name), up to 8; the age picker offers Baby and 1 to 12 yrs; "Welcome, Alex" shows when Home is opened as `/?welcome=1` right after Setup. `src/env.ts` now requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `PHONE_HASH_KEY`; CI builds with placeholder values. New dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `server-only`. Not in T05: sign out (nothing to click yet), the Home playdates (T08), and the live Twilio provider (Q10).
