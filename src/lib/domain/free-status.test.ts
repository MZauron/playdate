import { describe, expect, it, vi } from "vitest";
import { at } from "@/lib/rules/time";
import { clearFree, freeByFriend, setFree, type FreeStore } from "./free-status";

const MIA = "11111111-1111-4111-8111-111111111111";
const NOW = at("2026-11-14", 10, 0, "America/Toronto"); // Saturday morning
const open = { hit: () => ({ ok: true as const }) };
const store = (owns = true) => ({ set: vi.fn<FreeStore["set"]>().mockResolvedValue(owns), clear: vi.fn<FreeStore["clear"]>().mockResolvedValue(true) });

describe("setFree (T45, KD-19)", () => {
  it("stores the status the rules decide, for the signed-in parent", async () => {
    const s = store();
    expect(await setFree({ store: s, limiter: open }, "p1", { childId: MIA, when: "this_afternoon", zone: "America/Toronto" }, NOW)).toEqual({ ok: true });
    expect(s.set).toHaveBeenCalledWith("p1", MIA, { kind: "this_afternoon", words: null, until: at("2026-11-14", 17, 0, "America/Toronto") });
  });

  it("reads the times on the parent's own clock, and on the default zone when the one sent isn't real", async () => {
    const s = store();
    await setFree({ store: s, limiter: open }, "p1", { childId: MIA, when: "this_afternoon", zone: "America/Vancouver" }, NOW);
    expect(s.set.mock.calls[0]![2].until).toEqual(at("2026-11-14", 17, 0, "America/Vancouver"));
    await setFree({ store: s, limiter: open }, "p1", { childId: MIA, when: "this_afternoon", zone: "Mars/Olympus" }, NOW);
    expect(s.set.mock.calls[1]![2].until).toEqual(at("2026-11-14", 17, 0, "America/Toronto"));
  });

  it("tidies own words, and refuses ones that are too long, times that have passed and malformed input", async () => {
    const s = store();
    await setFree({ store: s, limiter: open }, "p1", { childId: MIA, when: "own_words", words: "  after   school " }, NOW);
    expect(s.set.mock.calls[0]![2]).toMatchObject({ kind: "own_words", words: "after school" });
    expect(await setFree({ store: s, limiter: open }, "p1", { childId: MIA, when: "own_words", words: "x".repeat(51) }, NOW)).toEqual({ ok: false, code: "FREE_INVALID" });
    expect(await setFree({ store: s, limiter: open }, "p1", { childId: MIA, when: "this_afternoon" }, at("2026-11-14", 16, 50, "America/Toronto"))).toEqual({ ok: false, code: "FREE_NOT_NOW" });
    expect(await setFree({ store: s, limiter: open }, "p1", { childId: "mia", when: "tomorrow" }, NOW)).toEqual({ ok: false, code: "FREE_INVALID" });
    expect(s.set).toHaveBeenCalledTimes(1);
  });

  it("says NOT_FOUND for a child that isn't the parent's, and TOO_MANY over the limit", async () => {
    expect(await setFree({ store: store(false), limiter: open }, "p1", { childId: MIA, when: "tomorrow" }, NOW)).toEqual({ ok: false, code: "NOT_FOUND" });
    const s = store();
    const closed = { hit: () => ({ ok: false as const, retryAfterSeconds: 60 }) };
    expect(await setFree({ store: s, limiter: closed }, "p1", { childId: MIA, when: "tomorrow" }, NOW)).toEqual({ ok: false, code: "TOO_MANY" });
    expect(await clearFree({ store: s, limiter: closed }, "p1", MIA)).toEqual({ ok: false, code: "TOO_MANY" });
    expect(s.set).not.toHaveBeenCalled();
  });
});

describe("clearFree", () => {
  it("turns off the parent's own child's status; anything but an id is not found", async () => {
    const s = store();
    expect(await clearFree({ store: s, limiter: open }, "p1", MIA)).toEqual({ ok: true });
    expect(s.clear).toHaveBeenCalledWith("p1", MIA);
    expect(await clearFree({ store: s, limiter: open }, "p1", "' or 1=1")).toEqual({ ok: false, code: "NOT_FOUND" });
  });
});

describe("freeByFriend", () => {
  it("groups the free children by friend, in the order given", () => {
    const until = NOW;
    const rows = [
      { friendId: "f1", childFirstName: "Arjun", kind: "tomorrow" as const, words: null, until },
      { friendId: "f2", childFirstName: "Leo", kind: "this_evening" as const, words: null, until },
      { friendId: "f1", childFirstName: "Asha", kind: "own_words" as const, words: "after school", until },
    ];
    expect([...freeByFriend(rows)].map(([id, r]) => [id, r.map((x) => x.childFirstName)])).toEqual([
      ["f1", ["Arjun", "Asha"]],
      ["f2", ["Leo"]],
    ]);
  });
});
