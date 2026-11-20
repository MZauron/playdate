// Every user-facing string lives here (Canadian English), with the date and time formatters.
import type { FriendStatus } from "@/lib/rules/answers";
import type { DeclineReason } from "@/lib/rules/types";
import type { FreeKind, FreeWhen } from "@/lib/rules/free";

/** The pieces a built-in message idea is made of (see `suggestionTemplates`). */
export type SuggestionWords = { child: string; kids: string; all: string; when: string; at: string };

export const enCA = {
  app: {
    name: "Kindred",
    description: "Plan a playdate with families you already know.",
    comingSoon: "Coming soon.",
    signOut: "Sign out",
    privacy: "Privacy",
  },
  signIn: {
    title: "Sign in",
    phoneHint: "We'll text you a code. No password needed.",
    phoneLabel: "Your phone number",
    phonePlaceholder: "(416) 555-0101",
    sendCode: "Send code",
    codeTitle: "Enter your code",
    codeSent: (maskedPhone: string) => `We texted a code to ${maskedPhone}.`,
    codeLabel: "6-digit code",
    submitCode: "Sign in",
    resend: "Send a new code",
    resendIn: (seconds: number) => `Send a new code in ${seconds}s`,
    otherNumber: "Use a different number",
    errors: {
      INVALID_PHONE: "That doesn't look like a Canadian or US phone number.",
      INVALID_CODE: "Enter the 6-digit code.",
      CODE_REJECTED: "That code didn't work. Check it, or ask for a new one.",
      RESEND_TOO_SOON: (seconds: number) => `Please wait ${seconds} seconds before asking for another code.`,
      TOO_MANY_CODES: "That's a lot of codes. Please try again in a little while.",
      TOO_MANY_REQUESTS: "Too many tries. Please wait a few minutes and try again.",
      SEND_FAILED: "We couldn't send the code. Please try again.",
    },
  },
  setup: {
    title: "Tell us about you",
    subtitle: "Friends will see this when you invite them.",
    firstNameLabel: "Your first name",
    childNameLabel: "Child's first name",
    childAgeLabel: "Age",
    agePlaceholder: "Select",
    ageBaby: "Baby",
    ageYears: (years: number) => (years === 1 ? "1 yr" : `${years} yrs`),
    addChild: "+ Add another child",
    removeChild: (position: number) => `Remove child ${position}`,
    submit: "Get started",
    errors: {
      NAME_REQUIRED: "Please tell us your first name.",
      CHILD_NAME_REQUIRED: "Please add your child's first name.",
      CHILD_AGE_INVALID: "Please choose your child's age.",
      NEEDS_CHILD: "Add at least one child.",
      TOO_MANY_CHILDREN: "That's more children than we can add here.",
      PHONE_MISSING: "Something went wrong. Please sign in again.",
    },
    consent: "By continuing, you agree that Kindred keeps your children's first names and ages to plan playdates.",
    consentLink: "How Kindred uses your information",
  },
  friends: {
    /** T32 (Q25): the Friends tab, with groups on it. */
    tabTitle: "Friends",
    title: "Your friends",
    empty: "No friends yet. Add someone you'd like to plan with.",
    hasKindred: "has Kindred",
    getsText: "gets a text",
    addTitle: "Add a friend",
    parentNameLabel: "Parent's name",
    childNameLabel: "Child's first name",
    phoneLabel: "Phone number",
    phoneHint: "Only used to check if they're on Kindred. Kindred doesn't keep it.",
    chooseContacts: "Choose from contacts",
    pasteNumber: "Paste a number",
    pasteFailed: "Couldn't read the clipboard. Please type the number.",
    add: "Add friend",
    added: (label: string) => `${label} added.`,
    rename: "Rename",
    renameLabel: "Name for this friend",
    save: "Save",
    cancel: "Cancel",
    remove: "Remove",
    removeAsk: (label: string) => `Remove ${label}?`,
    removeNote: "Their invites and answers go too.",
    keep: "Keep",
    errors: {
      NAME_REQUIRED: "Please add their name.",
      CHILD_NAME_REQUIRED: "Please add their child's first name.",
      INVALID_PHONE: "That doesn't look like a Canadian or US phone number.",
      OWN_NUMBER: "That's your own number.",
      DUPLICATE: (label: string) => `You already have ${label} with that number.`,
      TOO_MANY_ADDS: "That's a lot of friends at once. Please try again in a little while.",
      LABEL_REQUIRED: "Please give them a name of up to 40 characters.",
      NOT_FOUND: "That friend isn't in your list any more.",
    },
    /** T40: a page for each friend. */
    page: {
      openLabel: (label: string) => `Open ${label}`,
      textNote: "Invites go to their phone as a text from you.",
      plan: (firstName: string) => `Plan a playdate with ${firstName}`,
      together: "Playdates together",
      none: "No playdates yet.",
      confirmed: "Confirmed",
      waiting: "Waiting for answers",
      planAgain: "Plan again",
      manage: "In your list",
      /** T42 (Q30): only for a parent with two or more children. */
      friendsWith: "Friends with",
      friendsWithNote: (firstName: string) => `Which of your kids is ${firstName}'s family friends with?`,
      saveFailed: "Couldn't save that. Please try again.",
    },
    /** T42: the Friends tab's switch for a parent with two or more children. */
    kidSwitch: "Whose friends",
    allKids: "All",
    noneForKid: (child: string) => `No friends linked to ${child} yet.`,
  },
  plan: {
    title: "Plan a playdate",
    /** T38: Plan again from Home's Recent playdates. */
    againNote: (day: string) => `Same families and place as ${day}. Check the new time, then send.`,
    /** T43: Plan opened from Home's Or just say it. */
    saidNote: "Filled in from what you said · Check each step, write your message, then send.",
    back: "Back",
    whoTitle: "Who's invited",
    /** T41 (Q30): only for a parent with two or more children. */
    forKidsTitle: "Who's this playdate for?",
    allMyKids: "All my kids",
    /** T42: friends of the children this playdate isn't for, folded away. */
    showAllFriends: (n: number) => `Show all friends (${n} more)`,
    friendsLabel: "Your friends",
    groupsLabel: "Your groups",
    noFriends: "No friends yet. Add a family you'd like to invite.",
    addFriend: "+ Add a friend",
    closeAddFriend: "Close",
    whenTitle: "When",
    modeLabel: "How to choose the time",
    pickTime: "Pick date and time",
    shareAvailability: "Share availability",
    availabilityHint: "Tap the times you're free. Friends will pick one.",
    // T31: the faster picker.
    shortcutsLabel: "Quick picks",
    shortcuts: { weekend_mornings: "Weekend mornings", weekend_afternoons: "Weekend afternoons", weekday_afternoons: "Weekday afternoons" },
    thisWeek: "This week",
    nextWeekTitle: "Next week",
    today: "Today",
    slotNames: { morning: "Morning", afternoon: "Afternoon", evening: "Evening" },
    /** Q8 default hours, written the doc's way: "9–12", "1–4", "4–7". */
    slotHours: (start: number, end: number) => `${start % 12 || 12}–${end % 12 || 12}`,
    slotCell: (day: string, slot: string) => `${day}, ${slot}`,
    freeTimes: (n: number) => (n === 1 ? "1 time you're free" : `${n} times you're free`),
    dateLabel: "Date",
    startLabel: "Start",
    endLabel: "End",
    done: "Done",
    edit: "Edit",
    whereTitle: "Where",
    detailsTitle: "Details",
    placeNameLabel: "Place",
    placeNamePlaceholder: "e.g. Riverdale Park",
    placeAddressLabel: "Address",
    savePlace: "Save this place",
    yourNameLabel: "Your name",
    yourNameHint: "Friends see it with your message.",
    messageLabel: "Message to the parents",
    messagePlaceholder: "Say hello and what you have in mind.",
    suggestions: "✨ Suggestions",
    newIdeas: "↻ New ideas",
    suggestionsHint: "Tap one to put it in the box. You can change it.",
    useSuggestion: (text: string) => `Use: ${text}`,
    sendLine: (app: number, text: number) => {
      const total = app + text;
      const parts = [app ? `${app} in Kindred` : "", text ? `${text} by text` : ""].filter(Boolean);
      return `Goes to ${total} ${total === 1 ? "family" : "families"}: ${parts.join(" and ")}.`;
    },
    send: "Send invite",
    editTitle: "Edit playdate",
    sendUpdate: "Send update",
    updateTitle: "Your update is ready",
    updateNote: "Share it with each family from your phone. Families you just added get the invite with their own link.",
    nothingChanged: "Nothing changed, so there's nothing to send.",
    backToPlaydate: "Back to the playdate",
    fixAbove: "Something above needs a look before this can go.",
    sentTitle: "Your invite is ready",
    sentNote: "Share it with each family from your phone: pick them in Messages, WhatsApp or anywhere else. Your message and their own link are already filled in.",
    /** Q26 (T33): the phone's share sheet; the parent picks the person from their own contacts. */
    textButton: (name: string) => `Share with ${name}`,
    texted: (name: string) => `✓ Shared with ${name}`,
    copied: (name: string) => `✓ Copied: paste it to ${name}`,
    backHome: "Back to Home",
    leaveTitle: "Leave this playdate?",
    leaveNote: "What you've entered so far will be lost.",
    keepPlanning: "Keep planning",
    discard: "Discard",
    // KD-02…06 (the rule codes) and the Details checks of the planning screen.
    errors: {
      NO_TIME: "Choose a date, a start and an end, then tap Done.",
      NO_FREE_SLOTS: "Tap at least one time you're free, then Done.",
      END_BEFORE_START: "The end has to be after the start.",
      IN_PAST: "That time has already passed. Choose a later one.",
      MESSAGE_REQUIRED: "Please write a short message to the parents.",
      MESSAGE_TOO_LONG: "That message is a bit long. Please keep it under 1,000 characters.",
      NO_INVITEES: "Choose at least one family to invite.",
      NO_CHILD: "Choose who this playdate is for.",
      NAME_REQUIRED: "Please add your first name.",
      PLACE_NAME_REQUIRED: "Please add the name of the place.",
      ADDRESS_REQUIRED: "Add the address to save this place.",
      PLACE_NOT_FOUND: "That place couldn't be found. Please choose it again.",
      TOO_MANY_PLAYDATES: "That's a lot of playdates at once. Please try again in a little while.",
      NOT_FOUND: "That playdate isn't yours or doesn't exist any more.",
      PLAYDATE_CANCELLED: "This playdate was cancelled, so it can't be changed.",
      SUGGESTIONS_FAILED: "Couldn't get ideas right now. Please try again.",
    },
  },
  // Built-in message ideas: what ✨ Suggestions shows without the AI (AI_MODE=fake, no key, or the AI failing).
  // `child` = the organizer's child, `kids` = the friends' children ("Arjun and Lily"), `all` = both ("Mia, Arjun and Lily"), `when` = "Mon, Nov 16, 10:00 AM to 12:00 PM"
  // or "sometime soon", `at` = " at Riverdale Park" or "". Short and warm; never more than one exclamation mark.
  suggestionTemplates: [
    (v: SuggestionWords) => `Hi! ${v.child} would love a playdate with ${v.kids}. Are you free ${v.when}${v.at}?`,
    (v: SuggestionWords) => `${v.child} keeps asking to see ${v.kids}. Would ${v.when}${v.at} work for you?`,
    (v: SuggestionWords) => `Want to get the kids together? We're thinking ${v.when}${v.at}. Let me know if that works.`,
    (v: SuggestionWords) => `How about a playdate for ${v.all}? We could do ${v.when}${v.at}. No pressure if you're busy.`,
    (v: SuggestionWords) => `We'd love for ${v.kids} to play with ${v.child}: ${v.when}${v.at}. Can you make it?`,
    (v: SuggestionWords) => `Playdate time? ${v.all}, ${v.when}${v.at}. Tell me if another time is better.`,
  ],
  // Find a place (T17). The quick chips are Q21's default.
  places: {
    findPlace: "Find a place",
    searchLabel: "Search for a place",
    searchPlaceholder: "Park, library, indoor play…",
    search: "Search",
    quickSearches: ["Parks", "Playgrounds", "Indoor play", "Libraries", "Splash pads"],
    searching: "Searching…",
    noResults: "No places found. Try other words, or type the place yourself.",
    searchFailed: "Couldn't search right now. Please try again.",
    typeInstead: "Or close this and tap Type a place.",
    close: "Close",
    select: "Select",
    selectPlace: (name: string) => `Select ${name}`,
    directions: "Directions",
    call: "Call",
    website: "Website",
    remove: "Remove",
    change: "Change place",
    setting: { indoor: "Indoor", outdoor: "Outdoor", both: "Indoor and outdoor" },
    ages: (min: number, max: number | null) => (max === null ? (min === 0 ? "All ages" : `Ages ${min}+`) : `Ages ${min}–${max}`),
    price: { free: "Free", $: "$", $$: "$$", $$$: "$$$" },
    rating: (r: number) => `★ ${r.toFixed(1)}`,
    /** Shown when the provider can't say what a stored place id is right now. */
    unavailable: "The place on the map",
    // T18: the heart, likes, Plan a playdate here, and the Where step's other ways in.
    favourite: (name: string) => `Favourite: ${name}`,
    heartFailed: "Couldn't change that favourite. Please try again.",
    likes: (n: number) => `♥ ${n} parents like it`,
    planHere: "Plan a playdate here",
    orAsk: "or ask Kindred",
    favouritesLabel: "Your favourites",
    // T30: the Where step opens with the parent's own places.
    yourPlaces: "Your places",
    typePlace: "Type a place",
    clearPlace: "Clear",
    favouriteChip: (name: string) => `♥ ${name}`,
  },
  // Ask Kindred (T18).
  ask: {
    title: "Ask Kindred",
    intro: "Say what you're looking for, and Kindred suggests up to four places.",
    label: "What are you looking for?",
    placeholder: "Somewhere indoor for a rainy Saturday with a 4-year-old",
    submit: "Ask Kindred",
    asking: "Looking for places…",
    nothing: "Kindred didn't find places for that. Try other words.",
    failed: "Couldn't ask right now. Please try again.",
    tooMany: "That's a lot of questions at once. Please try again in a few minutes.",
    /** The keyword fallback's reason: which search found the place. */
    foundFor: (search: string) => `Found when searching "${search}".`,
    results: "Places for you",
  },
  // Explore (T18).
  explore: {
    title: "Places",
    favourites: "Your favourites",
    noFavourites: "Tap ♡ on a place to keep it here.",
    popular: "Popular with parents",
    noPopular: "Places other parents love will show up here.",
    search: "Search",
    // T30: the places a parent typed and saved (Q14).
    saved: "Your saved places",
    noSaved: "Places you type and save when planning show up here.",
    rename: "Rename",
    renameLabel: (name: string) => `New name for ${name}`,
    save: "Save",
    cancel: "Cancel",
    remove: "Remove",
    removeAsk: (name: string) => `Remove ${name}?`,
    keep: "Keep",
    savedErrors: {
      NAME_REQUIRED: "Give the place a name.",
      NAME_TOO_LONG: "That name is too long.",
      NAME_TAKEN: "You already have a place with that name.",
      NOT_FOUND: "That place isn't there any more.",
      FAILED: "Couldn't change that place. Please try again.",
    },
  },
  suggestionWords: {
    noKids: "your kids",
    allWithoutKids: (child: string) => `${child} and your kids`,
    noTime: "sometime soon",
    when: (day: string, time: string) => `${day}, ${time}`,
    at: (place: string) => ` at ${place}`,
  },
  playdate: {
    back: "Home",
    whoTitle: "Who's invited",
    answered: (answered: number, total: number) => `${answered} of ${total} answered`,
    live: "Live",
    whenTitle: "When",
    yourAvailability: "Your availability (sent)",
    savedTextsTitle: "Texts not sent yet",
    savedTextsNote: "Kept on this phone for a day, in case you didn't send them all.",
    suggestedTitle: "Times friends suggested",
    noSuggestions: "No times suggested yet. You can confirm once a family picks one.",
    whereTitle: "Where",
    detailsTitle: "Details",
    messageLabel: "Your message",
    canCome: (names: readonly string[]) =>
      `${names.length} ${names.length === 1 ? "family" : "families"} can come: ${names.join(", ")}`,
    nobodyYet: "Nobody can come yet. You can confirm once a family says yes.",
    confirm: "Confirm and send update",
    /** T44: the one button, with the time it confirms ("Confirm · Sat, Nov 21, 10 to 12"). */
    confirmAt: (when: string) => `Confirm · ${when}`,
    /** T44: a suggested time as a chip: "Sat, Nov 21, 10 to 12 · 2 coming". */
    timeChip: (when: string, families: number) => `${when} · ${families} coming`,
    /** For screen readers: the full time and who picked it. */
    timeChipLabel: (when: string, names: readonly string[]) => `${when}, ${names.join(", ")}`,
    edit: "Edit playdate",
    preview: "Preview what friends see",
    cancel: "Cancel playdate",
    cancelAsk: "Cancel this playdate?",
    cancelNote: "Everyone you invited will see it's cancelled, and their links won't take answers any more.",
    keepPlaydate: "Keep playdate",
    cancelledNote: "Let each family know from your phone:",
    confirmed: "Confirmed",
    updateSent: "✓ Update sent",
    updateNote: "Families who open their link now see it's on. Share the news with each one from your phone:",
    cancelled: "This playdate was cancelled.",
    errors: {
      CONFIRM_NEEDS_YES: "You can confirm once at least one family says yes.",
      CONFIRM_NEEDS_TIME: "Choose a time first.",
      PLAYDATE_CANCELLED: "This playdate was cancelled.",
      NOT_FOUND: "That playdate isn't yours or doesn't exist any more.",
    },
  },
  /** KD-10, Q19 default: the update texts. The first text, with the link, is right above them in the same Messages thread. */
  updateTexts: {
    newTime: (day: string, time: string, place: string | null) =>
      `New time for our playdate: ${day}, ${time}${place ? ` at ${place}` : ""}. Please answer again with the link above.`,
    updated: (day: string, time: string, place: string | null) =>
      `Our playdate has an update: ${day}, ${time}${place ? ` at ${place}` : ""}. The link above has the details.`,
    /** Share availability, before a time is confirmed: no single time to name. */
    newTimes: (place: string | null) => `New times to pick from for our playdate${place ? ` at ${place}` : ""}. Please answer again with the link above.`,
    updatedNoTime: (place: string | null) => `Our playdate${place ? ` at ${place}` : ""} has an update. The link above has the details.`,
  },
  /** KD-12: the doc's "most families picked" text (sent by the organizer from Home, Q2 default). */
  majorityText: (range: string) => `Most families picked ${range}. Does that work for you?`,
  /** KD-15 (Q1 default): the cancellation text, from the organizer's phone. */
  cancelledText: (day: string | null) => (day ? `Sorry, our playdate on ${day} is cancelled.` : "Sorry, our playdate is cancelled."),
  /** KD-09: the confirmation, on the invite page's bubble and in the organizer's Text. "Sat, Nov 21", "10:00 AM to 12:00 PM". */
  itsOn: (day: string, time: string, place: string | null) => `It's on! 🎉 See you ${day}, ${time}${place ? ` at ${place}` : ""}.`,
  /** The privacy page (T24, Q13 default): a plain first draft, to be reviewed against PIPEDA before the beta. */
  privacy: {
    title: "Privacy",
    intro: "Kindred helps you plan playdates with families you already know. Here's what it keeps, who sees it, and how to delete it.",
    updated: "Last updated November 16, 2026.",
    sections: [
      {
        title: "What Kindred keeps",
        lines: [
          "Your first name and phone number, to sign you in.",
          "Your children's first names and ages. Ages are used only to suggest places.",
          "The friends you add: their name and their child's first name. A friend's phone number is only used once, to check if they already use Kindred, and is not kept.",
          "Your groups, saved places and favourite places.",
          "Your playdates, and the answers friends give.",
        ],
      },
      {
        title: "Who sees it",
        lines: [
          "Your friends list, groups and saved places are only yours.",
          "Friends you invite see your first name, your child's first name, the time, the place, your message and the first names of the other families invited. Never phone numbers, ages or groups.",
          "Favourite places are only counted together, from two parents up, without saying who.",
        ],
      },
      {
        title: "What Kindred doesn't do",
        lines: [
          "It never reads your address book. Only the contacts you choose are checked, to see who already uses Kindred.",
          "It never texts your friends. Invites and updates go from your own phone, when you tap Share.",
          "No public profiles, no strangers, no feed.",
        ],
      },
      {
        title: "Invite links and answers",
        lines: [
          "Each friend gets their own link. It works only for that playdate and stops working after it.",
          "Friends answer without an account. Kindred keeps their answer and any note for that playdate.",
          "30 days after a playdate, its links and notes are removed.",
          "Your Invite to Kindred link makes you friends with whoever joins through it and says yes. Stop my old links turns them all off.",
          "During a playdate, check-ins and their notes are seen by the families of that playdate only. Notes are removed 30 days after it.",
        ],
      },
      {
        title: "Services Kindred uses",
        lines: [
          "Supabase stores Kindred's information and handles sign-in.",
          "Railway runs the app.",
          "Google Places finds places when you search. It gets your search words.",
          "Anthropic's Claude suggests messages and places. It gets the plan's day, time and place, or your question and your children's ages. Never names or phone numbers.",
        ],
      },
    ],
    deleteTitle: "Delete your account",
    deleteNote:
      "This removes your profile, your children, friends, groups, saved places and the playdates you planned. Links you sent stop working, and invites you received are removed from those playdates.",
    deleteSignedOut: "Sign in, then come back to this page to delete your account.",
    deleteButton: "Delete my account",
    deleteAsk: "Delete your account?",
    deleteAskNote: "It can't be undone. Friends you invited aren't told, so cancel any upcoming playdates first if they should know.",
    keepAccount: "Keep my account",
    deleteFailed: "We couldn't delete your account. Please try again.",
    deleted: "Your account and everything in it are deleted.",
    backHome: "Back to Home",
  },
  /** T34 (Q26): Invite to Kindred, a parent's personal link. */
  friendLink: {
    title: "Invite to Kindred",
    note: "Share your link with a friend. Once they join, you're friends on Kindred: no number needed.",
    make: "Get my Kindred link",
    ready: "Your link is ready. Share it with as many friends as you like.",
    share: "Share my link",
    shared: "✓ Shared",
    copied: "✓ Copied: paste it in a message",
    shareText: (url: string) => `Let's plan playdates on Kindred: ${url}`,
    stop: "Stop my old links",
    stopAsk: "Stop your old links?",
    stopNote: "Friends who haven't joined yet will need a new link from you.",
    keep: "Keep them",
    stopped: "Your old links don't work any more.",
    tooMany: "That's a lot of links at once. Please try again in a while.",
    failed: "Something went wrong. Please try again.",
    // The page the link opens (/f/[token]).
    invites: (name: string) => `${name} invites you to Kindred`,
    parentOf: (child: string) => `${child}'s parent`,
    about: "Kindred helps families who already know each other plan playdates. Friends answer from a text, with nothing to install.",
    join: "Join Kindred",
    accept: (name: string) => `Become friends with ${name}`,
    notNow: "Not now",
    own: "This is your own link. Share it with a friend.",
    notFoundTitle: "This link doesn't work",
    notFoundNote: "Ask your friend for a new one.",
    backHome: "Go to Home",
    befriended: "You're friends on Kindred now.",
  },
  /** T35 (KD-18, Q27): check-ins during the playdate. */
  checkIns: {
    title: "How it's going",
    kinds: { here: "We're here 📍", late: "Running 10 min late", all_good: "All good, having fun 🎉", heading_home: "Heading home 👋" },
    hint: "Tap one to let the other families know.",
    noteLabel: "Add a note (optional)",
    notePlaceholder: "e.g. By the big slide",
    empty: "No check-ins yet.",
    posted: "✓ Posted. The other families see it on their page.",
    share: "Share it too",
    shared: "✓ Shared",
    copied: "✓ Copied: paste it in a message",
    you: "You",
    errors: {
      CHECKIN_CLOSED: "Check-ins are open from 30 minutes before the playdate until an hour after it.",
      CHECKIN_NOT_COMING: "Only families who are coming can check in.",
      CHECKIN_INVALID: "Keep the note to 80 characters.",
      NOT_FOUND: "This playdate isn't there any more.",
      TOO_MANY_CHECKINS: "That's a lot of check-ins at once. Please wait a few minutes.",
    } as Record<string, string>,
  },
  /** T45 (KD-19, Q31): Free to play, a status per child that friends see. */
  free: {
    title: "Free to play",
    sheetNote: "Let friends know when your children can play.",
    privacy: "Only friends who have added you back see it, for 2 days at most. Nothing is sent.",
    whens: { this_afternoon: "This afternoon", this_evening: "This evening", tomorrow: "Tomorrow", this_weekend: "This weekend" } satisfies Record<FreeWhen, string>,
    /** "Mia is free this weekend", or the parent's own words: "Mia: after school". */
    status: (kid: string, kind: FreeKind, words: string | null): string =>
      kind === "own_words" ? `${kid}: ${words ?? ""}` : `${kid} is free ${enCA.free.whens[kind].toLowerCase()}`,
    notSet: "Not set",
    share: "Share",
    change: "Change",
    shareFor: (kid: string) => `Share when ${kid} is free`,
    changeFor: (kid: string) => `Change ${kid}'s status`,
    turnOff: "Turn off",
    whenLabel: (kid: string) => `When is ${kid} free?`,
    ownWordsLabel: "Or in your own words",
    ownWordsPlaceholder: "e.g. Free after school",
    save: "Save",
    saving: "Saving…",
    close: "Close",
    /** The Home banner's line while no child is free. */
    bannerShare: (kids: string) => `Share when ${kids} can play`,
    bannerChange: "Change",
    /** "1 day left", "5h left" (rounded, at least 1 h). */
    left: (until: Date, now: Date): string => {
      const hours = Math.max(1, Math.round((until.getTime() - now.getTime()) / 3_600_000));
      if (hours < 24) return `${hours}h left`;
      const days = Math.round(hours / 24);
      return days === 1 ? "1 day left" : `${days} days left`;
    },
    plan: "Plan",
    planLabel: (name: string) => `Plan a playdate with ${name}`,
    dot: "Free to play",
    errors: {
      FREE_NOT_NOW: "That time has passed. Pick another one.",
      FREE_INVALID: "Keep it to 50 characters.",
      NOT_FOUND: "Something went wrong. Please try again.",
      TOO_MANY: "That's a lot of changes at once. Please wait a few minutes.",
    },
  },
  /** T27: the organizer's look at the invite page. */
  preview: {
    banner: "Preview: this is what friends see. Nothing here is sent.",
    back: "Back to your playdate",
  },
  gate: {
    title: "Kindred is being tested",
    note: "Enter the password you were given to continue.",
    label: "Password",
    submit: "Continue",
    wrong: "That password isn't right.",
    tooMany: "Too many tries. Please wait a few minutes and try again.",
  },
  invite: {
    from: (name: string, child: string | null) => (child ? `${name} · ${child}'s parent` : name),
    labels: { updated: "Updated", new_time: "New time" },
    confirmedBand: "Confirmed",
    availabilityTitle: (name: string) => `${name}'s availability`,
    free: "Free",
    alreadySuggested: "Already suggested",
    pickThis: "Pick this",
    fromLabel: "From",
    untilLabel: "Until",
    sendPick: "Send this time",
    yourPick: (range: string) => `Your pick: ${range}`,
    everyonesPicks: "Everyone's picks",
    yourPickTag: "Your pick",
    mostPicked: "Most picked",
    switchToThis: "Switch to this",
    you: "You",
    families: (n: number) => (n === 1 ? "1 family" : `${n} families`),
    addToCalendar: "Add to calendar",
    whenLabel: "When",
    whereLabel: "Where",
    timeToDecide: "Time to be decided",
    placeToDecide: "Place to be decided",
    directions: "Directions",
    yes: "We're in!",
    no: "Can't make it",
    reasonLabel: "What should we tell them?",
    noteLabel: "Add a note (optional)",
    sendNo: "Send my answer",
    back: "Back",
    thanks: "Thanks! Your answer is in",
    yourAnswer: (answer: string) => `Your answer: ${answer}`,
    change: "Change my answer",
    overTitle: "This playdate is over",
    overNote: "This link only worked until the playdate ended.",
    cancelled: "This playdate was cancelled.",
    started: "This playdate has started, so answers are closed.",
    notFoundTitle: "This link doesn't work",
    notFoundNote: "Check that the whole link was copied, or ask the parent who sent it.",
    tooManyTitle: "Too many tries",
    tooManyNote: "Please wait a few minutes and open the link again.",
    errors: {
      STALE_TIME: "The time just changed. Here's the new time: please answer again.",
      PLAYDATE_STARTED: "This playdate has started, so answers are closed.",
      PLAYDATE_CANCELLED: "This playdate was cancelled.",
      LINK_EXPIRED: "This playdate is over.",
      INVALID_ANSWER: "Please choose a reason (and keep the note under 280 characters).",
      PICK_OUTSIDE_FREE_SLOT: "Please pick a time inside one of the free times.",
      PICK_NOT_HALF_HOUR: "Please start and end on the hour or the half hour.",
      PICK_TOO_SHORT: "Please pick at least half an hour.",
      NOT_FOUND: "This link doesn't work.",
      TOO_MANY_TRIES: "Too many tries. Please wait a few minutes and try again.",
    },
  },
  groups: {
    title: "Groups",
    create: "Create a group",
    empty: "No groups yet. A group lets you invite the same families in one tap.",
    families: (n: number) => (n === 1 ? "1 family" : `${n} families`),
    nameLabel: "Group name",
    namePlaceholder: "e.g. Dance friends",
    privateNote: "Only you can see it.",
    membersLabel: "Families in this group",
    noFriends: "Add friends first, then put them in a group.",
    saveNew: "Create group",
    saveEdit: "Save changes",
    editTitle: "Edit group",
    edit: "Edit",
    remove: "Remove",
    removeLabel: (label: string) => `Remove ${label} from this group`,
    lastPlaydate: (title: string, when: string) => `Last playdate: ${title}, ${when}`,
    noPlaydateYet: "No playdate with this group yet.",
    planWith: (n: number) => `Plan a playdate · ${n === 1 ? "1 family" : `${n} families`}`,
    planAgain: "Plan again: same place, next week",
    more: "More options",
    delete: "Delete group",
    deleteAsk: "Delete this group?",
    deleteNote: "The friends in it stay your friends.",
    keep: "Keep group",
    errors: {
      NAME_REQUIRED: "Please give the group a name of up to 40 characters.",
      NO_MEMBERS: "Choose at least one family.",
      NOT_FOUND: "That group isn't yours or doesn't exist any more.",
    },
  },
  somethingWentWrong: "Something went wrong. Please try again.",
  tabs: {
    label: "Main",
    home: "Home",
    friends: "Friends",
    places: "Places",
    profile: "Profile",
  },
  /** T39: the Profile tab. */
  profile: {
    title: "Profile",
    parentOf: (names: string) => `Parent of ${names}`,
    edit: "Edit",
    editLabel: "Edit your name and kids",
    kidsTitle: "Kids",
    age: (label: string) => (label === "baby" ? "Baby" : `Age ${label}`),
    editTitle: "Edit your profile",
    editNote: "Playdates you already sent keep their names.",
    save: "Save",
    cancel: "Cancel",
    saved: "✓ Saved.",
    accountTitle: "Your account",
    privacy: "Privacy and your data",
    signOut: "Sign out",
  },
  home: {
    welcome: (firstName: string) => `Welcome, ${firstName}`,
    greeting: {
      morning: "Good morning",
      afternoon: "Good afternoon",
      evening: "Good evening",
    },
    planFor: (childNames: string) => `Plan playdates for ${childNames}.`,
    planCard: "Plan a playdate",
    /** Under the Plan card when nothing is on Home yet (Q24). */
    emptyNote: "Pick a friend, a time and a place. They answer from a text.",
    listTitle: "Your playdates",
    /** T37: the coral pill beside Your playdates once the list has something (the Plan card shows only when it is empty). */
    planAnother: "Plan another",
    /** T43: the box under the Plan card. It fills in Plan; it never sends anything. */
    sayIt: {
      label: "Or just say it",
      placeholder: "Dev, Saturday 2 to 4 at the park",
      button: "Fill in Plan",
      pending: "Filling in…",
      nothing: "Try who, when and where, like “Dev, Saturday 2 to 4 at the park”.",
    },
    /** T37 (Q29): the tag at the top of each card. */
    tag: { confirmed: "✓ Confirmed", pending: "Pending" },
    sharedAvailability: "Shared availability",
    /** KD-13 needs you: the note under the card, and what tapping it is for. */
    needsYou: {
      all_answered: "✓ Everyone answered · tap to confirm",
      times_picked: (families: number) => `${families === 1 ? "1 family" : `${families} families`} picked a time · tap to choose`,
      changed_to_no: "Someone can't make it now · tap to see",
    },
    /** T37 (Q29): one chip per family, first names only (KD-17); the words after the name are for screen readers. */
    hostChip: (name: string, isYou: boolean) => (isYou ? `Host: ${name} (you)` : `Host: ${name}`),
    youChip: "You",
    chipState: { yes: "coming", pick: "picked a time", no: "can't make it", waiting: "waiting" },
    noTime: "Time to be decided",
    noPlace: "Place not set yet",
    /** T38: the organizer's last confirmed playdates that are over. */
    recentTitle: "Recent playdates",
    planAgain: "Plan again",
    majorityNotice: (name: string, range: string) => `Tell ${name}: most families picked ${range}`,
    /** T15: invites from other Kindred parents. */
    invitedBy: (organizer: string, child: string | null) => (child ? `${organizer} invited ${child}` : `${organizer} invited you`),
    pickATime: "Pick a time that works",
    waitingForYou: "Waiting for your answer · tap to answer",
    /** T50: the quick sheet for the parent's own playdate. */
    sheet: {
      openPage: "Open playdate",
      close: "Close",
      family: (name: string, state: string) => `${name} · ${state}`,
      waitingYes: "You can confirm once a family says yes.",
      waitingPicks: "You can confirm once a family picks a time.",
      cancelYes: "Yes, cancel playdate",
    },
    /** T49 (KD-07): answering a set-time invite right on Home. */
    answer: {
      label: (organizer: string) => `Your answer to ${organizer}`,
      coming: "Coming",
      cantMakeIt: "Can't make it",
      youreComing: "✓ You're coming",
      youCant: (reason: string) => `Can't make it · ${reason}`,
      change: "Change my answer",
      send: "Send: can't make it",
      back: "Back",
    },
    myAnswer: {
      waiting: "Waiting for your answer",
      yes: "You're in",
      pick: "Your time is in",
      no: "You can't make it",
    },
  },
  status: {
    confirmed: "Confirmed",
    coming: "Coming",
    responded: "Responded",
    waiting: "Waiting",
    cantMakeIt: "Can't make it",
  },
  // KD-07 reason chips, as the doc words them.
  reasons: {
    maybe_another_time: "Maybe another time",
    busy: "We're busy then",
    not_feeling_well: "Not feeling well",
    too_far: "Too far for us",
    other_plans: "Other plans this week",
  } satisfies Record<DeclineReason, string>,
} as const;

/** KD-08: the words of a friend's status line, e.g. "Can't make it · We're busy then". */
export function friendStatusLabel(status: FriendStatus): string {
  switch (status.status) {
    case "coming":
      return enCA.status.coming;
    case "responded":
      return enCA.status.responded;
    case "waiting":
      return enCA.status.waiting;
    case "cant_make_it":
      return `${enCA.status.cantMakeIt} · ${enCA.reasons[status.reason]}`;
  }
}

// --- Dates and times -------------------------------------------------------------------------------------------------
// A playdate's times are shown in the zone passed in. KD-16 asks for the viewer's own zone, named only when it differs from
// the playdate's: until a screen knows the viewer's zone (the browser's), callers pass the playdate's zone.

const parts = (date: Date, zone: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: zone, ...options }).formatToParts(date);
const part = (list: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) => list.find((p) => p.type === type)?.value ?? "";

/** "9:00 AM" (the doc's style, not "9:00 a.m."). */
export function formatTime(date: Date, zone: string): string {
  const p = parts(date, zone, { hour: "numeric", minute: "2-digit", hour12: true });
  const period = part(p, "dayPeriod").replace(/\./g, "").toUpperCase();
  return `${part(p, "hour")}:${part(p, "minute")} ${period}`;
}

/** KD-03: the length shown next to a set time, "2 hr", "1 hr 30 min", "45 min". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (!hours) return `${rest} min`;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/** "Arjun", "Arjun and Lily", "Arjun, Lily and Zoe" (message ideas; the title uses "&", KD-06). */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** KD-16: the short name of a zone at that moment, e.g. "EST", "PST", "GMT+5:30". */
export function zoneName(date: Date, zone: string): string {
  return part(parts(date, zone, { timeZoneName: "short" }), "timeZoneName");
}

/** "9:00 AM to 12:00 PM" */
export function formatTimeRange(start: Date, end: Date, zone: string): string {
  return `${formatTime(start, zone)} to ${formatTime(end, zone)}`;
}

/** "10 to 12", "2:30 to 4": the short range on the confirm chips and button (T44, the mock-up's style). */
export function formatShortTimeRange(start: Date, end: Date, zone: string): string {
  const clock = (d: Date) => {
    const p = parts(d, zone, { hour: "numeric", minute: "2-digit", hour12: true });
    return part(p, "minute") === "00" ? part(p, "hour") : `${part(p, "hour")}:${part(p, "minute")}`;
  };
  return `${clock(start)} to ${clock(end)}`;
}

/** "Sat, Nov 21, 10 to 12" (T44). */
export function formatShortWhen(start: Date, end: Date, zone: string): string {
  return `${formatShortDay(start, zone)}, ${formatShortTimeRange(start, end, zone)}`;
}

/** "Saturday, November 14": the banner's date. */
export function formatLongDay(date: Date, zone: string): string {
  const p = parts(date, zone, { weekday: "long", month: "long", day: "numeric" });
  return `${part(p, "weekday")}, ${part(p, "month")} ${part(p, "day")}`;
}

/** "Saturday": the clock line on a Home card (T37). */
export function formatWeekday(date: Date, zone: string): string {
  return part(parts(date, zone, { weekday: "long" }), "weekday");
}

/** "Mon, Nov 16" */
export function formatShortDay(date: Date, zone: string): string {
  const p = parts(date, zone, { weekday: "short", month: "short", day: "numeric" });
  return `${part(p, "weekday")}, ${part(p, "month")} ${part(p, "day")}`;
}

/** The date tile: "Nov" over "16". */
export function formatDateTile(date: Date, zone: string): { month: string; day: string } {
  const p = parts(date, zone, { month: "short", day: "numeric" });
  return { month: part(p, "month"), day: part(p, "day") };
}

export type DayPart = keyof typeof enCA.home.greeting;

/** Morning until 11:59, afternoon until 16:59, evening after. The hour is read in the zone passed in. */
export function dayPartOf(date: Date, zone: string): DayPart {
  const hour = Number(part(parts(date, zone, { hour: "numeric", hourCycle: "h23" }), "hour"));
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}
