# QUESTIONS — decisions still open

Each question has an id, the default we build with until it is answered, and what it affects.
When one is answered: write the answer under it with the date and who decided, update DESIGN.md (and the rule or setting), and tick it.
Q1, Q4, Q5, Q7, Q8, Q9 and Q14 come from the design doc's own "Open questions"; the others came up while turning the doc into a build plan.

## Needed before Phase 1
- [ ] **Q3 Every text needs the organizer to tap Send.** Texts come from the organizer's own number (doc), so the app can only open the Messages composer; it cannot send by itself. That also applies to the confirmation and update texts. Is that OK? Default: yes; after Send invite, Confirm and send update, and Send update, the composer opens for the text friends and a line says "Tap Send in Messages to tell Aisha".
- [ ] **Q10 Who sends the sign-in code, and to which countries?** Supabase phone sign-in needs an SMS provider (Twilio Verify, MessageBird or Vonage), paid per code. Default: Twilio Verify through Supabase, Canadian and US numbers (+1) only at launch.
- [ ] **Q12 Friends' phone numbers on the server.** The doc says numbers are stored "in a protected form". The app needs a friend's number to open the composer again later (on a new phone too). Default: kept in the owner's private `friends` rows (RLS, never shown to anyone else, never logged), plus a keyed hash for matching; encryption at rest added before the beta (Phase 3).
- [ ] **Q15 iPhone only at first?** Default: iOS first (Expo Go, then TestFlight); Android after the beta. The web invite page works on any phone from day one.
- [ ] **Q16 Name and domain.** The doc's links use `kindred.app`. Is it bought, and has the name been checked for clashes in the App Store? Default: build with the Railway domain; the link domain is one setting (`PUBLIC_LINK_BASE`).

## Needed before Phase 2
- [ ] **Q2 Who sends the "most families picked" text (KD-12)?** It is triggered by other parents' answers, not by the organizer, so it cannot come from the organizer's phone by itself. Default: it shows on the organizer's Home under Needs you ("Text Aisha: most families picked Mon 9–12") with a button that opens the composer; still once per invite.
- [ ] **Q4 Families with more than one child** (doc). Choose which child a playdate is for, and let friends tick which of their kids are coming? Default: not in v1; the title uses each family's first child; Setup still stores all children.
- [ ] **Q6 Where place search comes from.** The earlier kit used Google Places. Its terms allow keeping only the place id, so names and addresses are fetched each time they are shown (cost per view). Alternatives: Foursquare or Overture open data (can be stored), or the kids'-activity places already collected for KidSpark. Default: Google Places (New), place id only, details through the API with a short cache.
- [ ] **Q8 Are the time slots right?** (doc) Morning 9–12, Afternoon 1–4, Evening 4–7; 12–1 is not covered. Default: as designed; the slot times are one setting in `packages/core`, so changing them later is a one-line change.

## Needed before the beta (Phase 3)
- [ ] **Q1 Cancelling** (doc). Should cancelling ask to confirm and tell everyone (in the app and by text)? Today the prototype just removes the playdate. Default: yes (KD-15): a confirmation, invites show "Cancelled", app friends get a push, text friends get a short text through the composer.
- [ ] **Q11 Push notifications for friends with the app.** The doc says app users get in-app updates. Default: push (Expo) for a new invite, confirmation, update and cancellation only; never for other parents' answers.
- [ ] **Q13 Privacy text and children's data.** Kindred stores children's first names and ages. Default: a plain privacy page and a consent line at Setup before the beta, reviewed against PIPEDA (Canada). Who reviews it?

## Product ideas from the doc (not blocking)
- [ ] **Q5 Answer-by deadline for groups** ("Please answer by Thursday") with one reminder? Default: not in v1.
- [ ] **Q7 Should Ask and Explore become one tab?** Both help parents find places. Default: two tabs, as designed.
- [ ] **Q9 Should Home show the Friends row again** (faces of contacts already on Kindred)? It was removed to keep Home calm. Default: no.
- [ ] **Q14 A place to manage saved places and favourites** (rename, delete)? Default: later; the heart and the ✓ toggle are enough for v1.
