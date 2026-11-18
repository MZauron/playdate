import { describe, expect, it } from "vitest";
import { checkChildren, checkMessage, checkPlan, checkTime, durationMinutes, moveStart, playdateTitle } from "./plan";
import { MON, NOW, SAT, ZONE, range, t } from "./test-fixtures";
import type { Decision } from "./types";

const codes = (d: Decision<unknown>) => d.errors.map((e) => e.code);

describe("KD-02 one time mode", () => {
  it("KD-02a set_time clears leftover slots", () => {
    const d = checkTime({ mode: "set_time", start: t(MON, 10), end: t(MON, 12), slots: [{ day: MON, slot: "morning" }] }, ZONE, NOW);
    expect(d.ok && d.value).toEqual({ mode: "set_time", start: t(MON, 10), end: t(MON, 12), slots: [] });
  });
  it("KD-02b availability clears a leftover start and end", () => {
    const d = checkTime({ mode: "availability", start: t(MON, 10), end: t(MON, 12), slots: [{ day: MON, slot: "morning" }] }, ZONE, NOW);
    expect(d.ok && d.value).toEqual({ mode: "availability", start: null, end: null, slots: [{ day: MON, slot: "morning" }] });
  });
  it("KD-02c set_time without an end is NO_TIME", () => {
    expect(codes(checkTime({ mode: "set_time", start: t(MON, 10) }, ZONE, NOW))).toEqual(["NO_TIME"]);
  });
  it("KD-02d no mode is NO_TIME", () => {
    expect(codes(checkTime({ mode: null }, ZONE, NOW))).toEqual(["NO_TIME"]);
  });
  it("KD-02e availability without slots is NO_FREE_SLOTS", () => {
    expect(codes(checkTime({ mode: "availability", slots: [] }, ZONE, NOW))).toEqual(["NO_FREE_SLOTS"]);
  });
});

describe("KD-03 set time", () => {
  it("KD-03a Mon 10–12 is ok and lasts 120 minutes", () => {
    expect(checkTime({ mode: "set_time", start: t(MON, 10), end: t(MON, 12) }, ZONE, NOW).ok).toBe(true);
    expect(durationMinutes(range(MON, [10, 0], [12, 0]))).toBe(120);
  });
  it("KD-03b end equal to start", () => {
    expect(codes(checkTime({ mode: "set_time", start: t(MON, 10), end: t(MON, 10) }, ZONE, NOW))).toEqual(["END_BEFORE_START"]);
  });
  it("KD-03c end before start", () => {
    expect(codes(checkTime({ mode: "set_time", start: t(MON, 12), end: t(MON, 10) }, ZONE, NOW))).toEqual(["END_BEFORE_START"]);
  });
  it("KD-03d start before now", () => {
    expect(codes(checkTime({ mode: "set_time", start: t(SAT, 9), end: t(SAT, 11) }, ZONE, NOW))).toEqual(["IN_PAST"]);
  });
  it("KD-03e start exactly now", () => {
    expect(codes(checkTime({ mode: "set_time", start: NOW, end: t(SAT, 12) }, ZONE, NOW))).toEqual(["IN_PAST"]);
  });
  it("KD-03f moving the start keeps the length", () => {
    expect(moveStart(range(MON, [10, 0], [12, 0]), t(MON, 14))).toEqual(range(MON, [14, 0], [16, 0]));
  });
});

describe("KD-04 free slots when planning", () => {
  it("KD-04i a slot today is ok", () => {
    expect(checkTime({ mode: "availability", slots: [{ day: SAT, slot: "evening" }] }, ZONE, NOW).ok).toBe(true);
  });
  it("KD-04j a slot yesterday is IN_PAST", () => {
    expect(codes(checkTime({ mode: "availability", slots: [{ day: "2026-11-13", slot: "morning" }] }, ZONE, NOW))).toEqual(["IN_PAST"]);
  });
});

describe("KD-05 message", () => {
  it("KD-05a spaces only is MESSAGE_REQUIRED", () => {
    expect(codes(checkMessage("   \n "))).toEqual(["MESSAGE_REQUIRED"]);
  });
  it("KD-05b 1001 characters is MESSAGE_TOO_LONG", () => {
    expect(codes(checkMessage("a".repeat(1001)))).toEqual(["MESSAGE_TOO_LONG"]);
  });
  it("KD-05c the value is exactly what was typed", () => {
    const d = checkMessage("  Park at 10?  ");
    expect(d.ok && d.value).toBe("  Park at 10?  ");
  });
  it("KD-05d 1000 characters is ok", () => {
    expect(checkMessage("a".repeat(1000)).ok).toBe(true);
  });
});

describe("KD-06 invitees and title", () => {
  it("KD-06a no friends is NO_INVITEES", () => {
    const d = checkPlan({ mode: "set_time", start: t(MON, 10), end: t(MON, 12), message: "Hi", inviteeCount: 0, zone: ZONE }, NOW);
    expect(codes(d)).toEqual(["NO_INVITEES"]);
  });
  it("KD-06b two children", () => {
    expect(playdateTitle("Mia", ["Arjun"])).toBe("Playdate: Mia & Arjun");
  });
  it("KD-06c three children", () => {
    expect(playdateTitle("Mia", ["Arjun", "Lily"])).toBe("Playdate: Mia, Arjun & Lily");
  });
  it("KD-06d four children", () => {
    expect(playdateTitle("Mia", ["Arjun", "Lily", "Zoe"])).toBe("Playdate: Mia, Arjun, Lily & Zoe");
  });
  it("KD-06f the organizer's chosen children come first in the title", () => {
    expect(playdateTitle(["Mia", "Ethan"], ["Arjun"])).toBe("Playdate: Mia, Ethan & Arjun");
  });
  it("KD-06g one child: the playdate is for that child, whatever was sent", () => {
    expect(checkChildren(["c-mia"], [])).toEqual({ ok: true, errors: [], value: ["c-mia"] });
  });
  it("KD-06h several children and none chosen is NO_CHILD", () => {
    const d = checkChildren(["c-mia", "c-ethan"], []);
    expect(codes(d)).toEqual(["NO_CHILD"]);
  });
  it("KD-06i several children: the chosen ones, in the parent's order; ids that aren't theirs are ignored", () => {
    expect(checkChildren(["c-mia", "c-ethan", "c-leo"], ["c-leo", "someone-elses", "c-mia"])).toEqual({ ok: true, errors: [], value: ["c-mia", "c-leo"] });
    expect(codes(checkChildren(["c-mia", "c-ethan"], ["someone-elses"]))).toEqual(["NO_CHILD"]);
  });
  it("KD-06e every error at once", () => {
    const d = checkPlan({ mode: null, message: " ", inviteeCount: 0, zone: ZONE }, NOW);
    expect(codes(d)).toEqual(["NO_TIME", "MESSAGE_REQUIRED", "NO_INVITEES"]);
  });
});
