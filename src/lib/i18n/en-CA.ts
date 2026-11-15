// Every user-facing string lives here (Canadian English), with the date and time formatters.
import type { FriendStatus } from "@/lib/rules/answers";
import type { DeclineReason } from "@/lib/rules/types";

export const enCA = {
  app: {
    name: "Kindred",
    description: "Plan a playdate with families you already know.",
    comingSoon: "Coming soon.",
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
  },
  status: {
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
