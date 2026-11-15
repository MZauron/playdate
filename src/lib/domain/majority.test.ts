// KD-12, Q2 default: who gets the "most families picked" text, the tick stamping each invite once, and the organizer's Home notices.
import { describe, expect, it } from "vitest";
import { at } from "@/lib/rules/time";
import { homeNotices, invitesToNotify, runMajorityNotices, type TickPlaydate, type TickStore } from "./majority";
import type { OrganizerPlaydate } from "./playdate-page";

const ZONE = "America/Toronto";
const MON = "2026-11-16";
const NOW = at("2026-11-14", 10, 0, ZONE);
const a = { start: at(MON, 9, 0, ZONE), end: at(MON, 12, 0, ZONE) };
const b = { start: at(MON, 13, 0, ZONE), end: at(MON, 14, 0, ZONE) };

const tick = (aishaChannel: "text" | "app" = "text", aishaStamp: Date | null = null): TickPlaydate => ({
  id: "p1",
  invites: [
    { id: "dev", channel: "text", majorityNoticeAt: null, firstName: "Dev", pick: a },
    { id: "maya", channel: "app", majorityNoticeAt: null, firstName: "Maya", pick: a },
    { id: "aisha", channel: aishaChannel, majorityNoticeAt: aishaStamp, firstName: "Aisha", pick: b },
  ],
});

describe("invitesToNotify (KD-12a–e)", () => {
  it("KD-12a: a text friend whose pick differs from the range two families picked", () => expect(invitesToNotify(tick())).toEqual(["aisha"]));
  it("KD-12b: not when already stamped", () => expect(invitesToNotify(tick("text", NOW))).toEqual([]));
  it("KD-12d: not a Kindred friend", () => expect(invitesToNotify(tick("app"))).toEqual([]));
  it("KD-12c: not when no range has two families", () => {
    const one: TickPlaydate = { id: "p", invites: [{ id: "dev", channel: "text", majorityNoticeAt: null, firstName: "Dev", pick: a }, { id: "aisha", channel: "text", majorityNoticeAt: null, firstName: "Aisha", pick: b }] };
    expect(invitesToNotify(one)).toEqual([]);
  });
});

describe("runMajorityNotices", () => {
  it("stamps each invite once, ever: running it again changes nothing", async () => {
    const stamps = new Map<string, Date>();
    const store: TickStore = {
      openAvailabilityPlaydates: async () => [{ ...tick(), invites: tick().invites.map((i) => ({ ...i, majorityNoticeAt: stamps.get(i.id) ?? null })) }],
      stampMajorityNotice: async (ids, when) => {
        let n = 0;
        for (const id of ids) if (!stamps.has(id)) (stamps.set(id, when), n++);
        return n;
      },
    };
    expect(await runMajorityNotices(store, NOW)).toEqual({ stamped: 1 });
    expect(await runMajorityNotices(store, NOW)).toEqual({ stamped: 0 });
    expect([...stamps.keys()]).toEqual(["aisha"]);
  });
});

describe("homeNotices (Q2 default)", () => {
  const pd = (aishaPick = b, status: OrganizerPlaydate["status"] = "collecting"): OrganizerPlaydate => ({
    id: "p1",
    title: "Playdate",
    mode: "availability",
    status,
    timezone: ZONE,
    startAt: null,
    endAt: null,
    finalStartAt: null,
    finalEndAt: null,
    confirmedAt: null,
    placeName: null,
    placeAddress: null,
    message: "Which works?",
    timeVersion: 1,
    slots: [],
    invites: [
      { id: "dev", friendId: "f1", parentName: "Dev Patel", label: "Arjun's dad", channel: "text", phoneE164: "+14165550111", answer: { kind: "pick", reason: null, note: null, answeredAt: NOW, pick: a }, majorityNoticeAt: null },
      { id: "maya", friendId: "f2", parentName: "Maya Chen", label: "Lily's parent", channel: "text", phoneE164: "+14165550177", answer: { kind: "pick", reason: null, note: null, answeredAt: NOW, pick: a }, majorityNoticeAt: null },
      { id: "aisha", friendId: "f3", parentName: "Aisha Khan", label: "Omar's mom", channel: "text", phoneE164: "+14165550199", answer: { kind: "pick", reason: null, note: null, answeredAt: NOW, pick: aishaPick }, majorityNoticeAt: NOW },
    ],
  });
  it("gives a Text button with the doc's sentence for each stamped friend whose pick still differs", () => {
    expect(homeNotices(pd()).map((n) => ({ name: n.name, href: decodeURIComponent(n.href) }))).toEqual([
      { name: "Aisha", href: "sms:+14165550199?&body=Most families picked Mon, Nov 16, 9:00 AM to 12:00 PM. Does that work for you?" },
    ]);
  });
  it("goes away once that friend switched to the Most picked range, or the playdate is confirmed", () => {
    expect(homeNotices(pd(a))).toEqual([]);
    expect(homeNotices(pd(b, "confirmed"))).toEqual([]);
  });
});
