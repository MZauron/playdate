// Fake playdates for tests and for looking at Home before real ones exist. now = Sat 14 Nov 2026, 10:00 in Toronto.
import { at } from "@/lib/rules/time";
import type { HomePlaydate } from "./home-data";

export const ZONE = "America/Toronto";
export const NOW = at("2026-11-14", 10, 0, ZONE);

const base = { timezone: ZONE, confirmedAt: null, placeName: null, answers: [], inviteCount: 3, friendInitials: ["D", "M", "A"] } as const;

/** Everyone answered, still collecting: Needs you. */
export const needsYou: HomePlaydate = {
  ...base,
  id: "p-needs",
  title: "Playdate: Mia, Arjun & Zara",
  mode: "set_time",
  status: "collecting",
  start: at("2026-11-15", 10, 0, ZONE),
  end: at("2026-11-15", 12, 0, ZONE),
  answers: [
    { kind: "yes", answeredAt: at("2026-11-13", 9, 0, ZONE) },
    { kind: "yes", answeredAt: at("2026-11-13", 9, 5, ZONE) },
    { kind: "no", answeredAt: at("2026-11-13", 9, 10, ZONE) },
  ],
};

/** Confirmed and not over: Upcoming. */
export const upcoming: HomePlaydate = {
  ...base,
  id: "p-upcoming",
  title: "Playdate: Mia & Lily",
  mode: "set_time",
  status: "confirmed",
  start: at("2026-11-16", 9, 0, ZONE),
  end: at("2026-11-16", 12, 0, ZONE),
  confirmedAt: at("2026-11-13", 18, 0, ZONE),
  placeName: "Riverdale Park",
  inviteCount: 1,
  friendInitials: ["M"],
  answers: [{ kind: "yes", answeredAt: at("2026-11-13", 9, 0, ZONE) }],
};

/** Confirmed for later still, to check the order. */
export const upcomingLater: HomePlaydate = { ...upcoming, id: "p-upcoming-later", title: "Playdate: Mia & Noor", start: at("2026-11-21", 14, 0, ZONE), end: at("2026-11-21", 16, 0, ZONE), placeName: null };

/** 2 of 3 answered: Waiting for answers. */
export const waiting: HomePlaydate = {
  ...base,
  id: "p-waiting",
  title: "Playdate: Mia, Dev & Zoe",
  mode: "set_time",
  status: "collecting",
  start: at("2026-11-18", 16, 0, ZONE),
  end: at("2026-11-18", 18, 0, ZONE),
  answers: [
    { kind: "yes", answeredAt: at("2026-11-13", 9, 0, ZONE) },
    { kind: "yes", answeredAt: at("2026-11-13", 9, 5, ZONE) },
  ],
};

/** Gone from Home. */
export const over: HomePlaydate = { ...upcoming, id: "p-over", start: at("2026-11-12", 9, 0, ZONE), end: at("2026-11-12", 11, 0, ZONE) };
export const cancelled: HomePlaydate = { ...waiting, id: "p-cancelled", status: "cancelled" };
