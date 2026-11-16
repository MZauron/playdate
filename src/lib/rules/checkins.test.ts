import { describe, expect, it } from "vitest";
import { checkCheckIn, type CheckInTarget } from "./checkins";
import { MON, range, t } from "./test-fixtures";

// A playdate confirmed for Mon 10:00–12:00: check-ins open Mon 9:30 and close Mon 13:00.
const confirmed: CheckInTarget = { status: "confirmed", finalStart: t(MON, 10), finalEnd: t(MON, 12) };
const organizer = { organizer: true as const };
const yes = { organizer: false as const, answer: { kind: "yes" as const } };
const codes = (d: ReturnType<typeof checkCheckIn>) => (d.ok ? d.value : d.errors.map((e) => e.code));

describe("KD-18 check-ins", () => {
  it("KD-18a the organizer, 30 minutes before the start", () => {
    expect(codes(checkCheckIn(confirmed, organizer, { kind: "here" }, t(MON, 9, 30)))).toEqual({ kind: "here", note: null });
  });
  it("KD-18b 31 minutes before the start", () => {
    expect(codes(checkCheckIn(confirmed, organizer, { kind: "here" }, t(MON, 9, 29)))).toEqual(["CHECKIN_CLOSED"]);
  });
  it("KD-18c 59 minutes after the end, then 60", () => {
    expect(codes(checkCheckIn(confirmed, organizer, { kind: "heading_home" }, t(MON, 12, 59)))).toEqual({ kind: "heading_home", note: null });
    expect(codes(checkCheckIn(confirmed, organizer, { kind: "heading_home" }, t(MON, 13)))).toEqual(["CHECKIN_CLOSED"]);
  });
  it("KD-18d not confirmed yet", () => {
    expect(codes(checkCheckIn({ status: "collecting", finalStart: null, finalEnd: null }, organizer, { kind: "here" }, t(MON, 10)))).toEqual(["CHECKIN_CLOSED"]);
  });
  it("KD-18e cancelled", () => {
    expect(codes(checkCheckIn({ ...confirmed, status: "cancelled" }, organizer, { kind: "here" }, t(MON, 10)))).toEqual(["CHECKIN_CLOSED"]);
  });
  it("KD-18f a friend who said yes", () => {
    expect(codes(checkCheckIn(confirmed, yes, { kind: "late", note: "  ten   minutes " }, t(MON, 10)))).toEqual({ kind: "late", note: "ten minutes" });
  });
  it("KD-18g a friend who can't make it, or hasn't answered", () => {
    const no = { organizer: false as const, answer: { kind: "no" as const } };
    expect(codes(checkCheckIn(confirmed, no, { kind: "here" }, t(MON, 10)))).toEqual(["CHECKIN_NOT_COMING"]);
    expect(codes(checkCheckIn(confirmed, { organizer: false, answer: null }, { kind: "here" }, t(MON, 10)))).toEqual(["CHECKIN_NOT_COMING"]);
  });
  it("KD-18h availability: a pick that overlaps the confirmed time, and one that doesn't", () => {
    const overlapping = { organizer: false as const, answer: { kind: "pick" as const, pick: range(MON, [11, 0], [12, 30]) } };
    const elsewhere = { organizer: false as const, answer: { kind: "pick" as const, pick: range(MON, [12, 0], [13, 0]) } };
    expect(codes(checkCheckIn(confirmed, overlapping, { kind: "all_good" }, t(MON, 10)))).toEqual({ kind: "all_good", note: null });
    expect(codes(checkCheckIn(confirmed, elsewhere, { kind: "all_good" }, t(MON, 10)))).toEqual(["CHECKIN_NOT_COMING"]);
  });
  it("KD-18i a note of 80 characters, 81, and a blank one", () => {
    expect(codes(checkCheckIn(confirmed, yes, { kind: "here", note: "x".repeat(80) }, t(MON, 10)))).toEqual({ kind: "here", note: "x".repeat(80) });
    expect(codes(checkCheckIn(confirmed, yes, { kind: "here", note: "x".repeat(81) }, t(MON, 10)))).toEqual(["CHECKIN_INVALID"]);
    expect(codes(checkCheckIn(confirmed, yes, { kind: "here", note: "   " }, t(MON, 10)))).toEqual({ kind: "here", note: null });
  });
  it("KD-18j a check-in that isn't one of the four", () => {
    expect(codes(checkCheckIn(confirmed, organizer, { kind: "photo" }, t(MON, 10)))).toEqual(["CHECKIN_INVALID"]);
  });
});
