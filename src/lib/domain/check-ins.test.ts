// Check-ins through the service (T35) with in-memory stores: the organizer, a friend through their link, and a Kindred friend each
// reach only their own playdate; the rule (KD-18) decides; nothing is written when it says no; the panels say who may post.
import { describe, expect, it } from "vitest";
import { at } from "@/lib/rules/time";
import { checkInAsInvitee, checkInAsOrganizer, checkInByLink, invitePanel, organizerPanel, type CheckInStore, type StoredCheckIn } from "./check-ins";
import type { InviteStore, StoredInvite } from "./invite-page";
import { hashToken } from "./invite-token";
import type { OrganizerPlaydate } from "./playdate-page";

const ZONE = "America/Toronto";
const PLAYDATE = "11111111-1111-4111-8111-111111111111";
const INVITE = "22222222-2222-4222-8222-222222222222";
const TOKEN = "AAAAAAAAAAAAAAAAAAAAAA";
const DURING = at("2026-11-16", 10, 30, ZONE);
const final = { finalStartAt: at("2026-11-16", 10, 0, ZONE), finalEndAt: at("2026-11-16", 12, 0, ZONE) };

const organizerPlaydate = { id: PLAYDATE, status: "confirmed", ...final } as unknown as OrganizerPlaydate;
const stored = (answer: StoredInvite["answer"]): StoredInvite =>
  ({ inviteId: INVITE, playdateId: PLAYDATE, playdate: { status: "confirmed", ...final }, answer }) as unknown as StoredInvite;
const yes = { kind: "yes" as const, reason: null, note: null, pick: null };

function world(answer: StoredInvite["answer"] = yes) {
  const rows: (StoredCheckIn & { playdateId: string })[] = [];
  const checkIns: CheckInStore = {
    async add(playdateId, inviteId, kind, note, createdAt) {
      rows.push({ id: String(rows.length + 1), playdateId, inviteId, kind, note, createdAt, firstName: inviteId ? "Dev" : "Alex" });
    },
    async list(playdateId) {
      return rows.filter((r) => r.playdateId === playdateId).reverse();
    },
  };
  const invites: InviteStore = {
    findByTokenHash: async (hash) => (hash === hashToken(TOKEN) ? stored(answer) : null),
    findForInvitee: async (id, user) => (id === INVITE && user === "user-dev" ? stored(answer) : null),
    findPreview: async () => null,
    saveAnswer: async () => {},
  };
  const open = { hit: () => ({ ok: true as const }) };
  return { rows, checkIns, deps: { invites, checkIns, limiter: open } };
}

describe("check-ins (T35)", () => {
  it("the organizer, a friend through their link and a Kindred friend each post to their own playdate", async () => {
    const { rows, deps } = world();
    expect(await checkInAsOrganizer(deps, organizerPlaydate, { kind: "here" }, DURING)).toEqual({ ok: true, kind: "here", note: null });
    expect(await checkInByLink(deps, TOKEN, { kind: "late", note: " ten minutes " }, DURING)).toEqual({ ok: true, kind: "late", note: "ten minutes" });
    expect(await checkInAsInvitee(deps, INVITE, "user-dev", { kind: "all_good" }, DURING)).toMatchObject({ ok: true });
    expect(rows.map((r) => [r.inviteId, r.kind])).toEqual([
      [null, "here"],
      [INVITE, "late"],
      [INVITE, "all_good"],
    ]);
  });

  it("finds nothing for a wrong token or another parent's invite, and writes nothing when the rule says no", async () => {
    const { rows, deps } = world({ kind: "no", reason: "busy", note: null, pick: null });
    expect(await checkInByLink(deps, "BBBBBBBBBBBBBBBBBBBBBB", { kind: "here" }, DURING)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await checkInByLink(deps, "../x", { kind: "here" }, DURING)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await checkInAsInvitee(deps, INVITE, "user-sam", { kind: "here" }, DURING)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await checkInByLink(deps, TOKEN, { kind: "here" }, DURING)).toEqual({ ok: false, code: "CHECKIN_NOT_COMING" });
    expect(await checkInAsOrganizer(deps, organizerPlaydate, { kind: "here" }, at("2026-11-16", 8, 0, ZONE))).toEqual({ ok: false, code: "CHECKIN_CLOSED" });
    expect(rows).toEqual([]);
  });

  it("stops at the limit", async () => {
    const { rows, deps } = world();
    const shut = { ...deps, limiter: { hit: () => ({ ok: false as const, retryAfterSeconds: 60 }) } };
    expect(await checkInAsOrganizer(shut, organizerPlaydate, { kind: "here" }, DURING)).toEqual({ ok: false, code: "TOO_MANY_CHECKINS" });
    expect(rows).toEqual([]);
  });

  it("panels: newest first, the viewer's own marked, and who may post now", async () => {
    const { checkIns, deps } = world();
    await checkInAsOrganizer(deps, organizerPlaydate, { kind: "here" }, DURING);
    await checkInByLink(deps, TOKEN, { kind: "late" }, DURING);
    const forFriend = await invitePanel(checkIns, stored(yes), DURING);
    expect(forFriend.canPost).toBe(true);
    expect(forFriend.checkIns.map((c) => [c.firstName, c.kind, c.yours])).toEqual([
      ["Dev", "late", true],
      ["Alex", "here", false],
    ]);
    expect((await invitePanel(checkIns, stored(null), DURING)).canPost).toBe(false); // not coming
    expect((await organizerPanel(checkIns, organizerPlaydate, DURING)).canPost).toBe(true);
    expect((await organizerPanel(checkIns, organizerPlaydate, at("2026-11-17", 10, 0, ZONE))).canPost).toBe(false); // over
  });
});
