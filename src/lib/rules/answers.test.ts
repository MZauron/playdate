import { describe, expect, it } from "vitest";
import { answeredCount, checkAnswer, checkPick, friendStatus, type AnswerTarget } from "./answers";
import { homeStatus } from "./home";
import { MON, NOW, WED, ZONE, range, t } from "./test-fixtures";
import { slotRange } from "./time";
import type { Decision, FreeSlot } from "./types";

const codes = (d: Decision<unknown>) => d.errors.map((e) => e.code);
const fields = (d: Decision<unknown>) => d.errors.map((e) => e.field);
const monMorning: FreeSlot[] = [{ day: MON, slot: "morning" }];

const setTime: AnswerTarget = {
  status: "collecting",
  mode: "set_time",
  timeVersion: 1,
  startsAt: t(MON, 10),
  linkExpiresAt: t("2026-11-17", 0),
  slots: [],
  zone: ZONE,
};
const availability: AnswerTarget = { ...setTime, mode: "availability", startsAt: null, slots: monMorning };

describe("KD-01 nothing confirms itself", () => {
  it("KD-01a every yes leaves the playdate collecting and under Needs you", () => {
    const d = checkAnswer(setTime, { kind: "yes", timeVersion: 1 }, NOW);
    expect(d.ok && Object.keys(d.value)).not.toContain("status");
    const answers = [1, 2, 3].map(() => ({ kind: "yes" as const, answeredAt: NOW }));
    expect(homeStatus({ status: "collecting", mode: "set_time", end: t(MON, 12), confirmedAt: null, inviteCount: 3, answers }, NOW)).toEqual({ kind: "needs_you", why: "all_answered" });
  });
});

describe("KD-04 picks", () => {
  it("KD-04a inside the slot", () => {
    expect(checkPick(range(MON, [9, 30], [11, 0]), monMorning, ZONE).ok).toBe(true);
  });
  it("KD-04b the whole slot", () => {
    expect(checkPick(range(MON, [9, 0], [12, 0]), monMorning, ZONE).ok).toBe(true);
  });
  it("KD-04c across two slots", () => {
    const slots: FreeSlot[] = [...monMorning, { day: MON, slot: "afternoon" }];
    expect(codes(checkPick(range(MON, [11, 0], [13, 30]), slots, ZONE))).toEqual(["PICK_OUTSIDE_FREE_SLOT"]);
  });
  it("KD-04d across two touching slots", () => {
    const slots: FreeSlot[] = [{ day: MON, slot: "afternoon" }, { day: MON, slot: "evening" }];
    expect(codes(checkPick(range(MON, [15, 30], [16, 30]), slots, ZONE))).toEqual(["PICK_OUTSIDE_FREE_SLOT"]);
  });
  it("KD-04e a day with no free slot", () => {
    expect(codes(checkPick(range(WED, [9, 0], [10, 0]), monMorning, ZONE))).toEqual(["PICK_OUTSIDE_FREE_SLOT"]);
  });
  it("KD-04f off the half hour", () => {
    expect(codes(checkPick(range(MON, [9, 15], [10, 15]), monMorning, ZONE))).toEqual(["PICK_NOT_HALF_HOUR"]);
  });
  it("KD-04g zero length", () => {
    expect(codes(checkPick(range(MON, [9, 0], [9, 0]), monMorning, ZONE))).toEqual(["PICK_TOO_SHORT"]);
  });
  it("KD-04h exactly 30 minutes", () => {
    expect(checkPick(range(MON, [9, 0], [9, 30]), monMorning, ZONE).ok).toBe(true);
  });
  it("KD-04k half hours on the playdate's own clock (UTC+5:30)", () => {
    const kolkata = "Asia/Kolkata";
    expect(checkPick(range(MON, [9, 30], [10, 0], kolkata), monMorning, kolkata).ok).toBe(true);
  });
  it("KD-04l Mon morning in Toronto is 14:00Z–17:00Z", () => {
    const r = slotRange(MON, "morning", ZONE);
    expect([r.start.toISOString(), r.end.toISOString()]).toEqual(["2026-11-16T14:00:00.000Z", "2026-11-16T17:00:00.000Z"]);
  });
});

describe("KD-07 answers", () => {
  it("KD-07a yes", () => {
    expect(checkAnswer(setTime, { kind: "yes", timeVersion: 1 }, NOW).ok).toBe(true);
  });
  it("KD-07b no with a reason and a note", () => {
    const d = checkAnswer(setTime, { kind: "no", reason: "busy", note: "Sorry!", timeVersion: 1 }, NOW);
    expect(d.ok && d.value).toEqual({ kind: "no", reason: "busy", note: "Sorry!", pick: null });
  });
  it("KD-07c no without a reason", () => {
    const d = checkAnswer(setTime, { kind: "no", timeVersion: 1 }, NOW);
    expect([codes(d), fields(d)]).toEqual([["INVALID_ANSWER"], ["reason"]]);
  });
  it("KD-07d yes with a note", () => {
    const d = checkAnswer(setTime, { kind: "yes", note: "See you", timeVersion: 1 }, NOW);
    expect([codes(d), fields(d)]).toEqual([["INVALID_ANSWER"], ["note"]]);
  });
  it("KD-07e a note of 281 characters", () => {
    const d = checkAnswer(setTime, { kind: "no", reason: "busy", note: "a".repeat(281), timeVersion: 1 }, NOW);
    expect([codes(d), fields(d)]).toEqual([["INVALID_ANSWER"], ["note"]]);
  });
  it("KD-07f a pick on a set-time playdate", () => {
    const d = checkAnswer(setTime, { kind: "pick", pick: range(MON, [10, 0], [11, 0]), timeVersion: 1 }, NOW);
    expect([codes(d), fields(d)]).toEqual([["INVALID_ANSWER"], ["kind"]]);
  });
  it("KD-07g yes on an availability playdate", () => {
    const d = checkAnswer(availability, { kind: "yes", timeVersion: 1 }, NOW);
    expect([codes(d), fields(d)]).toEqual([["INVALID_ANSWER"], ["kind"]]);
  });
  it("KD-07h a pick inside, then outside, the free slots", () => {
    expect(checkAnswer(availability, { kind: "pick", pick: range(MON, [9, 0], [10, 0]), timeVersion: 1 }, NOW).ok).toBe(true);
    expect(codes(checkAnswer(availability, { kind: "pick", pick: range(WED, [9, 0], [10, 0]), timeVersion: 1 }, NOW))).toEqual([
      "PICK_OUTSIDE_FREE_SLOT",
    ]);
  });
  it("KD-07i once the playdate starts", () => {
    expect(codes(checkAnswer(setTime, { kind: "yes", timeVersion: 1 }, t(MON, 10)))).toEqual(["PLAYDATE_STARTED"]);
  });
  it("KD-07j cancelled", () => {
    expect(codes(checkAnswer({ ...setTime, status: "cancelled" }, { kind: "yes", timeVersion: 1 }, NOW))).toEqual(["PLAYDATE_CANCELLED"]);
  });
  it("KD-07k link expired", () => {
    expect(codes(checkAnswer(setTime, { kind: "yes", timeVersion: 1 }, t("2026-11-17", 0)))).toEqual(["LINK_EXPIRED"]);
  });
  it("KD-07l an answer for an old time version", () => {
    expect(codes(checkAnswer({ ...setTime, timeVersion: 2 }, { kind: "yes", timeVersion: 1 }, NOW))).toEqual(["STALE_TIME"]);
  });
  it("KD-07m a change to no after confirmation is accepted", () => {
    expect(checkAnswer({ ...setTime, status: "confirmed" }, { kind: "no", reason: "not_feeling_well", timeVersion: 1 }, NOW).ok).toBe(true);
  });
  it("KD-07n a confirmed availability playdate starts at its final start", () => {
    const confirmed = { ...availability, status: "confirmed" as const, startsAt: t(MON, 9) };
    expect(codes(checkAnswer(confirmed, { kind: "no", reason: "busy", timeVersion: 1 }, t(MON, 9)))).toEqual(["PLAYDATE_STARTED"]);
  });
  it("KD-07o a note of spaces only is stored as empty", () => {
    const d = checkAnswer(setTime, { kind: "no", reason: "busy", note: "   ", timeVersion: 1 }, NOW);
    expect(d.ok && d.value.note).toBeNull();
  });
});

describe("KD-08 status per friend", () => {
  it("KD-08a one status line per answer", () => {
    expect(friendStatus({ kind: "yes", reason: null })).toEqual({ status: "coming" });
    expect(friendStatus({ kind: "pick", reason: null })).toEqual({ status: "responded" });
    expect(friendStatus({ kind: "no", reason: "busy" })).toEqual({ status: "cant_make_it", reason: "busy" });
    expect(friendStatus(null)).toEqual({ status: "waiting" });
  });
  it("KD-08b 2 of 3 answered", () => {
    expect(answeredCount(3, 2)).toEqual({ answered: 2, total: 3 });
  });
});
