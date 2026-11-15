import { describe, expect, it } from "vitest";
import { at } from "@/lib/rules/time";
import { addDays, checkSlots, checkWhen, clockLabel, dayHeading, dayLabel, endForNewStart, slotValues, timeOptions, weekFrom, whenRange, whenSummary } from "./plan-time";

const ZONE = "America/Toronto";
const NOW = at("2026-11-14", 10, 0, ZONE);

describe("the When step", () => {
  it("offers 6:00 AM to 10:00 PM in 15-minute steps, labelled the doc's way", () => {
    const options = timeOptions();
    expect(options[0]).toBe("06:00");
    expect(options.at(-1)).toBe("22:00");
    expect(options).toHaveLength(65);
    expect(["06:00", "12:00", "13:30", "00:15"].map(clockLabel)).toEqual(["6:00 AM", "12:00 PM", "1:30 PM", "12:15 AM"]);
  });
  it("KD-03: a new start keeps the length, and stops at the last time", () => {
    expect(endForNewStart("10:00", "12:00", "09:00")).toBe("11:00");
    expect(endForNewStart("10:00", "11:30", "14:15")).toBe("15:45");
    expect(endForNewStart("10:00", "12:00", "21:00")).toBe("22:00");
  });
  it("Done asks the rule: no day is NO_TIME, a past start is IN_PAST, a bad end is END_BEFORE_START", () => {
    const codes = (day: string, start: string, end: string) => {
      const d = checkWhen({ day, start, end }, ZONE, NOW);
      return d.ok ? [] : d.errors.map((e) => e.code);
    };
    expect(codes("", "10:00", "12:00")).toEqual(["NO_TIME"]);
    expect(codes("2026-11-14", "09:00", "11:00")).toEqual(["IN_PAST"]);
    expect(codes("2026-11-16", "12:00", "10:00")).toEqual(["END_BEFORE_START"]);
    expect(codes("2026-11-16", "10:00", "12:00")).toEqual([]);
  });
  it("folds into a summary with the length", () => {
    const range = whenRange({ day: "2026-11-16", start: "10:00", end: "11:30" }, ZONE)!;
    expect(whenSummary(range, ZONE)).toBe("Mon, Nov 16 · 10:00 AM to 11:30 AM · 1 hr 30 min");
  });
});

describe("the Share availability grid (T12)", () => {
  it("counts days without any zone shifting them, across months and the DST change", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-11-22", -7)).toBe("2026-11-15");
    expect(weekFrom("2026-11-15")).toEqual(["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"]);
  });
  it("labels days the doc's way", () => {
    expect(dayHeading("2026-11-16")).toEqual({ weekday: "Mon", date: "16", month: "Nov" });
    expect(dayLabel("2026-11-16")).toBe("Mon, Nov 16");
  });
  it("Done asks the rule: no slot is NO_FREE_SLOTS, a day before today is IN_PAST", () => {
    const codes = (v: string[]) => {
      const d = checkSlots(v, ZONE, NOW);
      return d.ok ? [] : d.errors.map((e) => e.code);
    };
    expect(codes([])).toEqual(["NO_FREE_SLOTS"]);
    expect(codes(["2026-11-13|morning"])).toEqual(["IN_PAST"]);
    expect(codes(["2026-11-14|evening", "2026-11-16|morning"])).toEqual([]);
  });
  it("sorts slots by day, then morning, afternoon, evening", () => {
    expect(slotValues(["2026-11-17|morning", "2026-11-16|evening", "2026-11-16|morning"])).toEqual([
      { day: "2026-11-16", slot: "morning" },
      { day: "2026-11-16", slot: "evening" },
      { day: "2026-11-17", slot: "morning" },
    ]);
  });
});
