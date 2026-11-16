import { describe, expect, it } from "vitest";
import { homeSortKey, homeStatus, type HomeInput } from "./home";
import { MON, NOW, t } from "./test-fixtures";

const base: HomeInput = { status: "collecting", mode: "set_time", end: t(MON, 12), confirmedAt: null, inviteCount: 3, answers: [] };
const yes = { kind: "yes" as const, answeredAt: t("2026-11-13", 9) };

describe("KD-13 Home as one list", () => {
  it("KD-13a everyone answered", () => {
    expect(homeStatus({ ...base, answers: [yes, yes, { kind: "no", answeredAt: NOW }] }, NOW)).toEqual({ kind: "needs_you", why: "all_answered" });
  });
  it("KD-13b an availability pick", () => {
    expect(homeStatus({ ...base, mode: "availability", answers: [{ kind: "pick", answeredAt: NOW }] }, NOW)).toEqual({ kind: "needs_you", why: "times_picked" });
  });
  it("KD-13c a no after confirmation", () => {
    const confirmedAt = t("2026-11-13", 12);
    expect(homeStatus({ ...base, status: "confirmed", confirmedAt, answers: [yes, { kind: "no", answeredAt: NOW }] }, NOW)).toEqual({
      kind: "needs_you",
      why: "changed_to_no",
    });
  });
  it("KD-13d confirmed and not over", () => {
    expect(homeStatus({ ...base, status: "confirmed", confirmedAt: t("2026-11-13", 12), answers: [yes] }, NOW)).toEqual({ kind: "upcoming" });
  });
  it("KD-13e still waiting", () => {
    expect(homeStatus({ ...base, answers: [yes] }, NOW)).toEqual({ kind: "waiting" });
  });
  it("KD-13f over", () => {
    expect(homeStatus({ ...base, status: "confirmed", confirmedAt: t("2026-11-12", 9), end: t("2026-11-13", 12), answers: [yes] }, NOW)).toBeNull();
  });
  it("KD-13g cancelled", () => {
    expect(homeStatus({ ...base, status: "cancelled" }, NOW)).toBeNull();
  });
  it("KD-13h a no from before confirmation", () => {
    const confirmedAt = t("2026-11-13", 12);
    const earlyNo = { kind: "no" as const, answeredAt: t("2026-11-13", 10) };
    expect(homeStatus({ ...base, status: "confirmed", confirmedAt, answers: [yes, earlyNo] }, NOW)).toEqual({ kind: "upcoming" });
  });
  it("KD-13i soonest first: by start, else by the last free time, else last", () => {
    const items = [
      { id: "tue", start: t("2026-11-17", 10), end: t("2026-11-17", 12) },
      { id: "nothing", start: null, end: null },
      { id: "availability-until-sun", start: null, end: t("2026-11-15", 19) },
      { id: "mon", start: t(MON, 9), end: t(MON, 11) },
    ];
    expect([...items].sort((a, b) => homeSortKey(a) - homeSortKey(b)).map((i) => i.id)).toEqual(["availability-until-sun", "mon", "tue", "nothing"]);
  });
});
