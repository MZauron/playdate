import { describe, expect, it } from "vitest";
import { checkLink, linkExpiresAt } from "./links";
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
