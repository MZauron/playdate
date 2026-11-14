# NEXT — task list

One task per Claude Code session. Tick it when its "done when" is met; add a one-line note if you deviated or decided something.
Read CLAUDE.md + only the docs a task names.
**[phone]** = safe for a background cloud session: no secrets, no Docker, no device; tests use fakes.
**[laptop]** = needs a device or simulator, consoles, keys or local Supabase.
**[desk]** = done in the Claude desktop app on the laptop, with the browser pane and a phone in hand.
Estimates are session time (1–2 h each).

## Where we are (2026-11-14)
- **Built:** nothing yet. This repo holds the starter kit: `CLAUDE.md`, `docs/DESIGN.md` (from the Kindred design doc), `docs/schema.sql` + `docs/schema.test.sql` (42 checks passing on Postgres 16), `docs/QUESTIONS.md`.
- **Next:** T01, then T02 and T03 (both [phone], they can run in parallel after T01).
- **Alongside the code:** test the clickable prototype with 5–8 parents (the doc's next step 2). Note what they stumble on in `docs/QUESTIONS.md`.

## Plan
- **Phase 0 · Foundation (T01–T04):** repo, CI, rules core, database, accounts.
- **Phase 1 · The core loop with text friends (T05–T11):** sign in, setup, Home, plan with Pick date and time, text invites, the web invite page, live answers, confirm. Gate: three real parents without the app answer a real invite and the organizer confirms.
- **Phase 2 · The full design (T12–T19):** Share availability, app-to-app invites, edit and updates, places, groups.
- **Phase 3 · Private beta (T20–T25):** push, cancel, calendar, privacy, TestFlight, one class group.

## Open tasks

### Phase 0 · Foundation
- [ ] **T01 Scaffold the monorepo** [phone]
  npm workspaces: `apps/mobile` (Expo, Expo Router, TypeScript strict, Zustand; the current Expo SDK), `apps/web` (Next.js App Router, TypeScript strict), `packages/core` (pure TS + Vitest), `packages/ui-copy` (strings).
  `.nvmrc` 22, exact versions (no `^`), ESLint + Prettier, `apps/web/src/env.ts` (zod, fails fast; only the vars this task needs), `GET /api/health`, `.env.example`, README with the commands.
  CI (GitHub Actions): install, lint, typecheck, test, `next build`, and `npx expo-doctor` for the app.
  Done when: `npm run lint && npm run typecheck && npm test` pass locally and in CI; `npm run dev:web` serves `/api/health`; `npm run dev:mobile` opens one placeholder screen in Expo Go.

- [ ] **T02 Rules core** [phone]
  `packages/core`: `types.ts` (`Decision = {ok, errors: {code, field?}[]}`, the codes in DESIGN.md), `time.ts` (zone passed in, clock injected), `config.ts` (slot times, link grace 12 h, min pick 30 min, reason chips), and one module per rule group: `plan.ts` (KD-02, 03, 04, 05, 06), `answers.ts` (KD-07, 08), `confirm.ts` (KD-09), `edit.ts` (KD-10: returns what to change, never writes), `picks.ts` (KD-11, 12), `home.ts` (KD-13), `links.ts` (KD-14 expiry; token generation lives in `apps/web`).
  Create `docs/rules.test-cases.md`: cases with ids (`KD-03a`…), each with input and expected result. Test names reuse the ids.
  Done when: every case in the file has a test named by its id (a test enforces it), and a test fails if anything in `packages/core` reads the clock or does I/O.

- [ ] **T03 Database: migration and tests** [phone]
  `supabase init`; `supabase/migrations/0001_init.sql` = `docs/schema.sql` plus `alter publication supabase_realtime add table answers, invites, playdates;`.
  Turn `docs/schema.test.sql` into `supabase/tests` (pgTAP, or Vitest with the `pg` client) using real Supabase roles and `request.jwt.claims` instead of the stand-ins.
  CI: a `db` job that runs `supabase start` and the tests; a `types` job that generates `packages/db/types.ts` and fails when it drifts from the migrations.
  Done when: the CI `db` job passes every check from `docs/schema.test.sql`; `docs/schema.sql` gets a header line saying the migration is now the source of truth.

- [ ] **T04 Accounts: Supabase, Railway, keys** [laptop] (mostly the owner's list below)
  Staging Supabase project; phone sign-in turned on with **test phone numbers and fixed codes** for development (no SMS provider needed until Q10); migration pushed.
  Railway service for `apps/web` (root `apps/web`, Node 22), env vars from `.env.example`, `PHONE_HASH_KEY` (32 random bytes), staging URL as `PUBLIC_LINK_BASE` (Q16).
  Done when: staging `/api/health` reports the database reachable, and a script signs in with a test number and reads its own (empty) profile.

### Phase 1 · The core loop with text friends
- [ ] **T05 Sign in and Setup** [laptop]
  Phone number (+1 formatting, Q10) → code → session kept in `expo-secure-store`. Setup exactly as DESIGN.md "Screens"; writes `profiles` and `children` directly (RLS). The API sets `profiles.phone_hash` from the signed-in user's phone (`POST /api/me/phone-hash`), never from a client-sent number.
  Done when: a new user goes sign in → Setup → Home; a returning user lands on Home; empty first name or child name shows the short message; component tests cover Setup.

- [ ] **T06 Design system and Home** [laptop]
  `apps/mobile/src/ui`: colours, type, Card, Button (main/secondary/destructive), Chip, StatusLine, NumberedStep, TwoPartSwitch, Toast, as in DESIGN.md "Visual design". Tabs Home, Groups, Ask, Explore (the last three are placeholders). Home: banner (greeting by time of day, "Welcome, Alex" the first time), Plan a playdate card, and the three sections from `core/home.ts`, hidden when empty.
  Done when: Home renders with no playdates (banner + Plan card only) and with fixture playdates in each section; 44 px touch targets; screenshots of both states in the PR.

- [ ] **T07 Friends from contacts** [laptop]
  `expo-contacts` with a clear permission message; the picker shows Your friends first, then From your contacts ("Lily's mom · 416-555-0111"), with has Kindred / gets a text tags. `POST /api/friends`: zod, E.164 with `libphonenumber-js`, HMAC with `PHONE_HASH_KEY`, match to `profiles.phone_hash`, insert with the service role for the signed-in owner only, rate limit per user. Only the picked numbers leave the phone.
  Done when: API tests cover normalizing, hashing, matching, a duplicate pick, the rate limit, and that another user's id in the body is ignored; the picker works on a device with real contacts.

- [ ] **T08 Plan a playdate: set time, typed place, send** [laptop]
  The planning screen with steps 1 Who's invited, 2 When (Pick date and time only; the switch shows Share availability as coming soon), Details (place name + address, ☆ Save this place, saved-place suggestions, Your name, Message with ✨ Suggestions and ↻ New ideas), Send. "Leave this playdate?" on Back.
  API: `POST /api/playdates` (core `plan.ts` decides; creates the playdate, invites, 22-char tokens, `links_expire_at`; returns the links for text friends), `POST /api/suggestions/messages` (Anthropic, 3 messages from the plan; without `ANTHROPIC_API_KEY` it returns 3 built-in templates). After creating, the app opens `expo-sms` with the text friends, the parent's message and each link (Q3: one composer per friend, since every link is different).
  Done when: API tests cover each KD-02…06 refusal and that tokens are stored only as hashes; a playdate created on a device shows under Waiting for answers, and the composer opens with the right message and link.

- [ ] **T09 Web invite page: Pick date and time** [phone]
  `apps/web` `/r/[token]`: look up by sha256(token); the page as in DESIGN.md "Screens" (organizer name, message bubble, details card with Directions); We're in! / Can't make it with reason chips and note; Thanks + Change my answer; This playdate is over (KD-14); `noindex`, security headers, rate limit per token and IP. Answers go through `POST /api/invites/answer` (core `answers.ts`, KD-07, `STALE_TIME`).
  Done when: tests cover a valid answer, a change of answer, an expired link, a stale time version, a cancelled playdate, and that the payload never holds phone numbers or another playdate; the page works at 375 px with no account.

- [ ] **T10 Organizer's playdate page, live answers, confirm** [laptop]
  Same layout as Plan: Who's invited with "2 of 3 answered · Live" and status lines (KD-08); When with "2 families can come: Dev, Maya" and Confirm and send update (KD-09); Where; Details. Realtime on `answers`, `invites`, `playdates` for this playdate. `POST /api/playdates/:id/confirm`. After confirming: ✓ Update sent card, and the composer opens for text friends with the final date, time and place (Q3). The web page shows the "It's on! 🎉" bubble and the CONFIRMED band.
  Done when: an answer given on the web page appears on the organizer's phone without a refresh; confirm is refused with no yes (`CONFIRM_NEEDS_YES`); the confirmed state shows on both sides.

- [ ] **T11 Phase 1 run-through** [desk]
  The full loop on staging with the organizer on a phone and two friends answering on the web (one yes, one no). Fix what breaks (small fixes only; anything bigger becomes a task).
  Done when: the loop works end to end twice in a row, and the result is written under "Where we are".

### Phase 2 · The full design
- [ ] **T12 Share availability: the organizer's grid** [laptop]
  The When step's second option: week grid (Morning/Afternoon/Evening, arrows between weeks), Done → "5 times you're free" summary; switching clears the other option (KD-02). The API stores `availability_slots`; `links_expire_at` from the last slot.
  Done when: core and API tests for KD-02/KD-04; an availability playdate sends like a set-time one.

- [ ] **T13 Answering availability (web, then app)** [phone]
  Under "Alex's availability": Free boxes; tap one (orange tick), from/until in 30-minute steps; Send …; Can't make it; Already suggested at the top; after answering, Everyone's picks with Your pick and Switch to this (KD-11, first names only, KD-17).
  Done when: tests cover a pick outside a slot, a pick off the half hour, Switch to this, and that Everyone's picks shows first names only.

- [ ] **T14 Organizer: suggested times, Most picked, confirm** [laptop]
  Your availability (sent), Times friends suggested with who picked each, Most picked on top; tap + Confirm and send update. Needs you on Home (KD-13). The majority notice (KD-12) as decided in Q2.
  Done when: confirming an availability playdate sets the final range everywhere; the majority notice appears once per text friend and never again.

- [ ] **T15 Invites inside the app** [laptop]
  An app friend's Home shows "Alex invited Arjun" with the message, time and place; it opens the same invite page as the web, in the app; answers use the same API. Payload shared with the web page (one builder in `apps/web`).
  Done when: an app friend answers and the organizer sees it live; the app friend never sees other invites or friends (RLS tests already cover the reads).

- [ ] **T16 Edit playdate and updates** [laptop]
  Edit playdate opens the planning screen titled Edit playdate, filled in; Send update. `PATCH /api/playdates/:id` uses core `edit.ts` (KD-10): a new time clears answers and shows New time; other changes keep it confirmed and show Updated; added friends get invites, removed friends lose theirs. Composer for text friends with the update.
  Done when: tests cover each KD-10 branch, including an answer sent from an old link after a time change (`STALE_TIME`).

- [ ] **T17 Find a place** [laptop]
  Search box + quick chips; results as in DESIGN.md; Select, Directions, Call, Website; the chosen place card with Remove and Change place. Provider per Q6, through `GET /api/places/search` and `GET /api/places/:id` (keys server-side; store only what Q6 allows).
  Done when: a searched place goes onto a playdate and shows on the invite page; nothing the provider forbids is stored.

- [ ] **T18 Ask Kindred, Explore, favourites** [laptop]
  Ask tab and "or ask Kindred": `POST /api/places/ask` (Anthropic; the parent's words → up to 4 places from the provider, each with a one-line reason; Plan a playdate here). Explore: Your favourites, Popular with parents (most-favourited, counts only), search. The heart on every place card; favourites as chips under Where.
  Done when: Ask works with and without an AI key (keyword fallback); a heart shows up in Explore and in Plan.

- [ ] **T19 Groups** [laptop]
  Groups tab: Create a group ("only you can see it"), group page (initials, last playdate, friends with Remove, Edit), Plan a playdate · N families (pre-selected), Plan again: same place, next week, Delete group under ⋯ with confirmation.
  Done when: planning from a group pre-selects its members; removing a member keeps them as a friend.

### Phase 3 · Private beta
- [ ] **T20 Push notifications** [laptop] (Q11). Expo push tokens per device; push on invite, confirmation, update, cancellation; never on other parents' answers. Done when: each push arrives on a real device and opens the right screen.
- [ ] **T21 Cancel playdate** [laptop] (Q1, KD-15). Done when: cancelling asks first, invites show Cancelled, links say so, text friends get the composer text.
- [ ] **T22 Add to calendar** [phone for web, laptop for app]. `.ics` download on the web page; `expo-calendar` in the app; only after confirmation. Done when: the event has the final time, place and message.
- [ ] **T23 Clean-up job** [phone]. Nightly job (pg_cron or Railway cron): playdates over for 30 days lose their invite token hashes and notes. Done when: tested and idempotent.
- [ ] **T24 Privacy page, consent, delete my account** [laptop] (Q13). Done when: the page is linked from Setup and the web invite page; deleting an account removes the profile, children, friends, groups, saved places and their playdates.
- [ ] **T25 TestFlight** [laptop]. EAS build profiles, app icon, splash, bundle id, the beta checklist. Done when: a build installs from TestFlight on two phones.

### The owner's list (not tasks for Claude)
- **Test the prototype** with 5–8 parents, including two group playdates and two friends without the app (doc, next step 2).
- **Supabase:** a staging project (later production); the URL, anon key and service-role key into Railway and `.env.local` (never into the app except the anon key).
- **SMS provider for sign-in codes** (Q10), when moving past test numbers.
- **Railway:** a project with one service for `apps/web`.
- **Anthropic API key** for message suggestions and Ask Kindred (T08, T18). Both work without it, with plainer results.
- **Places provider key** (Q6), for T17.
- **Apple Developer account** ($99 a year), for TestFlight (T25).
- **The domain** for invite links (Q16).
- **Answers** in `docs/QUESTIONS.md`: Q3, Q10, Q12, Q15, Q16 before Phase 1.

## Later
(Ideas that come up during a task go here instead of being built.)

## Done
(Move each task here when it is ticked, with its note.)
