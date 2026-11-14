import { describe, expect, it } from "vitest";
import { at } from "@/lib/rules/time";
import { dayPartOf, enCA, formatDateTile, formatLongDay, formatShortDay, formatTime, formatTimeRange, friendStatusLabel } from "./en-CA";

const ZONE = "America/Toronto";
const day = "2026-11-16";

describe("date and time formatters", () => {
  it("writes times like the doc: 9:00 AM, with a plain space", () => {
    expect(formatTime(at(day, 9, 0, ZONE), ZONE)).toBe("9:00 AM");
    expect(formatTime(at(day, 12, 0, ZONE), ZONE)).toBe("12:00 PM");
    expect(formatTime(at(day, 15, 30, ZONE), ZONE)).toBe("3:30 PM");
  });
  it("writes a range", () => {
    expect(formatTimeRange(at(day, 9, 0, ZONE), at(day, 12, 0, ZONE), ZONE)).toBe("9:00 AM to 12:00 PM");
  });
  it("writes days", () => {
    const d = at(day, 9, 0, ZONE);
    expect(formatLongDay(d, ZONE)).toBe("Monday, November 16");
    expect(formatShortDay(d, ZONE)).toBe("Mon, Nov 16");
    expect(formatDateTile(d, ZONE)).toEqual({ month: "Nov", day: "16" });
  });
  it("reads the clock in the zone passed in", () => {
    const d = at(day, 23, 30, ZONE); // 04:30 UTC on the 17th
    expect(formatShortDay(d, ZONE)).toBe("Mon, Nov 16");
    expect(formatShortDay(d, "UTC")).toBe("Tue, Nov 17");
  });
  it("greets by the time of day in the zone", () => {
    expect(dayPartOf(at(day, 0, 0, ZONE), ZONE)).toBe("morning");
    expect(dayPartOf(at(day, 11, 59, ZONE), ZONE)).toBe("morning");
    expect(dayPartOf(at(day, 12, 0, ZONE), ZONE)).toBe("afternoon");
    expect(dayPartOf(at(day, 16, 59, ZONE), ZONE)).toBe("afternoon");
    expect(dayPartOf(at(day, 17, 0, ZONE), ZONE)).toBe("evening");
  });
});

describe("friend status words (KD-08)", () => {
  it("says each status, with the reason for a decline", () => {
    expect(friendStatusLabel({ status: "coming" })).toBe("Coming");
    expect(friendStatusLabel({ status: "responded" })).toBe("Responded");
    expect(friendStatusLabel({ status: "waiting" })).toBe("Waiting");
    expect(friendStatusLabel({ status: "cant_make_it", reason: "busy" })).toBe("Can't make it · We're busy then");
  });
  it("has the five reason chips of the doc", () => {
    expect(Object.values(enCA.reasons)).toEqual(["Maybe another time", "We're busy then", "Not feeling well", "Too far for us", "Other plans this week"]);
  });
});
