# QUESTIONS — decisions still open

Each question has an id, the default we build with until it is answered, and what it affects.
When one is answered: write the answer under it with the date and who decided, update DESIGN.md (and the rule or setting), and tick it.
Q1, Q4, Q5, Q7, Q8, Q9 and Q14 come from the design doc's own "Open questions"; the others came up while turning the doc into a build plan.

## Needed before Phase 1
- [ ] **Q3 Every text needs the organizer to tap Send, once per friend.** Texts come from the organizer's own number (doc), so Kindred can only open Messages with the text filled in (an `sms:` link); it cannot send by itself. Each friend has their own link, so it is one tap per friend. That also applies to the confirmation and update texts. Is that OK? Default: yes; after Send invite, Confirm and send update, and Send update, a list shows **Text Aisha**, **Text Dev**…, each ticking when tapped.
- [ ] **Q10 Who sends the sign-in code, and to which countries?** Supabase phone sign-in needs an SMS provider (Twilio Verify, MessageBird or Vonage), paid per code. Default: Twilio Verify through Supabase, Canadian and US numbers (+1) only at launch.
- [ ] **Q12 Friends' phone numbers on the server.** The doc says numbers are stored "in a protected form". Kindred needs a friend's number for every later text (confirmation, update), from any phone the parent signs in on. Default: kept in the owner's private `friends` rows (RLS, never shown to anyone else, never logged), plus a keyed hash for matching; encryption at rest added before the beta (Phase 3).
- [ ] **Q15 Adding friends without a contact picker.** Kindred is a web app (owner's decision, 2026-11-14). iPhone browsers cannot open the contacts list, so on iPhone a parent types a friend's name, child's name and number (or pastes the number); Android Chrome gets "Choose from contacts". Is typing acceptable for the first version? Default: yes; friends added once are reused, and groups make repeat playdates one tap. If test parents find it too slow, wrap the web app in a native shell later (Capacitor or Expo) just for the contact picker.
- [ ] **Q16 Name and domain.** The doc's links use `kindred.app`. Is it bought, and has the name been checked for clashes? Default: build with the Railway domain; the link domain is one setting (`PUBLIC_LINK_BASE`).

- [ ] **Q17 What a friend is called in your list.** The doc shows "Arjun's dad", but nobody tells Kindred whether the parent is a dad, a mom or someone else, and guessing from a name would be wrong. Default (T07): the label is "Arjun's parent" (from the child's first name), the parent can rename it, and the child's first name is required when adding a friend (the playdate title, KD-06, is built from it). Is that right, or should Add a friend also ask "Mom / Dad / Other"?

## Needed before Phase 2
- [ ] **Q2 Who sends the "most families picked" text (KD-12)?** It is triggered by other parents' answers, not by the organizer, so it cannot come from the organizer's phone by itself. Default: it shows on the organizer's Home under Needs you ("Text Aisha: most families picked Mon 9–12") with a Text button; still once per invite.
- [ ] **Q4 Families with more than one child** (doc). Choose which child a playdate is for, and let friends tick which of their kids are coming? Default: not in v1; the title uses each family's first child; Setup still stores all children.
- [ ] **Q6 Where place search comes from.** The earlier kit used Google Places. Its terms allow keeping only the place id, so names and addresses are fetched each time they are shown (cost per view). Alternatives: Foursquare or Overture open data (can be stored), or the kids'-activity places already collected for KidSpark. Default: Google Places (New), place id only, details through the API with a short cache.
- [ ] **Q8 Are the time slots right?** (doc) Morning 9–12, Afternoon 1–4, Evening 4–7; 12–1 is not covered. Default: as designed; the slot times are one setting in `src/lib/rules/config.ts`, so changing them later is a one-line change.

## Needed before the beta (Phase 3)
- [ ] **Q1 Cancelling** (doc). Should cancelling ask to confirm and tell everyone (in the app and by text)? Today the prototype just removes the playdate. Default: yes (KD-15): a confirmation, invites show "Cancelled", Kindred users get a push if they have it, text friends get a short text through a Text button.
- [ ] **Q11 Notifications for parents who use Kindred.** The doc says app users get in-app updates. A web app can push only when added to the Home Screen (iPhone: iOS 16.4+). Default: Web Push for a new invite, confirmation, update and cancellation (never for other parents' answers) when the parent has turned it on; for a Kindred friend without push, the organizer gets a Text button for them too, so nobody misses an invite.
- [ ] **Q13 Privacy text and children's data.** Kindred stores children's first names and ages. Default: a plain privacy page and a consent line at Setup before the beta, reviewed against PIPEDA (Canada). Who reviews it?

## Product ideas from the doc (not blocking)
- [ ] **Q5 Answer-by deadline for groups** ("Please answer by Thursday") with one reminder? Default: not in v1.
- [ ] **Q7 Should Ask and Explore become one tab?** Both help parents find places. Default: two tabs, as designed.
- [ ] **Q9 Should Home show the Friends row again** (faces of contacts already on Kindred)? It was removed to keep Home calm. Default: no.
- [ ] **Q14 A place to manage saved places and favourites** (rename, delete)? Default: later; the heart and the ✓ toggle are enough for v1.
