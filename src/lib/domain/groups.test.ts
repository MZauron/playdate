// Groups (T19) through the service with an in-memory store, and "Plan again: same place, next week".
import { describe, expect, it } from "vitest";
import { at } from "@/lib/rules/time";
import { deleteGroup, parseGroupForm, planAgainValues, removeMember, saveGroup, type GroupStore } from "./groups";

const ALEX = "11111111-1111-4111-8111-111111111111";
const DEV = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MAYA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SAMS_FRIEND = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const GROUP = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function world() {
  const groups = new Map<string, { name: string; members: string[] }>();
  const store: GroupStore = {
    ownFriendIds: async (_owner, ids) => ids.filter((id) => id === DEV || id === MAYA),
    saveGroup: async (_owner, id, name, members) => {
      if (id && !groups.has(id)) return null;
      const gid = id ?? GROUP;
      groups.set(gid, { name, members: [...members] });
      return gid;
    },
    removeMember: async (_owner, gid, fid) => {
      const g = groups.get(gid);
      if (!g?.members.includes(fid)) return false;
      g.members = g.members.filter((m) => m !== fid);
      return true;
    },
    deleteGroup: async (_owner, gid) => groups.delete(gid),
  };
  return { store, groups };
}

describe("saveGroup", () => {
  it("creates a group of the owner's own friends; another parent's friend is left out", async () => {
    const { store, groups } = world();
    expect(await saveGroup(store, ALEX, null, { name: " Dance friends ", friendIds: [DEV, MAYA, SAMS_FRIEND, DEV] })).toEqual({ ok: true, groupId: GROUP });
    expect(groups.get(GROUP)).toEqual({ name: "Dance friends", members: [DEV, MAYA] });
  });
  it("needs a name of 1–40 characters and at least one of the owner's friends", async () => {
    const { store, groups } = world();
    expect(await saveGroup(store, ALEX, null, { name: " ", friendIds: [DEV] })).toEqual({ ok: false, code: "NAME_REQUIRED", field: "name" });
    expect(await saveGroup(store, ALEX, null, { name: "x".repeat(41), friendIds: [DEV] })).toMatchObject({ ok: false, code: "NAME_REQUIRED" });
    expect(await saveGroup(store, ALEX, null, { name: "Dance", friendIds: [SAMS_FRIEND, "not-an-id"] })).toEqual({ ok: false, code: "NO_MEMBERS", field: "members" });
    expect(groups.size).toBe(0);
  });
  it("Edit renames and replaces the members of the owner's group; an unknown or malformed group is not found", async () => {
    const { store, groups } = world();
    await saveGroup(store, ALEX, null, { name: "Dance", friendIds: [DEV, MAYA] });
    expect(await saveGroup(store, ALEX, GROUP, { name: "Ballet", friendIds: [MAYA] })).toEqual({ ok: true, groupId: GROUP });
    expect(groups.get(GROUP)).toEqual({ name: "Ballet", members: [MAYA] });
    expect(await saveGroup(store, ALEX, "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", { name: "x", friendIds: [DEV] })).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await saveGroup(store, ALEX, "nope", { name: "x", friendIds: [DEV] })).toEqual({ ok: false, code: "NOT_FOUND" });
  });
  it("Remove takes one family out of the group (they stay a friend); Delete removes the group", async () => {
    const { store, groups } = world();
    await saveGroup(store, ALEX, null, { name: "Dance", friendIds: [DEV, MAYA] });
    expect(await removeMember(store, ALEX, GROUP, MAYA)).toEqual({ ok: true });
    expect(groups.get(GROUP)?.members).toEqual([DEV]);
    expect(await removeMember(store, ALEX, "x", MAYA)).toEqual({ ok: false });
    expect(await deleteGroup(store, ALEX, GROUP)).toEqual({ ok: true });
    expect(groups.size).toBe(0);
  });
  it("reads only the name and the ticked friends from the form", () => {
    const f = new FormData();
    for (const [k, v] of [["name", "Dance"], ["friendId", DEV], ["friendId", MAYA], ["ownerId", "someone"]]) f.append(k!, v!);
    expect(parseGroupForm(f)).toEqual({ name: "Dance", friendIds: [DEV, MAYA] });
  });
});

describe("planAgainValues (Plan again: same place, next week)", () => {
  const ZONE = "America/Toronto";
  const last = { id: "p", title: "Playdate", mode: "set_time" as const, timezone: ZONE, start: at("2026-11-16", 10, 0, ZONE), end: at("2026-11-16", 12, 0, ZONE), placeName: "High Park", placeAddress: "1873 Bloor St W" };
  it("keeps the place and the clock times, one week later", () => {
    expect(planAgainValues(last)).toEqual({ day: "2026-11-23", start: "10:00", end: "12:00", placeName: "High Park", placeAddress: "1873 Bloor St W" });
  });
  it("keeps the wall-clock time across the clock change", () => {
    expect(planAgainValues({ ...last, start: at("2026-10-31", 10, 0, ZONE), end: at("2026-10-31", 12, 0, ZONE) })).toMatchObject({ day: "2026-11-07", start: "10:00", end: "12:00" });
  });
  it("uses a confirmed availability playdate's final time, and only the place when there was no time", () => {
    expect(planAgainValues({ ...last, mode: "availability" })).toMatchObject({ day: "2026-11-23", start: "10:00" });
    expect(planAgainValues({ ...last, mode: "availability", start: null, end: null })).toEqual({ day: "", start: "", end: "", placeName: "High Park", placeAddress: "1873 Bloor St W" });
  });
});
