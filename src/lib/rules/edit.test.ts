import { describe, expect, it } from "vitest";
import { checkAnswer } from "./answers";
import { planEdit, type EditState } from "./edit";
import { MON, NOW, WED, ZONE, t } from "./test-fixtures";

const before: EditState = {
  time: { mode: "set_time", start: t(MON, 10), end: t(MON, 12), slots: [] },
  place: { name: "Riverdale Park", address: "550 Broadview Ave", providerPlaceId: null },
  message: "Park after school?",
  friendIds: ["F1", "F2"],
};
const confirmed = { status: "confirmed" as const, timeVersion: 1 };

describe("KD-10 edit", () => {
  it("KD-10a a new start is a time change", () => {
    const plan = planEdit(confirmed, before, { ...before, time: { ...before.time, start: t(MON, 14), end: t(MON, 16) } });
    expect(plan).toMatchObject({
      changed: true,
      timeChanged: true,
      timeVersion: 2,
      deleteAllAnswers: true,
      clearFinalTime: true,
      status: "collecting",
      existingInviteLabel: "new_time",
    });
  });
  it("KD-10b switching mode is a time change", () => {
    const after: EditState = { ...before, time: { mode: "availability", start: null, end: null, slots: [{ day: MON, slot: "morning" }] } };
    expect(planEdit(confirmed, before, after).timeChanged).toBe(true);
  });
  it("KD-10c adding a slot is a time change", () => {
    const avail: EditState = { ...before, time: { mode: "availability", start: null, end: null, slots: [{ day: MON, slot: "morning" }] } };
    const after: EditState = { ...avail, time: { ...avail.time, slots: [...avail.time.slots, { day: WED, slot: "evening" }] } };
    expect(planEdit({ status: "collecting", timeVersion: 1 }, avail, after).timeChanged).toBe(true);
  });
  it("KD-10d a new message keeps it confirmed", () => {
    expect(planEdit(confirmed, before, { ...before, message: "Bring snacks?" })).toMatchObject({
      changed: true,
      timeChanged: false,
      timeVersion: 1,
      status: "confirmed",
      deleteAllAnswers: false,
      clearFinalTime: false,
      existingInviteLabel: "updated",
    });
  });
  it("KD-10e a new place is an update", () => {
    const plan = planEdit(confirmed, before, { ...before, place: { name: "Library", address: "1 Main St", providerPlaceId: null } });
    expect([plan.timeChanged, plan.existingInviteLabel]).toEqual([false, "updated"]);
  });
  it("KD-10f friends added and removed", () => {
    expect(planEdit(confirmed, before, { ...before, friendIds: ["F1", "F3"] })).toMatchObject({
      addFriendIds: ["F3"],
      removeFriendIds: ["F2"],
      existingInviteLabel: "updated",
      status: "confirmed",
    });
  });
  it("KD-10g nothing changed", () => {
    expect(planEdit(confirmed, before, { ...before })).toMatchObject({ changed: false, existingInviteLabel: null, timeVersion: 1 });
  });
  it("KD-10h an answer from before the time change is STALE_TIME", () => {
    const plan = planEdit(confirmed, before, { ...before, time: { ...before.time, start: t(MON, 14), end: t(MON, 16) } });
    const target = {
      status: plan.status,
      mode: "set_time" as const,
      timeVersion: plan.timeVersion,
      startsAt: t(MON, 14),
      linkExpiresAt: t("2026-11-17", 4),
      slots: [],
      zone: ZONE,
    };
    expect(checkAnswer(target, { kind: "yes", timeVersion: 1 }, NOW).errors).toEqual([{ code: "STALE_TIME" }]);
  });
  it("KD-10i the same slots in another order", () => {
    const a: EditState = { ...before, time: { mode: "availability", start: null, end: null, slots: [{ day: MON, slot: "morning" }, { day: WED, slot: "evening" }] } };
    const b: EditState = { ...a, time: { ...a.time, slots: [{ day: WED, slot: "evening" }, { day: MON, slot: "morning" }] } };
    expect(planEdit(confirmed, a, b).timeChanged).toBe(false);
  });
});
