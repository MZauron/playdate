// Rename and remove a saved place (T30) with an in-memory store: the owner's own places only, a clean name, no duplicate names.
import { describe, expect, it } from "vitest";
import { removeSavedPlace, renameSavedPlace, type SavedPlaceStore } from "./saved-places";

const HOME = "11111111-1111-4111-8111-111111111111";
const PARK = "22222222-2222-4222-8222-222222222222";

function store() {
  const rows = new Map([
    [HOME, { owner: "alex", name: "Home" }],
    [PARK, { owner: "alex", name: "The park" }],
  ]);
  const s: SavedPlaceStore = {
    async rename(owner, id, name) {
      const row = rows.get(id);
      if (!row || row.owner !== owner) return "missing";
      if ([...rows].some(([other, r]) => other !== id && r.owner === owner && r.name.toLowerCase() === name.toLowerCase())) return "taken";
      row.name = name;
      return "ok";
    },
    async remove(owner, id) {
      const row = rows.get(id);
      return !!row && row.owner === owner && rows.delete(id);
    },
  };
  return { rows, s };
}

describe("renameSavedPlace", () => {
  it("renames the owner's place, tidying the spaces", async () => {
    const { rows, s } = store();
    expect(await renameSavedPlace(s, "alex", HOME, "  Our   house ")).toEqual({ ok: true });
    expect(rows.get(HOME)?.name).toBe("Our house");
  });
  it("refuses an empty, too long or already used name", async () => {
    const { s } = store();
    expect(await renameSavedPlace(s, "alex", HOME, "   ")).toEqual({ ok: false, code: "NAME_REQUIRED" });
    expect(await renameSavedPlace(s, "alex", HOME, "x".repeat(81))).toEqual({ ok: false, code: "NAME_TOO_LONG" });
    expect(await renameSavedPlace(s, "alex", HOME, "the PARK")).toEqual({ ok: false, code: "NAME_TAKEN" });
  });
  it("finds nothing for another parent's place, a malformed id or a non-text name", async () => {
    const { rows, s } = store();
    expect(await renameSavedPlace(s, "sam", HOME, "Mine")).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await renameSavedPlace(s, "alex", "not-an-id", "Mine")).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await renameSavedPlace(s, "alex", HOME, 42)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(rows.get(HOME)?.name).toBe("Home");
  });
});

describe("removeSavedPlace", () => {
  it("removes the owner's place only", async () => {
    const { rows, s } = store();
    expect(await removeSavedPlace(s, "sam", HOME)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(rows.has(HOME)).toBe(true);
    expect(await removeSavedPlace(s, "alex", HOME)).toEqual({ ok: true });
    expect(rows.has(HOME)).toBe(false);
    expect(await removeSavedPlace(s, "alex", "../x")).toEqual({ ok: false, code: "NOT_FOUND" });
  });
});
