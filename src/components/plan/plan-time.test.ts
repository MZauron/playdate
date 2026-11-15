import { describe, expect, it } from "vitest";
import { at } from "@/lib/rules/time";
import { checkWhen, clockLabel, endForNewStart, timeOptions, whenRange, whenSummary } from "./plan-time";

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
