// Send update through the service with in-memory stores: each KD-10 branch (docs/rules.test-cases.md KD-10a…i), the update texts
// (Q19 default), and that only the organizer's own playdate and friends are touched.
import { fakePlaces } from "@/lib/integrations/places/fake";
import { describe, expect, it } from "vitest";
import { at } from "@/lib/rules/time";
import { editFormValues, sendUpdate, type PlaydateUpdate, type UpdateDeps } from "./edit-playdate";
import { hashToken } from "./invite-token";
import type { OrganizerInvite, OrganizerPlaydate, PlaydatePageStore } from "./playdate-page";
import type { InviteeFriend, PlanFormInput, PlaydateStore } from "./playdates";

const ZONE = "America/Toronto";
const NOW = at("2026-11-14", 10, 0, ZONE);
const ALEX = "11111111-1111-4111-8111-111111111111";
const SAM = "22222222-2222-4222-8222-222222222222";
const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const F1 = "f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1";
const F2 = "f2f2f2f2-f2f2-4f2f-8f2f-f2f2f2f2f2f2";
const F3 = "f3f3f3f3-f3f3-4f3f-8f3f-f3f3f3f3f3f3";
const organizer = { id: ALEX, firstName: "Alex", childFirstName: "Mia" };

const friend = (id: string, parentName: string, child: string): InviteeFriend & { ownerId: string } => ({
  ownerId: ALEX,
  id,
  parentName,
  childFirstName: child,
  label: `${child}'s parent`,
  kindredUserId: null,
});
const FRIENDS = [friend(F1, "Dev Patel", "Arjun"), friend(F2, "Maya Chen", "Lily"), friend(F3, "Sam Lee", "Zoe")];
const invite = (f: (typeof FRIENDS)[number], answer: OrganizerInvite["answer"] = null): OrganizerInvite => ({
  id: `invite-${f.id}`,
  friendId: f.id,
  parentName: f.parentName,
  label: f.label,
  channel: "text",
  answer,
});
const yes = { kind: "yes" as const, reason: null, note: null, answeredAt: NOW };

function playdate(patch: Partial<OrganizerPlaydate> = {}): OrganizerPlaydate {
  return {
    id: ID,
    title: "Playdate: Mia, Arjun & Lily",
    mode: "set_time",
    status: "confirmed",
    timezone: ZONE,
    startAt: at("2026-11-16", 10, 0, ZONE),
    endAt: at("2026-11-16", 12, 0, ZONE),
    finalStartAt: at("2026-11-16", 10, 0, ZONE),
    finalEndAt: at("2026-11-16", 12, 0, ZONE),
    confirmedAt: NOW,
    placeName: "High Park",
    placeAddress: null,
    searchedPlace: null,
    message: "Park?",
    timeVersion: 1,
    slots: [],
    invites: [invite(FRIENDS[0]!, yes), invite(FRIENDS[1]!)],
    ...patch,
  };
}

function world(p: OrganizerPlaydate = playdate()) {
  const applied: PlaydateUpdate[] = [];
  const tokens: string[] = [];
  const pages: PlaydatePageStore = { getForOrganizer: async (o, id) => (o === ALEX && id === p.id ? p : null), confirm: async () => false, cancel: async () => false };
  const playdates: PlaydateStore = {
    friendsForInvite: async (o, ids) => FRIENDS.filter((f) => f.ownerId === o && ids.includes(f.id)),
    createPlaydate: async () => "unused",
    saveTypedPlace: async () => {},
    setFirstName: async () => {},
  };
  let n = 0;
  const deps: UpdateDeps = {
    pages,
    playdates,
    apply: async (_o, _id, u) => void applied.push(u),
    limiter: { hit: () => ({ ok: true }) },
    linkBase: "https://kindred.test",
    places: fakePlaces,
    newToken: () => {
      const token = `new-token-${++n}-abcdefgh`.slice(0, 22);
      tokens.push(token);
      return { token, tokenHash: hashToken(token) };
    },
  };
  return { deps, applied, tokens };
}

/** The form as Edit playdate fills it in for `playdate()`, with changes on top. */
const form = (patch: Partial<PlanFormInput> = {}): PlanFormInput => ({
  friendIds: [F1, F2],
  mode: "set_time",
  day: "2026-11-16",
  startTime: "10:00",
  endTime: "12:00",
  slots: [],
  zone: "Asia/Tokyo", // the browser's zone is ignored: an edit keeps the playdate's (KD-16)
  placeName: "High Park",
  placeAddress: "",
  savePlace: false,
  placeId: "",
  yourName: "Alex",
  message: "Park?",
  ...patch,
});

describe("sendUpdate (KD-10)", () => {
  it("KD-10a: a new start on a confirmed playdate: version 2, every answer deleted, final time cleared, collecting, New time", async () => {
    const { deps, applied } = world();
    const result = await sendUpdate(deps, organizer, ID, form({ startTime: "14:00", endTime: "16:00" }), NOW);
    expect(result).toMatchObject({ ok: true, changed: true, kind: "new_time" });
    expect(applied[0]).toMatchObject({
      timeVersion: 2,
      status: "collecting",
      deleteAnswers: true,
      clearFinal: true,
      label: "new_time",
      startAt: at("2026-11-16", 14, 0, ZONE),
      linksExpireAt: at("2026-11-17", 4, 0, ZONE), // the new set end + 12 h
    });
  });

  it("KD-10d: only the message changes: stays confirmed, same version, answers kept, Updated", async () => {
    const { deps, applied } = world();
    const result = await sendUpdate(deps, organizer, ID, form({ message: "Park? We'll bring snacks." }), NOW);
    expect(result).toMatchObject({ ok: true, changed: true, kind: "updated" });
    expect(applied[0]).toMatchObject({ timeVersion: 1, status: "confirmed", deleteAnswers: false, clearFinal: false, label: "updated", message: "Park? We'll bring snacks." });
  });

  it("KD-10e: only the place changes: not a time change; Updated", async () => {
    const { deps, applied } = world();
    await sendUpdate(deps, organizer, ID, form({ placeName: "Riverdale Park" }), NOW);
    expect(applied[0]).toMatchObject({ timeVersion: 1, deleteAnswers: false, label: "updated", placeName: "Riverdale Park" });
  });

  it("KD-10f: friends F1, F2 → F1, F3: F3 invited with a new link (hash only), F2 removed, F1 Updated, the title follows", async () => {
    const { deps, applied, tokens } = world();
    const result = await sendUpdate(deps, organizer, ID, form({ friendIds: [F1, F3] }), NOW);
    const u = applied[0]!;
    expect(u).toMatchObject({ status: "confirmed", label: "updated", removeFriendIds: [F2], title: "Playdate: Mia, Arjun & Zoe" });
    expect(u.add).toEqual([{ friendId: F3, inviteeUserId: null, channel: "text", tokenHash: hashToken(tokens[0]!) }]);
    expect(JSON.stringify(u)).not.toContain(tokens[0]!);
    if (!result.ok || !result.changed) throw new Error("expected a change");
    expect(result.texts.map((t) => [t.name, t.body])).toEqual([
      ["Dev", "Our playdate has an update: Mon, Nov 16, 10:00 AM to 12:00 PM at High Park. The link above has the details."],
      ["Sam", `Park?\n\nhttps://kindred.test/r/${tokens[0]}`],
    ]);
  });

  it("KD-10g: nothing changes: nothing is applied and nothing is texted", async () => {
    const { deps, applied } = world();
    expect(await sendUpdate(deps, organizer, ID, form(), NOW)).toEqual({ ok: true, changed: false });
    expect(applied).toEqual([]);
  });

  it("a new time is texted as New time, and the friend is asked to answer again", async () => {
    const { deps } = world(playdate({ status: "collecting", finalStartAt: null, finalEndAt: null, confirmedAt: null }));
    const result = await sendUpdate(deps, organizer, ID, form({ day: "2026-11-18" }), NOW);
    if (!result.ok || !result.changed) throw new Error("expected a change");
    expect(result.texts[0]!.body).toBe(
      "New time for our playdate: Wed, Nov 18, 10:00 AM to 12:00 PM at High Park. Please answer again with the link above.",
    );
  });

  it("refuses what Send invite refuses (KD-02…06), a cancelled playdate, and another parent's playdate", async () => {
    const { deps, applied } = world();
    expect(await sendUpdate(deps, organizer, ID, form({ friendIds: [], message: " " }), NOW)).toEqual({
      ok: false,
      errors: [{ code: "MESSAGE_REQUIRED", field: "message" }, { code: "NO_INVITEES", field: "invitees" }],
    });
    expect(await sendUpdate(deps, organizer, ID, form({ day: "2026-11-13" }), NOW)).toMatchObject({ ok: false, errors: [{ code: "IN_PAST" }] });
    expect(await sendUpdate(world(playdate({ status: "cancelled" })).deps, organizer, ID, form({ message: "x" }), NOW)).toEqual({ ok: false, errors: [{ code: "PLAYDATE_CANCELLED" }] });
    expect(await sendUpdate(deps, { ...organizer, id: SAM }, ID, form({ message: "x" }), NOW)).toEqual({ ok: false, errors: [{ code: "NOT_FOUND" }] });
    expect(applied).toEqual([]);
  });
});

describe("editFormValues", () => {
  it("fills the form in the playdate's zone", () => {
    expect(editFormValues(playdate())).toEqual({ friendIds: [F1, F2], childIds: [], mode: "set_time", slots: [], day: "2026-11-16", start: "10:00", end: "12:00", place: null, placeName: "High Park", placeAddress: "", message: "Park?" });
    expect(editFormValues(playdate({ timezone: "Asia/Kolkata", startAt: at("2026-11-16", 23, 30, "Asia/Kolkata"), endAt: at("2026-11-17", 0, 30, "Asia/Kolkata") }))).toMatchObject({
      day: "2026-11-16",
      start: "23:30",
      end: "00:30",
    });
  });
});

describe("sendUpdate with Share availability (KD-10b, c, i)", () => {
  const avail = () =>
    playdate({
      mode: "availability",
      status: "collecting",
      startAt: null,
      endAt: null,
      finalStartAt: null,
      finalEndAt: null,
      confirmedAt: null,
      slots: [{ day: "2026-11-16", slot: "morning" }, { day: "2026-11-17", slot: "evening" }],
    });
  const availForm = (slots: string[], patch: Partial<PlanFormInput> = {}) => form({ mode: "availability", day: "", startTime: "", endTime: "", slots, ...patch });

  it("KD-10b: switching from a set time to availability is a time change", async () => {
    const { deps, applied } = world();
    await sendUpdate(deps, organizer, ID, availForm(["2026-11-16|morning"]), NOW);
    expect(applied[0]).toMatchObject({ mode: "availability", startAt: null, endAt: null, slots: [{ day: "2026-11-16", slot: "morning" }], timeVersion: 2, label: "new_time" });
  });
  it("KD-10c: a slot added is a time change, and the text says there are new times to pick", async () => {
    const { deps, applied } = world(avail());
    const result = await sendUpdate(deps, organizer, ID, availForm(["2026-11-16|morning", "2026-11-17|evening", "2026-11-18|afternoon"]), NOW);
    expect(applied[0]).toMatchObject({ timeVersion: 2, deleteAnswers: true, label: "new_time" });
    if (!result.ok || !result.changed) throw new Error("expected a change");
    expect(result.texts[0]!.body).toBe("New times to pick from for our playdate at High Park. Please answer again with the link above.");
  });
  it("KD-10i: the same slots in another order are not a time change", async () => {
    const { deps, applied } = world(avail());
    expect(await sendUpdate(deps, organizer, ID, availForm(["2026-11-17|evening", "2026-11-16|morning"]), NOW)).toEqual({ ok: true, changed: false });
    expect(applied).toEqual([]);
  });
});

describe("Send update with a place found by search (T17)", () => {
  const park = { id: "fake-high-park", name: "High Park", address: "1873 Bloor St W, Toronto, ON", setting: "outdoor" as const, ages: null, price: null, rating: null, phone: null, website: null, mapsUrl: "https://maps.test" };

  it("switching from a typed place to a searched one is an Updated change; the id is stored, the name only goes in the text", async () => {
    const { deps, applied } = world();
    const result = await sendUpdate(deps, organizer, ID, form({ placeId: "fake-high-park" }), NOW);
    expect(result).toMatchObject({ ok: true, changed: true, kind: "updated" });
    expect(applied[0]).toMatchObject({ placeProviderId: "fake-high-park", placeName: null, placeAddress: null, status: "confirmed", label: "updated" });
    if (result.ok && result.changed) expect(result.texts[0]!.body).toContain("High Park");
  });
  it("the same searched place again changes nothing; the edit form brings it back as the selected place", async () => {
    const p = playdate({ placeName: "High Park", placeAddress: "1873 Bloor St W, Toronto, ON", searchedPlace: park });
    const { deps, applied } = world(p);
    expect(await sendUpdate(deps, organizer, ID, form({ placeId: "fake-high-park", placeName: "", placeAddress: "" }), NOW)).toEqual({ ok: true, changed: false });
    expect(applied).toHaveLength(0);
    expect(editFormValues(p)).toMatchObject({ place: park, placeName: "", placeAddress: "" });
  });
  it("an unknown place is refused before anything changes", async () => {
    const { deps, applied } = world();
    expect(await sendUpdate(deps, organizer, ID, form({ placeId: "fake-nowhere" }), NOW)).toEqual({ ok: false, errors: [{ code: "PLACE_NOT_FOUND", field: "place" }] });
    expect(applied).toHaveLength(0);
  });
});

describe("sendUpdate: who the playdate is for (T41)", () => {
  const MIA_ID = "c1111111-1111-4111-8111-111111111111";
  const ETHAN_ID = "c2222222-2222-4222-8222-222222222222";
  const twoKids = { ...organizer, children: [{ id: MIA_ID, firstName: "Mia" }, { id: ETHAN_ID, firstName: "Ethan" }] };
  it("adding a child is an other change: stays confirmed, Updated, a new title and the children rewritten", async () => {
    const { deps, applied } = world(playdate({ childIds: [MIA_ID] }));
    const result = await sendUpdate(deps, twoKids, ID, form({ childIds: [MIA_ID, ETHAN_ID] }), NOW);
    expect(result).toMatchObject({ ok: true, changed: true, kind: "updated" });
    expect(applied[0]).toMatchObject({ status: "confirmed", label: "updated", title: "Playdate: Mia, Ethan, Arjun & Lily", childIds: [MIA_ID, ETHAN_ID] });
  });
  it("the same children and nothing else: no change", async () => {
    const { deps } = world(playdate({ childIds: [MIA_ID] }));
    expect(await sendUpdate(deps, twoKids, ID, form({ childIds: [MIA_ID] }), NOW)).toEqual({ ok: true, changed: false });
  });
  it("choosing nobody is NO_CHILD", async () => {
    const { deps } = world(playdate({ childIds: [MIA_ID] }));
    expect(await sendUpdate(deps, twoKids, ID, form({ childIds: [] }), NOW)).toMatchObject({ ok: false, errors: [{ code: "NO_CHILD" }] });
  });
});

