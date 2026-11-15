// The organizer's playdate page through the service with an in-memory store: status per friend (KD-08), who can come and
// Confirm and send update (KD-09), never another parent's playdate, and the confirmation texts.
import { describe, expect, it } from "vitest";
import { at } from "@/lib/rules/time";
import { cancellationTexts, confirmationSentence, confirmationTexts } from "./confirmation";
import { cancelPlaydate, confirmPlaydate, pageView, type OrganizerInvite, type OrganizerPlaydate, type PlaydatePageStore } from "./playdate-page";

const ZONE = "America/Toronto";
const NOW = at("2026-11-14", 10, 0, ZONE);
const ALEX = "11111111-1111-4111-8111-111111111111";
const SAM = "22222222-2222-4222-8222-222222222222";
const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const invite = (id: string, parentName: string, label: string, answer: OrganizerInvite["answer"] = null, channel: OrganizerInvite["channel"] = "text"): OrganizerInvite => ({
  id,
  friendId: `f-${id}`,
  parentName,
  label,
  channel,
  phoneE164: `+1416555${id.padStart(4, "0").slice(-4)}`,
  answer,
});
const yes = { kind: "yes" as const, reason: null, note: null, answeredAt: NOW };
const busy = { kind: "no" as const, reason: "busy" as const, note: "Sorry!", answeredAt: NOW };

function playdate(invites: OrganizerInvite[], patch: Partial<OrganizerPlaydate> = {}): OrganizerPlaydate {
  return {
    id: ID,
    title: "Playdate: Mia, Arjun & Lily",
    mode: "set_time",
    status: "collecting",
    timezone: ZONE,
    startAt: at("2026-11-16", 10, 0, ZONE),
    endAt: at("2026-11-16", 12, 0, ZONE),
    finalStartAt: null,
    finalEndAt: null,
    confirmedAt: null,
    placeName: "High Park",
    placeAddress: null,
    searchedPlace: null,
    message: "Park?",
    timeVersion: 1,
    slots: [],
    invites,
    ...patch,
  };
}

function store(p: OrganizerPlaydate, owner = ALEX) {
  const confirms: unknown[] = [];
  const cancels: Date[] = [];
  const s: PlaydatePageStore = {
    async getForOrganizer(organizerId, playdateId) {
      return organizerId === owner && playdateId === p.id ? p : null;
    },
    async confirm(organizerId, playdateId, final) {
      if (organizerId !== owner || playdateId !== p.id || p.status !== "collecting") return false;
      confirms.push(final);
      return true;
    },
    async cancel(organizerId, playdateId, at) {
      if (organizerId !== owner || playdateId !== p.id || p.status === "cancelled") return false;
      cancels.push(at);
      return true;
    },
  };
  return { s, confirms, cancels };
}

describe("pageView (KD-08, KD-09)", () => {
  it("shows each friend's status and note, N of M answered, and who can come", () => {
    const view = pageView(playdate([invite("1", "Dev Patel", "Arjun's dad", yes), invite("2", "Maya Chen", "Lily's parent", busy), invite("3", "Sam Lee", "Zoe's mom")]));
    expect(view.friends).toEqual([
      { inviteId: "1", label: "Arjun's dad", status: { status: "coming" }, note: null },
      { inviteId: "2", label: "Lily's parent", status: { status: "cant_make_it", reason: "busy" }, note: "Sorry!" },
      { inviteId: "3", label: "Zoe's mom", status: { status: "waiting" }, note: null },
    ]);
    expect(view).toMatchObject({ answered: 2, total: 3, comingNames: ["Dev"], canConfirm: true, confirmed: false });
  });

  it("KD-09: Confirm is enabled at the first yes, not before", () => {
    expect(pageView(playdate([invite("1", "Dev", "Arjun's dad", busy), invite("2", "Maya", "Lily's parent")])).canConfirm).toBe(false);
    expect(pageView(playdate([invite("1", "Dev", "Arjun's dad", yes)])).canConfirm).toBe(true);
  });

  it("once confirmed: the final time, and no Confirm button", () => {
    const final = { finalStartAt: at("2026-11-16", 10, 0, ZONE), finalEndAt: at("2026-11-16", 12, 0, ZONE) };
    const view = pageView(playdate([invite("1", "Dev", "Arjun's dad", yes)], { status: "confirmed", confirmedAt: NOW, ...final }));
    expect(view).toMatchObject({ confirmed: true, canConfirm: false, start: final.finalStartAt, end: final.finalEndAt });
  });
});

describe("confirmPlaydate (KD-01, KD-09)", () => {
  it("refuses with no yes (CONFIRM_NEEDS_YES), and changes nothing", async () => {
    const { s, confirms } = store(playdate([invite("1", "Dev", "Arjun's dad", busy), invite("2", "Maya", "Lily's parent")]));
    expect(await confirmPlaydate(s, ALEX, ID, NOW)).toEqual({ ok: false, code: "CONFIRM_NEEDS_YES" });
    expect(confirms).toEqual([]);
  });

  it("sets the set time as the final time, the confirmation moment, and the links' expiry (KD-14)", async () => {
    const { s, confirms } = store(playdate([invite("1", "Dev", "Arjun's dad", yes)]));
    expect(await confirmPlaydate(s, ALEX, ID, NOW)).toEqual({ ok: true });
    expect(confirms).toEqual([{ start: at("2026-11-16", 10, 0, ZONE), end: at("2026-11-16", 12, 0, ZONE), confirmedAt: NOW, linksExpireAt: at("2026-11-17", 0, 0, ZONE) }]);
  });

  it("another parent's playdate, or a malformed id, is not found", async () => {
    const { s, confirms } = store(playdate([invite("1", "Dev", "Arjun's dad", yes)]));
    expect(await confirmPlaydate(s, SAM, ID, NOW)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await confirmPlaydate(s, ALEX, "not-an-id", NOW)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(confirms).toEqual([]);
  });

  it("refuses a cancelled playdate, and leaves a confirmed one as it is", async () => {
    const cancelled = store(playdate([invite("1", "Dev", "Arjun's dad", yes)], { status: "cancelled" }));
    expect(await confirmPlaydate(cancelled.s, ALEX, ID, NOW)).toEqual({ ok: false, code: "PLAYDATE_CANCELLED" });
    const confirmed = store(playdate([invite("1", "Dev", "Arjun's dad", yes)], { status: "confirmed" }));
    expect(await confirmPlaydate(confirmed.s, ALEX, ID, NOW)).toEqual({ ok: true });
    expect(confirmed.confirms).toEqual([]);
  });
});

describe("the confirmation texts (Q3)", () => {
  const confirmed = playdate([invite("1", "Dev Patel", "Arjun's dad", yes), invite("2", "Maya Chen", "Lily's parent", busy, "app")], {
    status: "confirmed",
    finalStartAt: at("2026-11-16", 10, 0, ZONE),
    finalEndAt: at("2026-11-16", 12, 0, ZONE),
  });
  it("say it's on, with the final day, time and place", () => {
    expect(confirmationSentence(confirmed)).toBe("It's on! 🎉 See you Mon, Nov 16, 10:00 AM to 12:00 PM at High Park.");
    expect(confirmationSentence({ ...confirmed, placeName: null })).toBe("It's on! 🎉 See you Mon, Nov 16, 10:00 AM to 12:00 PM.");
    expect(confirmationSentence({ ...confirmed, finalStartAt: null })).toBeNull();
  });
  it("go to every family, each to their own number, Kindred friends too (Q11 default)", () => {
    expect(confirmationTexts(confirmed).map((t) => ({ name: t.name, channel: t.channel, href: decodeURIComponent(t.href) }))).toEqual([
      { name: "Dev", channel: "text", href: "sms:+14165550001?&body=It's on! 🎉 See you Mon, Nov 16, 10:00 AM to 12:00 PM at High Park." },
      { name: "Maya", channel: "app", href: "sms:+14165550002?&body=It's on! 🎉 See you Mon, Nov 16, 10:00 AM to 12:00 PM at High Park." },
    ]);
    expect(confirmationTexts(playdate([invite("1", "Dev", "Arjun's dad", yes)]))).toEqual([]);
  });
});

describe("cancelPlaydate (KD-15, Q1 default)", () => {
  it("cancels the organizer's own playdate, confirmed or not", async () => {
    for (const status of ["collecting", "confirmed"] as const) {
      const { s, cancels } = store(playdate([invite("1", "Dev", "Arjun's dad", yes)], { status }));
      expect(await cancelPlaydate(s, ALEX, ID, NOW)).toEqual({ ok: true });
      expect(cancels).toEqual([NOW]);
    }
  });
  it("another parent's playdate or a malformed id is not found; cancelling twice changes nothing", async () => {
    const { s, cancels } = store(playdate([]));
    expect(await cancelPlaydate(s, SAM, ID, NOW)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await cancelPlaydate(s, ALEX, "x", NOW)).toEqual({ ok: false, code: "NOT_FOUND" });
    const done = store(playdate([], { status: "cancelled" }));
    expect(await cancelPlaydate(done.s, ALEX, ID, NOW)).toEqual({ ok: true });
    expect([...cancels, ...done.cancels]).toEqual([]);
  });
  it("gives every family a Text button saying it's off, with the day", () => {
    const texts = cancellationTexts(playdate([invite("1", "Dev Patel", "Arjun's dad", yes), invite("2", "Maya Chen", "Lily's parent", null, "app")], { status: "cancelled" }));
    expect(texts.map((t) => [t.name, decodeURIComponent(t.href)])).toEqual([
      ["Dev", "sms:+14165550001?&body=Sorry, our playdate on Mon, Nov 16 is cancelled."],
      ["Maya", "sms:+14165550002?&body=Sorry, our playdate on Mon, Nov 16 is cancelled."],
    ]);
  });
});

describe("confirming availability (T14, KD-09, KD-11)", () => {
  const MON = "2026-11-16";
  const r = (h1: number, m1: number, h2: number, m2: number) => ({ start: at(MON, h1, m1, ZONE), end: at(MON, h2, m2, ZONE) });
  const pickOf = (range: ReturnType<typeof r>) => ({ kind: "pick" as const, reason: null, note: null, answeredAt: NOW, pick: range });
  const avail = (invites: OrganizerInvite[]) =>
    playdate(invites, { mode: "availability", startAt: null, endAt: null, slots: [{ day: MON, slot: "morning" }, { day: MON, slot: "afternoon" }] });
  const a = r(9, 30, 11, 0);
  const b = r(13, 0, 14, 0);
  const three = () => avail([invite("1", "Dev Patel", "Arjun's dad", pickOf(a)), invite("2", "Maya Chen", "Lily's parent", pickOf(a)), invite("3", "Sam Lee", "Zoe's mom", pickOf(b))]);

  it("lists Times friends suggested, Most picked first, with each family's first name, and Confirm once there is a pick", () => {
    const view = pageView(three());
    expect(view.suggestions).toEqual([
      { range: a, names: ["Dev", "Maya"], families: 2, mostPicked: true },
      { range: b, names: ["Sam"], families: 1, mostPicked: false },
    ]);
    expect(view.canConfirm).toBe(true);
    expect(pageView(avail([invite("1", "Dev", "Arjun's dad")])).canConfirm).toBe(false);
  });

  it("confirms the tapped suggestion as the final time, with the links until it ends + 12 h", async () => {
    const { s, confirms } = store(three());
    expect(await confirmPlaydate(s, ALEX, ID, NOW, a)).toEqual({ ok: true });
    expect(confirms).toEqual([{ start: a.start, end: a.end, confirmedAt: NOW, linksExpireAt: at(MON, 23, 0, ZONE) }]);
  });

  it("refuses with nothing chosen (CONFIRM_NEEDS_TIME), and an own range outside the free slots", async () => {
    const { s, confirms } = store(three());
    expect(await confirmPlaydate(s, ALEX, ID, NOW, null)).toEqual({ ok: false, code: "CONFIRM_NEEDS_TIME" });
    expect(await confirmPlaydate(s, ALEX, ID, NOW, r(12, 0, 13, 0))).toEqual({ ok: false, code: "PICK_OUTSIDE_FREE_SLOT" });
    expect(confirms).toEqual([]);
  });

  it("accepts the organizer's own range inside a free slot (KD-09e)", async () => {
    const { s } = store(three());
    expect(await confirmPlaydate(s, ALEX, ID, NOW, r(14, 0, 15, 30))).toEqual({ ok: true });
  });
});
