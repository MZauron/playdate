// Every user-facing string lives here (Canadian English), with the date and time formatters.
import type { FriendStatus } from "@/lib/rules/answers";
import type { DeclineReason } from "@/lib/rules/types";

/** The pieces a built-in message idea is made of (see `suggestionTemplates`). */
export type SuggestionWords = { child: string; kids: string; all: string; when: string; at: string };

export const enCA = {
  app: {
    name: "Kindred",
    description: "Plan a playdate with families you already know.",
    comingSoon: "Coming soon.",
    signOut: "Sign out",
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
  },
  friends: {
    title: "Your friends",
    empty: "No friends yet. Add someone you'd like to plan with.",
    hasKindred: "has Kindred",
    getsText: "gets a text",
    addTitle: "Add a friend",
    parentNameLabel: "Parent's name",
    childNameLabel: "Child's first name",
    phoneLabel: "Phone number",
    phoneHint: "We only use it to check if they're on Kindred, and for the texts you send.",
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
  },
  plan: {
    title: "Plan a playdate",
    back: "Back",
    whoTitle: "Who's invited",
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
    previousWeek: "Previous week",
    nextWeek: "Next week",
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
    savedPlaces: "Your saved places",
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
    updateNote: "Text each family from your phone. Families you just added get the invite with their own link.",
    nothingChanged: "Nothing changed, so there's nothing to send.",
    backToPlaydate: "Back to the playdate",
    fixAbove: "Something above needs a look before this can go.",
    sentTitle: "Your invite is ready",
    sentNote: "Text each family from your phone. Your message and their own link are already filled in.",
    textButton: (name: string) => `Text ${name}`,
    texted: (name: string) => `✓ Texted ${name}`,
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
    noResults: "No places found. Try other words, or type the place under Details.",
    searchFailed: "Couldn't search right now. Please try again.",
    typeInstead: "Or type the place and address under Details.",
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
    edit: "Edit playdate",
    cancel: "Cancel playdate",
    cancelAsk: "Cancel this playdate?",
    cancelNote: "Everyone you invited will see it's cancelled, and their links won't take answers any more.",
    keepPlaydate: "Keep playdate",
    cancelledNote: "Let each family know from your phone:",
    confirmed: "Confirmed",
    updateSent: "✓ Update sent",
    updateNote: "Families who open their link now see it's on. Text each one the news from your phone:",
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
    groups: "Groups",
    ask: "Ask",
    explore: "Explore",
  },
  home: {
    welcome: (firstName: string) => `Welcome, ${firstName}`,
    greeting: {
      morning: "Good morning",
      afternoon: "Good afternoon",
      evening: "Good evening",
    },
    planFor: (childName: string) => `Plan playdates for ${childName}.`,
    planCard: "Plan a playdate",
    sections: {
      needsYou: "Needs you",
      upcoming: "Upcoming",
      waiting: "Waiting for answers",
    },
    answered: (answered: number, total: number) => `${answered} of ${total} ${total === 1 ? "family" : "families"} answered`,
    noPlace: "Place to be decided",
    majorityNotice: (name: string, range: string) => `Text ${name}: most families picked ${range}`,
    /** T15: invites from other Kindred parents. */
    invitesTitle: "Invites",
    invitedBy: (organizer: string, child: string | null) => (child ? `${organizer} invited ${child}` : `${organizer} invited you`),
    pickATime: "Pick a time that works",
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

/** "Saturday, November 14": the banner's date. */
export function formatLongDay(date: Date, zone: string): string {
  const p = parts(date, zone, { weekday: "long", month: "long", day: "numeric" });
  return `${part(p, "weekday")}, ${part(p, "month")} ${part(p, "day")}`;
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
