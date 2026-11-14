import { describe, expect, it } from "vitest";
import { checkConfirm, type ConfirmInput } from "./confirm";
import { MON, ZONE, range } from "./test-fixtures";
import type { Decision } from "./types";

const codes = (d: Decision<unknown>) => d.errors.map((e) => e.code);
const setTime: ConfirmInput = { status: "collecting", mode: "set_time", setTime: range(MON, [10, 0], [12, 0]), answers: [], slots: [], zone: ZONE };
const availability: ConfirmInput = {
  status: "collecting",
  mode: "availability",
  setTime: null,
  answers: [{ kind: "pick", pick: range(MON, [9, 0], [10, 0]) }],
  slots: [{ day: MON, slot: "morning" }],
  zone: ZONE,
};

describe("KD-09 confirm", () => {
  it("KD-09a no yes yet", () => {
    expect(codes(checkConfirm({ ...setTime, answers: [{ kind: "no", pick: null }] }))).toEqual(["CONFIRM_NEEDS_YES"]);
  });
  it("KD-09b one yes confirms the set time", () => {
    const d = checkConfirm({ ...setTime, answers: [{ kind: "yes", pick: null }] });
    expect(d.ok && d.value).toEqual(range(MON, [10, 0], [12, 0]));
  });
  it("KD-09c availability with nothing chosen", () => {
    expect(codes(checkConfirm(availability))).toEqual(["CONFIRM_NEEDS_TIME"]);
  });
  it("KD-09d a friend's pick", () => {
    const d = checkConfirm({ ...availability, chosen: range(MON, [9, 0], [10, 0]) });
    expect(d.ok && d.value).toEqual(range(MON, [9, 0], [10, 0]));
  });
  it("KD-09e the organizer's own range inside a free slot", () => {
    const d = checkConfirm({ ...availability, slots: [{ day: MON, slot: "afternoon" }], chosen: range(MON, [13, 0], [14, 30]) });
    expect(d.ok).toBe(true);
  });
  it("KD-09f the organizer's own range outside the free slots", () => {
    expect(codes(checkConfirm({ ...availability, chosen: range(MON, [13, 0], [14, 0]) }))).toEqual(["PICK_OUTSIDE_FREE_SLOT"]);
  });
  it("KD-09g cancelled", () => {
    expect(codes(checkConfirm({ ...setTime, status: "cancelled", answers: [{ kind: "yes", pick: null }] }))).toEqual(["PLAYDATE_CANCELLED"]);
  });
});
