// KD-19 (Q31, the owner's answer 2026-11-18; T45): "Free to play", a status per child ("Free this afternoon", or the parent's own
// words) that friends see in Kindred. It turns itself off when that time has passed, and after 2 days at most. Nothing is sent.
// Who sees it (only Kindred parents who are friends both ways, never on invite links) is the database's job: `friends_free_now`
// in supabase/migrations/0017_free_to_play.sql, tested in supabase/tests/free-to-play.test.ts. Pure: the clock and zone are passed in.
import { TZDate } from "@date-fns/tz";
import { FREE_AFTERNOON_HOURS, FREE_LAST_CALL_MINUTES, FREE_MAX_HOURS, FREE_OFFER_LEAD_HOURS, FREE_WORDS_MAX_LENGTH } from "./config";
import { at, dayIn } from "./time";
import { allow, deny, type Day, type Decision, type Range, type Zone } from "./types";

export const FREE_WHENS = ["this_afternoon", "this_evening", "tomorrow", "this_weekend"] as const;
export type FreeWhen = (typeof FREE_WHENS)[number];
/** A status is one of the times, or the parent's own words. */
export type FreeKind = FreeWhen | "own_words";
export type FreeStatus = { kind: FreeKind; words: string | null; until: Date };

const HOUR = 3_600_000;
const MINUTE = 60_000;

/** The day `n` days after `day` (noon keeps it clear of clock changes). */
function addDays(day: Day, n: number, zone: Zone): Day {
  return dayIn(new Date(at(day, 12, 0, zone).getTime() + n * 24 * HOUR), zone);
}

/** Start and end of a time in the parent's zone; the weekend is Saturday and Sunday (today's, if it is one). */
export function freePeriod(when: FreeWhen, now: Date, zone: Zone): Range {
  const today = dayIn(now, zone);
  const midnightAfter = (day: Day) => at(addDays(day, 1, zone), 0, 0, zone);
  switch (when) {
    case "this_afternoon":
      return { start: at(today, FREE_AFTERNOON_HOURS.start, 0, zone), end: at(today, FREE_AFTERNOON_HOURS.end, 0, zone) };
    case "this_evening":
      return { start: at(today, FREE_AFTERNOON_HOURS.end, 0, zone), end: midnightAfter(today) };
    case "tomorrow": {
      const tomorrow = addDays(today, 1, zone);
      return { start: at(tomorrow, 0, 0, zone), end: midnightAfter(tomorrow) };
    }
    case "this_weekend": {
      const weekday = new TZDate(at(today, 12, 0, zone), zone).getDay(); // 0 = Sunday
      const saturday = weekday === 0 ? addDays(today, -1, zone) : addDays(today, 6 - weekday, zone);
      return { start: at(saturday, 0, 0, zone), end: midnightAfter(addDays(saturday, 1, zone)) };
    }
  }
}

/** The times a parent can pick now: they start within a day and end more than 15 minutes from now. */
export function freeOptions(now: Date, zone: Zone): FreeWhen[] {
  return FREE_WHENS.filter((when) => {
    const { start, end } = freePeriod(when, now, zone);
    return start.getTime() <= now.getTime() + FREE_OFFER_LEAD_HOURS * HOUR && end.getTime() - FREE_LAST_CALL_MINUTES * MINUTE > now.getTime();
  });
}

/** Checks a status a parent sets for a child and works out when it turns off: the end of that time, or 2 days, whichever is first. */
export function checkFreeStatus(input: { when: string; words?: string | null }, now: Date, zone: Zone): Decision<FreeStatus> {
  const cap = new Date(now.getTime() + FREE_MAX_HOURS * HOUR);
  if (input.when === "own_words") {
    const words = (input.words ?? "").trim().replace(/\s+/g, " ");
    if (!words || words.length > FREE_WORDS_MAX_LENGTH) return deny({ code: "FREE_INVALID", field: "words" });
    return allow({ kind: "own_words", words, until: cap });
  }
  if (!(FREE_WHENS as readonly string[]).includes(input.when)) return deny({ code: "FREE_INVALID", field: "when" });
  const when = input.when as FreeWhen;
  if (!freeOptions(now, zone).includes(when)) return deny({ code: "FREE_NOT_NOW", field: "when" });
  const { end } = freePeriod(when, now, zone);
  return allow({ kind: when, words: null, until: end < cap ? end : cap });
}

/** A status shows until it turns off. */
export function isFreeNow(status: { until: Date }, now: Date): boolean {
  return status.until.getTime() > now.getTime();
}
