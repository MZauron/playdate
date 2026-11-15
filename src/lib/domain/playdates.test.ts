// Send invite through the service with an in-memory store: each KD-02…06 refusal, nothing written on a refusal, and only token
// hashes stored (KD-14). Times: now = Sat 14 Nov 2026, 10:00 in Toronto (docs/rules.test-cases.md).
import { describe, expect, it } from "vitest";
import { at } from "@/lib/rules/time";
import { hashToken } from "./invite-token";
import { createFakePlaydateStore } from "./playdates.fake-store";
import { parsePlanForm, sendInvite, wallTime, zoneOrDefault, type PlanFormInput, type SendDeps } from "./playdates";

const ZONE = "America/Toronto";
const NOW = at("2026-11-14", 10, 0, ZONE);
const ALEX = "11111111-1111-4111-8111-111111111111";
const SAM = "22222222-2222-4222-8222-222222222222";
const DEV = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MAYA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SAMS_FRIEND = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const MAYA_ACCOUNT = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const organizer = { id: ALEX, firstName: "Alex", childFirstName: "Mia" };

function world() {
  const fake = createFakePlaydateStore([
    { ownerId: ALEX, id: DEV, parentName: "Dev Patel", childFirstName: "Arjun", label: "Arjun's dad", phoneE164: "+14165550111", kindredUserId: null },
    { ownerId: ALEX, id: MAYA, parentName: "Maya Chen", childFirstName: "Lily", label: "Lily's parent", phoneE164: "+14165550177", kindredUserId: MAYA_ACCOUNT },
    { ownerId: SAM, id: SAMS_FRIEND, parentName: "Zoe's mom", childFirstName: "Zoe", label: "Zoe's mom", phoneE164: "+14165550199", kindredUserId: null },
  ]);
  let n = 0;
  const tokens: string[] = [];
  let hits = 0;
  const deps: SendDeps = {
    store: fake.store,
    limiter: { hit: () => (++hits > 100 ? { ok: false, retryAfterSeconds: 60 } : { ok: true }) },
    linkBase: "https://kindred.test",
    newToken: () => {
      const token = `token-${++n}-abcdefghijklmn`.slice(0, 22);
      tokens.push(token);
      return { token, tokenHash: hashToken(token) };
    },
  };
  return { fake, deps, tokens };
}

const plan = (patch: Partial<PlanFormInput> = {}): PlanFormInput => ({
  friendIds: [DEV, MAYA],
  mode: "set_time",
  day: "2026-11-16",
  startTime: "10:00",
  endTime: "12:00",
  zone: ZONE,
  placeName: "",
  placeAddress: "",
  savePlace: false,
  yourName: "Alex",
  message: "Park at 10?",
  ...patch,
});

async function refused(patch: Partial<PlanFormInput>) {
  const { fake, deps } = world();
  const result = await sendInvite(deps, organizer, plan(patch), NOW);
  expect(fake.playdates).toHaveLength(0); // nothing is written on a refusal
  if (result.ok) throw new Error("expected a refusal");
  return result.errors.map((e) => e.code);
}

describe("sendInvite refusals (KD-02…06)", () => {
  it("KD-02: no time mode, or Share availability before T12, is NO_TIME", async () => {
    expect(await refused({ mode: "" })).toEqual(["NO_TIME"]);
    expect(await refused({ mode: "availability" })).toEqual(["NO_TIME"]);
  });
  it("KD-02: a set time without a day or with a malformed time is NO_TIME", async () => {
    expect(await refused({ day: "" })).toEqual(["NO_TIME"]);
    expect(await refused({ startTime: "25:00" })).toEqual(["NO_TIME"]);
    expect(await refused({ day: "2026-13-01" })).toEqual(["NO_TIME"]);
  });
  it("KD-03: the end must come after the start", async () => {
    expect(await refused({ endTime: "10:00" })).toEqual(["END_BEFORE_START"]);
    expect(await refused({ startTime: "12:00", endTime: "11:00" })).toEqual(["END_BEFORE_START"]);
  });
  it("KD-03: the start must be in the future", async () => {
    expect(await refused({ day: "2026-11-14", startTime: "09:00", endTime: "11:00" })).toEqual(["IN_PAST"]);
    expect(await refused({ day: "2026-11-14", startTime: "10:00", endTime: "11:00" })).toEqual(["IN_PAST"]);
  });
  it("KD-05: the message is required and at most 1000 characters", async () => {
    expect(await refused({ message: "   " })).toEqual(["MESSAGE_REQUIRED"]);
    expect(await refused({ message: "x".repeat(1001) })).toEqual(["MESSAGE_TOO_LONG"]);
  });
  it("KD-06: at least one friend, and only the organizer's own friends count", async () => {
    expect(await refused({ friendIds: [] })).toEqual(["NO_INVITEES"]);
    expect(await refused({ friendIds: [SAMS_FRIEND] })).toEqual(["NO_INVITEES"]);
    expect(await refused({ friendIds: ["not-an-id", "'; drop table friends; --"] })).toEqual(["NO_INVITEES"]);
  });
  it("returns every refusal at once", async () => {
    expect(await refused({ mode: "", message: "", friendIds: [], yourName: " " })).toEqual(["NO_TIME", "MESSAGE_REQUIRED", "NO_INVITEES", "NAME_REQUIRED"]);
  });
  it("Details: a name for the organizer, a place name with an address, and an address to save a place", async () => {
    expect(await refused({ yourName: "" })).toEqual(["NAME_REQUIRED"]);
    expect(await refused({ placeAddress: "373 Broadview Ave" })).toEqual(["PLACE_NAME_REQUIRED"]);
    expect(await refused({ placeName: "Riverdale Park", savePlace: true })).toEqual(["ADDRESS_REQUIRED"]);
  });
  it("too many playdates in an hour: refused before anything is written", async () => {
    const { fake, deps } = world();
    const result = await sendInvite({ ...deps, limiter: { hit: () => ({ ok: false, retryAfterSeconds: 120 }) } }, organizer, plan(), NOW);
    expect(result).toEqual({ ok: false, errors: [{ code: "TOO_MANY_PLAYDATES" }], retryAfterSeconds: 120 });
    expect(fake.playdates).toHaveLength(0);
  });
});

describe("sendInvite", () => {
  it("creates one playdate with one invite per friend, the KD-06 title, the times in the playdate's zone and the KD-14 expiry", async () => {
    const { fake, deps } = world();
    const result = await sendInvite(deps, organizer, plan({ placeName: " Riverdale Park ", placeAddress: "373 Broadview Ave" }), NOW);
    expect(result.ok).toBe(true);
    expect(fake.playdates).toHaveLength(1);
    const stored = fake.playdates[0]!;
    expect(stored).toMatchObject({
      organizerId: ALEX,
      title: "Playdate: Mia, Arjun & Lily",
      mode: "set_time",
      timezone: ZONE,
      startAt: new Date("2026-11-16T15:00:00Z"),
      endAt: new Date("2026-11-16T17:00:00Z"),
      linksExpireAt: new Date("2026-11-17T05:00:00Z"), // end + 12 h
      placeName: "Riverdale Park",
      placeAddress: "373 Broadview Ave",
      message: "Park at 10?",
    });
    expect(stored.invites.map(({ friendId, channel, inviteeUserId }) => ({ friendId, channel, inviteeUserId }))).toEqual([
      { friendId: DEV, channel: "text", inviteeUserId: null },
      { friendId: MAYA, channel: "app", inviteeUserId: MAYA_ACCOUNT },
    ]);
  });

  it("KD-14: stores only the sha256 of each link token; the tokens leave only inside the organizer's Text links", async () => {
    const { fake, deps, tokens } = world();
    const result = await sendInvite(deps, organizer, plan(), NOW);
    if (!result.ok) throw new Error("expected ok");
    const stored = JSON.stringify(fake.playdates);
    for (const token of tokens) expect(stored).not.toContain(token);
    expect(fake.playdates[0]!.invites.map((i) => i.tokenHash)).toEqual(tokens.map(hashToken));
    expect(result.texts.map((t) => decodeURIComponent(t.href))).toEqual([
      `sms:+14165550111?&body=Park at 10?\n\nhttps://kindred.test/r/${tokens[0]}`,
      `sms:+14165550177?&body=Park at 10?\n\nhttps://kindred.test/r/${tokens[1]}`,
    ]);
  });

  it("KD-05: the message is stored and texted exactly as typed", async () => {
    const { fake, deps } = world();
    const result = await sendInvite(deps, organizer, plan({ message: "  Park at 10?  " }), NOW);
    if (!result.ok) throw new Error("expected ok");
    expect(fake.playdates[0]!.message).toBe("  Park at 10?  ");
    expect(decodeURIComponent(result.texts[0]!.href)).toContain("body=  Park at 10?  \n\n");
  });

  it("gives a Text button per friend, by first name, Kindred friends too (Q11 default: no push yet)", async () => {
    const { deps } = world();
    const result = await sendInvite(deps, organizer, plan(), NOW);
    if (!result.ok) throw new Error("expected ok");
    expect(result.texts.map(({ name, label, channel }) => ({ name, label, channel }))).toEqual([
      { name: "Dev", label: "Arjun's dad", channel: "text" },
      { name: "Maya", label: "Lily's parent", channel: "app" },
    ]);
  });

  it("invites each friend once even if the form names them twice, and ignores other parents' friends", async () => {
    const { fake, deps } = world();
    await sendInvite(deps, organizer, plan({ friendIds: [DEV, DEV, SAMS_FRIEND] }), NOW);
    expect(fake.playdates[0]!.invites.map((i) => i.friendId)).toEqual([DEV]);
    expect(fake.playdates[0]!.title).toBe("Playdate: Mia & Arjun");
  });

  it("saves the typed place when asked, and the organizer's name when it changed", async () => {
    const { fake, deps } = world();
    await sendInvite(deps, organizer, plan({ placeName: "Riverdale Park", placeAddress: "373 Broadview Ave", savePlace: true, yourName: "Alexandra" }), NOW);
    expect(fake.places).toEqual([{ ownerId: ALEX, name: "Riverdale Park", address: "373 Broadview Ave" }]);
    expect(fake.names).toEqual([{ ownerId: ALEX, firstName: "Alexandra" }]);
    const again = world();
    await sendInvite(again.deps, organizer, plan(), NOW);
    expect(again.fake.places).toEqual([]);
    expect(again.fake.names).toEqual([]);
  });

  it("KD-16: uses the organizer's browser zone, or the default when the zone is unknown", async () => {
    const { fake, deps } = world();
    // A zone without daylight saving, so the expected instant does not depend on this machine's time-zone data.
    await sendInvite(deps, organizer, plan({ zone: "Asia/Kolkata" }), NOW);
    expect(fake.playdates[0]).toMatchObject({ timezone: "Asia/Kolkata", startAt: new Date("2026-11-16T04:30:00Z") });
    expect(zoneOrDefault("Mars/Olympus")).toBe("America/Toronto");
    expect(zoneOrDefault("")).toBe("America/Toronto");
  });
});

describe("parsePlanForm", () => {
  it("reads only the plan's own fields; an organizer id, a title or a token in the form is ignored", () => {
    const form = new FormData();
    for (const [k, v] of [["friendId", DEV], ["friendId", MAYA], ["mode", "set_time"], ["organizerId", SAM], ["title", "x"], ["tokenHash", "y"], ["savePlace", "1"], ["message", " hi "]]) form.append(k!, v!);
    const parsed = parsePlanForm(form);
    expect(parsed.friendIds).toEqual([DEV, MAYA]);
    expect(parsed.savePlace).toBe(true);
    expect(parsed.message).toBe(" hi ");
    expect(Object.keys(parsed)).not.toContain("organizerId");
  });
});

describe("wallTime", () => {
  it("reads a day and a clock time on the playdate's own clock, and nothing malformed", () => {
    expect(wallTime("2026-11-16", "10:00", ZONE)).toEqual(new Date("2026-11-16T15:00:00Z"));
    expect(wallTime("2026-11-16", "9:00", ZONE)).toBeNull();
    expect(wallTime("16/11/2026", "10:00", ZONE)).toBeNull();
  });
});
