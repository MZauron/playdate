import { describe, expect, it } from "vitest";
import { checkLink, cleanupCutoff, linkExpiresAt } from "./links";
import { MON, WED, ZONE, t } from "./test-fixtures";

describe("KD-14 links", () => {
  it("KD-14a set time: end + 12 h", () => {
    expect(linkExpiresAt({ finalEnd: null, setEnd: t(MON, 12), slots: [], zone: ZONE })).toEqual(t("2026-11-17", 0));
  });
  it("KD-14b confirmed: final end + 12 h", () => {
    expect(linkExpiresAt({ finalEnd: t(MON, 11), setEnd: null, slots: [{ day: MON, slot: "morning" }], zone: ZONE })).toEqual(t(MON, 23));
  });
  it("KD-14c availability: last free slot + 12 h", () => {
    const slots = [{ day: MON, slot: "morning" as const }, { day: WED, slot: "evening" as const }];
    expect(linkExpiresAt({ finalEnd: null, setEnd: null, slots, zone: ZONE })).toEqual(t("2026-11-19", 7));
  });
  it("KD-14d expired at the expiry instant, open one minute before", () => {
    const expiry = t("2026-11-17", 0);
    expect(checkLink(expiry, expiry).errors).toEqual([{ code: "LINK_EXPIRED" }]);
    expect(checkLink(expiry, new Date(expiry.getTime() - 60_000)).ok).toBe(true);
  });
});

describe("T23 clean-up", () => {
  it("KD-14e: on Sat 14 Nov 10:00 the cut-off is Thu 15 Oct 23:00 daylight time (30 × 24 h back, playdates over for 30 days)", () => {
    const now = t("2026-11-14", 10, 0);
    expect(cleanupCutoff(now)).toEqual(t("2026-10-15", 23, 0));
    expect(now.getTime() - cleanupCutoff(now).getTime()).toBe((30 * 24 - 12) * 3_600_000);
    // A set-time playdate that ended Oct 15 11:00 has links until 23:00 that day: exactly 30 days over now.
    expect(linkExpiresAt({ finalEnd: null, setEnd: t("2026-10-15", 11, 0), slots: [], zone: ZONE })).toEqual(cleanupCutoff(now));
  });
});
