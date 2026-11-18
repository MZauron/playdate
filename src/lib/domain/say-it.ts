// Or just say it (T43): "Dev, Saturday 2 to 4 at the park" → the Plan screen filled in, for the parent to check and send.
// The AI reads the sentence when it can; the built-in reader below does the same without it (AI_MODE=fake, no key, a failure, or the
// rate limit). Either way the result is checked here: only the parent's own friends, days in the picker's two weeks, times on the
// pickers' 15-minute steps. It never sends anything and never writes the message (KD-05). Pure apart from the ports passed in.
// Nothing of the sentence is ever logged: codes only.
import { z } from "zod";
import { createRateLimiter, type RateLimiter } from "@/platform/rate-limit";
import { SLOT_HOURS, SLOT_ORDER } from "@/lib/rules/config";
import type { DaySlot } from "@/lib/rules/types";
import type { SayItIdeas } from "@/lib/integrations/ai/types";

export const SAY_MAX = 200;
const PLACE_MAX = 80;
/** The When pickers: two weeks of days from today (T31), times from 6 AM to 10 PM in 15-minute steps (T08). */
const DAYS_AHEAD = 14;
const FIRST_MINUTE = 6 * 60;
const LAST_MINUTE = 22 * 60;
const STEP = 15;
/** "at 2" alone: the pickers' usual two hours (10 to 12). */
const DEFAULT_LENGTH = 120;

/** 20 sentences per parent per 10 minutes go to the AI; after that the built-in reader answers. */
export const sayLimiter = createRateLimiter({
  max: 20,
  windowMs: 10 * 60 * 1000,
});

export const SayRequest = z.object({ words: z.string().max(1000) });

/** What was understood. Days are calendar days on the parent's clock ("2026-11-21"); times are "14:00". */
export type Said = {
  friendIds: string[];
  days: string[];
  start: string | null;
  end: string | null;
  slot: DaySlot | null;
  place: string | null;
};

export type SayFriend = {
  id: string;
  parentName: string;
  childFirstName: string | null;
};

export const nothingSaid = (said: Said) => !said.friendIds.length && !said.days.length && !said.start && !said.slot && !said.place;

// --- Days ---------------------------------------------------------------------------------------------------------------------------
const dayToUtc = (day: string) => new Date(`${day}T00:00:00Z`);
const addDays = (day: string, n: number) => {
  const d = dayToUtc(day);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const weekdayOf = (day: string) => dayToUtc(day).getUTCDay();

/** Today and the next 13 days: what the When pickers offer. */
export const sayDays = (today: string) => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i));

const WEEKDAYS: readonly (readonly string[])[] = [
  ["sunday", "sun"],
  ["monday", "mon"],
  ["tuesday", "tues", "tue"],
  ["wednesday", "wed"],
  ["thursday", "thurs", "thur", "thu"],
  ["friday", "fri"],
  ["saturday", "sat"],
];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** A weekday's name means the next one after today ("today" says today). */
const nextWeekday = (today: string, weekday: number) => addDays(today, ((weekday - weekdayOf(today) + 6) % 7) + 1);

// --- Times --------------------------------------------------------------------------------------------------------------------------
const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const onPicker = (m: number) => m >= FIRST_MINUTE && m <= LAST_MINUTE && m % STEP === 0;

type Half = "am" | "pm" | null;
const half = (s: string | undefined): Half => (!s ? null : s.startsWith("a") ? "am" : "pm");
/** 12-hour clock → minutes after midnight. */
const to24 = (h: number, m: number, h12: "am" | "pm") => ((h % 12) + (h12 === "pm" ? 12 : 0)) * 60 + m;
/** No am/pm: playdate hours. 8 to 11 are mornings; 12 is noon; 1 to 7 are afternoons. */
const guessHalf = (h: number): "am" | "pm" => (h >= 8 && h <= 11 ? "am" : "pm");

function timeRange(h1: number, m1: number, s1: Half, h2: number | null, m2: number, s2: Half): { start: string; end: string } | null {
  if (h1 < 1 || h1 > 12 || (h2 !== null && (h2 < 1 || h2 > 12)) || m1 > 59 || m2 > 59) return null;
  let start: number;
  if (s1) start = to24(h1, m1, s1);
  else if (h2 !== null && s2) {
    // "11 to 1pm": the start is the same half as the end when it comes before it on the 12-hour clock, else the other half.
    const sameHalf = to24(h1, m1, s2);
    start = sameHalf < to24(h2, m2, s2) ? sameHalf : to24(h1, m1, s2 === "pm" ? "am" : "pm");
  } else start = to24(h1, m1, guessHalf(h1));
  let end: number;
  if (h2 === null) end = start + DEFAULT_LENGTH;
  else if (s2) end = to24(h2, m2, s2);
  else {
    // "2 to 4", "10 to 12", "11 to 1": the first of the two readings that comes after the start.
    const am = to24(h2, m2, "am");
    end = am > start ? am : am + 12 * 60;
  }
  if (end <= start || !onPicker(start) || !onPicker(end)) return null;
  return { start: clock(start), end: clock(end) };
}

// --- Words --------------------------------------------------------------------------------------------------------------------------
const L = "\\p{L}";
const word = (w: string) => new RegExp(`(?<![${L}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:['’]s)?(?![${L}])`, "iu");
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

/** Words that end a place ("at the park on Saturday", "at Riverdale from 2"). */
const PLACE_STOP = new RegExp(
  `\\s*(?:[,.;!?]|\\s(?:on|from|this|next|between|around|with|for|today|tomorrow|tonight|morning|afternoon|evening|weekend|${WEEKDAYS.flat().join("|")})(?![${L}])|\\s\\d)`,
  "iu",
);

/**
 * The built-in reader: friends' first names (the parent's or the child's), weekdays, "today", "tomorrow", "tonight", "this weekend",
 * "Nov 21", "morning/afternoon/evening", "2 to 4" (or "10am-12", "2:30 to 4:30", "at 2"), and "at <place>".
 */
export function readSentence(words: string, context: { today: string; friends: readonly SayFriend[] }): Said {
  const { today, friends } = context;
  let text = ` ${words.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim()} `;
  const lower = () => text.toLowerCase();

  const friendIds = friends
    .filter((f) => [firstName(f.parentName), f.childFirstName ?? ""].some((n) => n.length >= 2 && word(n).test(text)))
    .map((f) => f.id);

  const days: string[] = [];
  // "Nov 21", "November 21st": the next such day from today. Taken out first so its number is not read as a time.
  text = text.replace(
    new RegExp(`(?<![${L}])(${MONTHS.join("|")})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?!\\d)`, "giu"),
    (_, mon: string, d: string) => {
      const month = MONTHS.indexOf(mon.toLowerCase().slice(0, 3));
      const year = Number(today.slice(0, 4));
      for (const y of [year, year + 1]) {
        const day = `${y}-${String(month + 1).padStart(2, "0")}-${String(Number(d)).padStart(2, "0")}`;
        if (!Number.isNaN(dayToUtc(day).getTime()) && dayToUtc(day).getUTCDate() === Number(d) && day >= today) {
          days.push(day);
          break;
        }
      }
      return " ";
    },
  );
  if (word("today").test(text) || word("tonight").test(text)) days.push(today);
  if (word("tomorrow").test(text)) days.push(addDays(today, 1));
  if (word("weekend").test(text)) {
    const sat = weekdayOf(today) === 6 ? today : nextWeekday(today, 6);
    days.push(...(weekdayOf(today) === 0 ? [today] : [sat, addDays(sat, 1)]));
  }
  WEEKDAYS.forEach((names, weekday) => {
    if (names.some((n) => word(n).test(text))) days.push(nextWeekday(today, weekday));
  });

  const slot: DaySlot | null =
    word("tonight").test(text) || word("evening").test(text)
      ? "evening"
      : word("afternoon").test(text)
        ? "afternoon"
        : word("morning").test(text)
          ? "morning"
          : null;

  // Times: noon is 12 pm; a range first, then one time on its own ("at 2", "2pm", "2:30").
  text = text.replace(/(?<![\p{L}])noon(?![\p{L}])/giu, "12pm");
  const AMPM = "(a\\.?m\\.?|p\\.?m\\.?)";
  let times: { start: string; end: string } | null = null;
  const range = new RegExp(
    `(?<![\\d:])(\\d{1,2})(?::(\\d{2}))?\\s*${AMPM}?\\s*(?:-|to|until|till|til)\\s*(\\d{1,2})(?::(\\d{2}))?\\s*${AMPM}?(?![\\d:])`,
    "iu",
  ).exec(lower());
  if (range) {
    times = timeRange(Number(range[1]), Number(range[2] ?? 0), half(range[3]), Number(range[4]), Number(range[5] ?? 0), half(range[6]));
  } else {
    const one =
      new RegExp(`(?<![\\d:])(\\d{1,2})(?::(\\d{2}))?\\s*${AMPM}(?![\\p{L}])`, "iu").exec(lower()) ??
      new RegExp(`(?<![\\d:])(\\d{1,2}):(\\d{2})()(?!\\d)`, "u").exec(lower()) ??
      new RegExp(`(?<![\\p{L}])(?:at|from|around)\\s+(\\d{1,2})()()(?![\\d:])`, "iu").exec(lower());
    if (one) times = timeRange(Number(one[1]), Number(one[2] || 0), half(one[3] || undefined), null, 0, null);
  }

  // "at <place>": not "at 2" or "at noon"; up to a comma, a day or time word, or a number.
  let place: string | null = null;
  const at = /(?<![\p{L}])at\s+(?![\d])/iu.exec(text);
  if (at) {
    const rest = ` ${text.slice(at.index + at[0].length)}`;
    const stop = PLACE_STOP.exec(rest);
    const name = (stop ? rest.slice(0, stop.index) : rest).trim().slice(0, PLACE_MAX).trim();
    if (name && !/^12pm$/i.test(name)) place = name;
  }

  return clean(
    {
      friendIds,
      days,
      start: times?.start ?? null,
      end: times?.end ?? null,
      slot,
      place,
    },
    context,
  );
}

/** Whatever read the sentence, only what the Plan screen can take: the parent's own friends, the picker's days and times. */
export function clean(said: Said, context: { today: string; friends: readonly { id: string }[] }): Said {
  const own = new Set(context.friends.map((f) => f.id));
  const allowed = new Set(sayDays(context.today));
  const time = (t: string | null) => (t && /^\d{2}:\d{2}$/.test(t) && onPicker(minutesOf(t)) ? t : null);
  let start = time(said.start);
  let end = time(said.end);
  if (!start || !end || minutesOf(end) <= minutesOf(start)) start = end = null;
  const place = said.place?.replace(/\s+/g, " ").trim().slice(0, PLACE_MAX).trim() || null;
  return {
    friendIds: [...new Set(said.friendIds)].filter((id) => own.has(id)),
    days: [...new Set(said.days)].filter((d) => allowed.has(d)).sort(),
    start,
    end,
    slot: said.slot && SLOT_ORDER.includes(said.slot) ? said.slot : null,
    place,
  };
}

// --- To the Plan screen -------------------------------------------------------------------------------------------------------------
/** What Plan opens with. `slots` ("2026-11-21|afternoon") means Share availability; otherwise a set time when `day` is there. */
export type SaidPrefill = {
  friendIds: string[];
  day?: string;
  start?: string;
  end?: string;
  slots?: string[];
  placeName?: string;
  placeAddress?: string;
};

const slotTimes = (slot: DaySlot) => ({
  start: clock(SLOT_HOURS[slot].start * 60),
  end: clock(SLOT_HOURS[slot].end * 60),
});

/** The availability slots a time range touches ("2 to 4" → afternoon; "11 to 2" → morning and afternoon). */
function slotsFor(start: string, end: string): DaySlot[] {
  const s = minutesOf(start);
  const e = minutesOf(end);
  const touched = SLOT_ORDER.filter((slot) => s < SLOT_HOURS[slot].end * 60 && e > SLOT_HOURS[slot].start * 60);
  return touched.length ? touched : [s < SLOT_HOURS.afternoon.start * 60 ? "morning" : "evening"];
}

/**
 * One day → a set time on it (the times said, or the part of the day said; with neither, the parent picks the time). Several days →
 * Share availability on those days, in the parts of the day said (all three when no time was said). A place that is one of the
 * parent's saved places brings its address.
 */
export function saidToPrefill(said: Said, savedPlaces: readonly { name: string; address: string }[]): SaidPrefill {
  const out: SaidPrefill = { friendIds: said.friendIds };
  const times = said.start && said.end ? { start: said.start, end: said.end } : said.slot ? slotTimes(said.slot) : null;
  if (said.days.length > 1) {
    const parts = said.slot ? [said.slot] : times ? slotsFor(times.start, times.end) : [...SLOT_ORDER];
    out.slots = said.days.flatMap((d) => parts.map((p) => `${d}|${p}`));
  } else {
    if (said.days[0]) out.day = said.days[0];
    if (times) Object.assign(out, times);
  }
  if (said.place) {
    const bare = (s: string) =>
      s
        .toLowerCase()
        .replace(/^the\s+/, "")
        .trim();
    const saved = savedPlaces.find((p) => bare(p.name) === bare(said.place!));
    out.placeName = saved?.name ?? said.place;
    out.placeAddress = saved?.address ?? "";
  }
  return out;
}

// --- The service --------------------------------------------------------------------------------------------------------------------
export type SayDeps = {
  ai: SayItIdeas;
  limiter: RateLimiter;
  log?: (code: string) => void;
};

export type SayResult = { ok: true; prefill: SaidPrefill; source: "ai" | "built_in" } | { ok: false; code: "NOTHING_SAID" };

/**
 * The AI gets the sentence, today, and the friends' first names under short refs ("f1"), never ids, numbers or children's names;
 * names it picks are joined with the ones the built-in reader found (a child's name is matched here only).
 */
export async function sayIt(
  deps: SayDeps,
  parent: {
    id: string;
    friends: readonly SayFriend[];
    savedPlaces: readonly { name: string; address: string }[];
  },
  input: string,
  today: string,
): Promise<SayResult> {
  const words = input.replace(/\s+/g, " ").trim().slice(0, SAY_MAX);
  if (!words) return { ok: false, code: "NOTHING_SAID" };
  const context = { today, friends: parent.friends };
  const builtIn = readSentence(words, context);
  let said: Said | null = null;
  if (deps.limiter.hit(parent.id).ok) {
    try {
      const refs = parent.friends.map((f, i) => ({
        ref: `f${i + 1}`,
        id: f.id,
        name: firstName(f.parentName),
      }));
      const answer = await deps.ai.sayIt({
        words,
        today,
        weekday: WEEKDAY_NAMES[weekdayOf(today)]!,
        friends: refs.map(({ ref, name }) => ({ ref, name })),
      });
      const fromAi = clean(
        {
          ...answer,
          friendIds: answer.friends.flatMap((r) => refs.find((x) => x.ref === r)?.id ?? []),
        },
        context,
      );
      said = {
        ...fromAi,
        friendIds: [...new Set([...fromAi.friendIds, ...builtIn.friendIds])],
      };
      if (nothingSaid(said)) said = null;
    } catch {
      deps.log?.("say_ai_fallback");
    }
  }
  const source = said ? "ai" : "built_in";
  said ??= builtIn;
  if (nothingSaid(said)) return { ok: false, code: "NOTHING_SAID" };
  return { ok: true, prefill: saidToPrefill(said, parent.savedPlaces), source };
}

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
