import { describe, expect, it } from "vitest";
import { homeSection, type HomeInput } from "./home";
import { MON, NOW, t } from "./test-fixtures";

const base: HomeInput = { status: "collecting", mode: "set_time", end: t(MON, 12), confirmedAt: null, inviteCount: 3, answers: [] };
const yes = { kind: "yes" as const, answeredAt: t("2026-11-13", 9) };

describe("KD-13 home sections", () => {
  it("KD-13a everyone answered", () => {
    expect(homeSection({ ...base, answers: [yes, yes, { kind: "no", answeredAt: NOW }] }, NOW)).toBe("needs_you");
  });
  it("KD-13b an availability pick", () => {
    expect(homeSection({ ...base, mode: "availability", answers: [{ kind: "pick", answeredAt: NOW }] }, NOW)).toBe("needs_you");
  });
  it("KD-13c a no after confirmation", () => {
    const confirmedAt = t("2026-11-13", 12);
    expect(homeSection({ ...base, status: "confirmed", confirmedAt, answers: [yes, { kind: "no", answeredAt: NOW }] }, NOW)).toBe("needs_you");
  });
  it("KD-13d confirmed and not over", () => {
    expect(homeSection({ ...base, status: "confirmed", confirmedAt: t("2026-11-13", 12), answers: [yes] }, NOW)).toBe("upcoming");
  });
  it("KD-13e still waiting", () => {
    expect(homeSection({ ...base, answers: [yes] }, NOW)).toBe("waiting");
  });
  it("KD-13f over", () => {
    expect(homeSection({ ...base, status: "confirmed", confirmedAt: t("2026-11-12", 9), end: t("2026-11-13", 12), answers: [yes] }, NOW)).toBeNull();
  });
  it("KD-13g cancelled", () => {
    expect(homeSection({ ...base, status: "cancelled" }, NOW)).toBeNull();
  });
  it("KD-13h a no from before confirmation", () => {
    const confirmedAt = t("2026-11-13", 12);
    const earlyNo = { kind: "no" as const, answeredAt: t("2026-11-13", 10) };
    expect(homeSection({ ...base, status: "confirmed", confirmedAt, answers: [yes, earlyNo] }, NOW)).toBe("upcoming");
  });
});
