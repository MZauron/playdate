// The organizer's playdate page through the service with an in-memory store: status per friend (KD-08), who can come and
// Confirm and send update (KD-09), never another parent's playdate, and the confirmation texts.
import { describe, expect, it } from "vitest";
import { at } from "@/lib/rules/time";
import { confirmationSentence, confirmationTexts } from "./confirmation";
import { confirmPlaydate, pageView, type OrganizerInvite, type OrganizerPlaydate, type PlaydatePageStore } from "./playdate-page";

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
    message: "Park?",
    timeVersion: 1,
    slots: [],
    invites,
    ...patch,
  };
}

function store(p: OrganizerPlaydate, owner = ALEX) {
  const confirms: unknown[] = [];
  const s: PlaydatePageStore = {
    async getForOrganizer(organizerId, playdateId) {
      return organizerId === owner && playdateId === p.id ? p : null;
    },
    async confirm(organizerId, playdateId, final) {
      if (organizerId !== owner || playdateId !== p.id || p.status !== "collecting") return false;
      confirms.push(final);
      return true;
    },
  };
  return { s, confirms };
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
