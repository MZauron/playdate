# NEXT — task list

One task per Claude Code session. Tick it when its "done when" is met; add a one-line note if you deviated or decided something.
Read CLAUDE.md + only the docs a task names.
**[phone]** = safe for a background cloud session: no secrets, no Docker, tests use fakes.
**[laptop]** = needs consoles, keys or local Supabase.
**[desk]** = done in the Claude desktop app on the laptop: the local app, the browser pane, a phone in hand.
Estimates are session time (1–2 h each).

## Where we are (2026-11-14)
- **Built:** nothing yet. This repo holds the starter kit: `CLAUDE.md`, `docs/DESIGN.md` (from the Kindred design doc, on the owner's Next.js + Supabase stack), `docs/schema.sql` + `docs/schema.test.sql` (46 checks passing on Postgres 16), `docs/QUESTIONS.md`.
- **Next:** T01, then T02 and T03 (both [phone], they can run in parallel after T01).
- **Alongside the code:** test the clickable prototype with 5–8 parents (the doc's next step 2). Note what they stumble on in `docs/QUESTIONS.md`.

## Plan
- **Phase 0 · Foundation (T01–T04):** app scaffold, CI, rules, database, accounts.
- **Phase 1 · The core loop with text friends (T05–T11):** sign in, setup, Home, plan with Pick date and time, Text buttons, the invite page, live answers, confirm. Gate: three real parents without Kindred answer a real invite and the organizer confirms.
- **Phase 2 · The full design (T12–T19):** Share availability, invites between Kindred users, edit and updates, places, groups.
- **Phase 3 · Private beta (T20–T25):** Home Screen install and Web Push, cancel, calendar, privacy, production, one class group.

## Open tasks

### Phase 0 · Foundation
- [ ] **T01 Scaffold the app** [phone]
  Next.js App Router, TypeScript strict, Tailwind, zod, date-fns + @date-fns/tz, libphonenumber-js, Vitest, ESLint, Playwright; exact versions (copy from `../aquatix/package.json` if attached, else current stable).
  `.nvmrc` 22, `src/env.ts` (zod, fails fast; only the vars this task needs), `GET /api/health`, `.env.example`, README with the commands, `src/lib/i18n/en-CA.ts` (empty to start), Tailwind theme with the colours and radii of DESIGN.md "Visual design", a web manifest (name, teal theme colour, icons placeholder).
  CI (GitHub Actions): install, lint, typecheck, test, build. Copy `security-headers.ts` (+ tests) from `../aquatix` if attached and wire it into `next.config.ts`.
  Done when: `npm run lint && npm run typecheck && npm test && npm run build` pass locally and in CI; `/api/health` answers; the home route renders a placeholder at 375 px.

- [ ] **T02 Rules** [phone]
  `src/lib/rules`: `types.ts` (`Decision = {ok, errors: {code, field?}[]}`, the codes in DESIGN.md), `time.ts` (zone passed in, clock injected), `config.ts` (slot times, link grace 12 h, min pick 30 min, reason chips), and one module per rule group: `plan.ts` (KD-02, 03, 04, 05, 06), `answers.ts` (KD-07, 08), `confirm.ts` (KD-09), `edit.ts` (KD-10: returns what to change, never writes), `picks.ts` (KD-11, 12), `home.ts` (KD-13), `links.ts` (KD-14 expiry; token generation lives in `src/lib/domain`).
  Create `docs/rules.test-cases.md`: cases with ids (`KD-03a`…), each with input and expected result. Test names reuse the ids.
  Done when: every case in the file has a test named by its id (a test enforces it, both ways), and `no-clock.test.ts` fails if anything in `src/lib/rules` reads the clock or imports I/O.

- [ ] **T03 Database: migration and tests** [phone]
  `supabase init` (ports chosen so they don't clash with Lash's or Aquatix's local Supabase); `supabase/migrations/0001_init.sql` = `docs/schema.sql` plus `alter publication supabase_realtime add table answers, invites, playdates;`.
  Turn `docs/schema.test.sql` into `supabase/tests` (as Aquatix does, Vitest with `pg`, or pgTAP) using real Supabase roles and `request.jwt.claims` instead of the stand-ins.
  CI: a `db` job that runs `supabase start` and the tests; a `types` job that generates `src/lib/db/types.ts` and fails when it drifts from the migrations.
  Done when: the CI `db` job passes every check from `docs/schema.test.sql`; `docs/schema.sql` gets a header line saying the migration is now the source of truth.

- [ ] **T04 Accounts: Supabase and Railway** [laptop] (mostly the owner's list below)
  Staging Supabase project; phone sign-in turned on with **test phone numbers and fixed codes** (no SMS provider until Q10); migration pushed.
  Railway service from this repo (Node 22), env vars from `.env.example`, `PHONE_HASH_KEY` (32 random bytes), `CRON_SECRET`, `SITE_PASSWORD` on staging, staging URL as `PUBLIC_LINK_BASE` (Q16). PR environments on.
  Done when: staging `/api/health` reports the database reachable, and a test number can sign in on staging.

### Phase 1 · The core loop with text friends
- [ ] **T05 Sign in and Setup** [laptop]
  Phone number (+1 formatting, Q10) → code (Supabase phone sign-in, session in httpOnly cookies via `@supabase/ssr`; copy the code-step rules and per-phone limits from Aquatix if attached). Setup exactly as DESIGN.md "Screens"; a server action writes `profiles` (with `phone_hash` computed on the server from the signed-in user's phone) and `children`.
  Done when: a new user goes sign in → Setup → Home; a returning user lands on Home; empty first name or child name shows the short message; tests cover the Setup action (including a forged `parent_id` being ignored).

- [ ] **T06 Layout, components and Home** [phone]
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
- [ ] **T24 Privacy page, consent, delete my account** [phone] (Q13). Done when: the page is linked from Setup and the invite page; deleting an account removes the profile, children, friends, groups, saved places and their playdates.
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
