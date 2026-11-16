// The invite page through the service with an in-memory store: a valid answer, a change of answer, an expired link, a stale time
// version, a cancelled playdate, and that the view never holds a phone number or another playdate (T09 "done when").
import { describe, expect, it } from "vitest";
import type { Answer } from "@/lib/rules/answers";
import { at } from "@/lib/rules/time";
import { answerInvite, answerInviteAsInvitee, loadInvite, loadInviteForInvitee, loadPreview, parseAnswerForm, toView, type AnswerDeps, type InviteStore, type StoredInvite } from "./invite-page";
import { hashToken } from "./invite-token";

const ZONE = "America/Toronto";
const NOW = at("2026-11-14", 10, 0, ZONE);
const TOKEN = "AAAAAAAAAAAAAAAAAAAAAA"; // 22 characters, as Kindred makes them
const OTHER_TOKEN = "BBBBBBBBBBBBBBBBBBBBBB";
const PLAYDATE = "11111111-1111-4111-8111-111111111111"; // Alex's playdate in the preview tests (T27)

function stored(patch: Partial<StoredInvite["playdate"]> = {}, rest: Partial<StoredInvite> = {}): StoredInvite {
  return {
    inviteId: "invite-1",
    label: "none",
    playdate: {
      title: "Playdate: Mia & Arjun",
      mode: "set_time",
      status: "collecting",
      timezone: ZONE,
      startAt: at("2026-11-16", 10, 0, ZONE),
      endAt: at("2026-11-16", 12, 0, ZONE),
      finalStartAt: null,
      finalEndAt: null,
      placeName: "Riverdale Park",
      placeAddress: "373 Broadview Ave",
      searchedPlace: null,
      message: "Park at 10?",
      timeVersion: 1,
      linksExpireAt: at("2026-11-17", 0, 0, ZONE),
      slots: [],
      ...patch,
    },
    organizer: { firstName: "Alex", childFirstName: "Mia" },
    answer: null,
    picks: [],
    ...rest,
  };
}

/** One invite per token hash; saved answers are kept so a test can read them back. */
/** T15: which signed-in user each invite belongs to (a Kindred friend). */
const inviteeOf = new Map<string, string>([["invite-1", "user-dev"]]);

function world(byToken: Record<string, StoredInvite>) {
  const invites = new Map(Object.entries(byToken).map(([token, s]) => [hashToken(token), structuredClone(s)]));
  const saved: { inviteId: string; answer: Answer; timeVersion: number }[] = [];
  const store: InviteStore = {
    async findByTokenHash(hash) {
      return invites.get(hash) ?? null;
    },
    async findForInvitee(inviteId, userId) {
      return [...invites.values()].find((x) => x.inviteId === inviteId && inviteeOf.get(inviteId) === userId) ?? null;
    },
    async findPreview(playdateId, organizerId) {
      return playdateId === PLAYDATE && organizerId === "user-alex" ? ([...invites.values()][0] ?? null) : null;
    },
    async saveAnswer(inviteId, answer, timeVersion) {
      saved.push({ inviteId, answer, timeVersion });
      for (const s of invites.values()) if (s.inviteId === inviteId) s.answer = { kind: answer.kind, reason: answer.reason, note: answer.note, pick: answer.pick };
    },
  };
  const open = { hit: () => ({ ok: true as const }) };
  const deps: AnswerDeps = { store, limiters: { token: open, address: open } };
  return { store, saved, deps };
}

const yes = { kind: "yes" as const, reason: null, note: null, timeVersion: 1 };
const noBusy = { kind: "no" as const, reason: "busy" as const, note: "Sorry!", timeVersion: 1 };

describe("answerInvite (KD-07)", () => {
  it("saves a valid answer for the invite the token names", async () => {
    const { deps, saved } = world({ [TOKEN]: stored() });
    expect(await answerInvite(deps, TOKEN, "1.2.3.4", yes, NOW)).toEqual({ ok: true, answer: { kind: "yes", reason: null, note: null, pick: null } });
    expect(saved).toEqual([{ inviteId: "invite-1", answer: { kind: "yes", reason: null, note: null, pick: null }, timeVersion: 1 }]);
  });

  it("Change my answer: a second answer replaces the first, and the page shows the new one", async () => {
    const { deps, store } = world({ [TOKEN]: stored() });
    await answerInvite(deps, TOKEN, "1.2.3.4", yes, NOW);
    expect((await loadInvite(store, TOKEN, NOW))?.answer).toEqual({ kind: "yes", reason: null, note: null, pick: null });
    await answerInvite(deps, TOKEN, "1.2.3.4", noBusy, NOW);
    expect((await loadInvite(store, TOKEN, NOW))?.answer).toEqual({ kind: "no", reason: "busy", note: "Sorry!", pick: null });
  });

  it("refuses an answer after the link expired (KD-14), and saves nothing", async () => {
    const { deps, saved } = world({ [TOKEN]: stored({ linksExpireAt: NOW }) });
    expect(await answerInvite(deps, TOKEN, "1.2.3.4", yes, NOW)).toEqual({ ok: false, code: "LINK_EXPIRED" });
    expect(saved).toEqual([]);
  });

  it("refuses an answer for an old time version (KD-10)", async () => {
    const { deps, saved } = world({ [TOKEN]: stored({ timeVersion: 2 }) });
    expect(await answerInvite(deps, TOKEN, "1.2.3.4", yes, NOW)).toEqual({ ok: false, code: "STALE_TIME" });
    expect(saved).toEqual([]);
  });

  it("refuses an answer for a cancelled playdate", async () => {
    const { deps, saved } = world({ [TOKEN]: stored({ status: "cancelled" }) });
    expect(await answerInvite(deps, TOKEN, "1.2.3.4", yes, NOW)).toEqual({ ok: false, code: "PLAYDATE_CANCELLED" });
    expect(saved).toEqual([]);
  });

  it("refuses an answer once the playdate started, and a no without a reason", async () => {
    const started = world({ [TOKEN]: stored({ startAt: NOW }) });
    expect(await answerInvite(started.deps, TOKEN, "1.2.3.4", yes, NOW)).toEqual({ ok: false, code: "PLAYDATE_STARTED" });
    const { deps } = world({ [TOKEN]: stored() });
    expect(await answerInvite(deps, TOKEN, "1.2.3.4", { ...noBusy, reason: null }, NOW)).toEqual({ ok: false, code: "INVALID_ANSWER", field: "reason" });
  });

  it("knows nothing for a malformed or unknown token", async () => {
    const { deps, saved } = world({ [TOKEN]: stored() });
    expect(await answerInvite(deps, "short", "1.2.3.4", yes, NOW)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await answerInvite(deps, OTHER_TOKEN, "1.2.3.4", yes, NOW)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(saved).toEqual([]);
  });

  it("is rate limited per link and per address before anything is read", async () => {
    const { deps, saved } = world({ [TOKEN]: stored() });
    const closed = { hit: () => ({ ok: false as const, retryAfterSeconds: 60 }) };
    expect(await answerInvite({ ...deps, limiters: { ...deps.limiters, token: closed } }, TOKEN, "1.2.3.4", yes, NOW)).toEqual({ ok: false, code: "TOO_MANY_TRIES" });
    expect(await answerInvite({ ...deps, limiters: { ...deps.limiters, address: closed } }, TOKEN, "1.2.3.4", yes, NOW)).toEqual({ ok: false, code: "TOO_MANY_TRIES" });
    expect(saved).toEqual([]);
  });
});

describe("loadInvite and the view (KD-14, KD-17)", () => {
  it("shows the one playdate the token names, and never another", async () => {
    const { store } = world({ [TOKEN]: stored(), [OTHER_TOKEN]: stored({ title: "Playdate: Zoe & Sam", message: "Other plans" }, { inviteId: "invite-2" }) });
    const view = await loadInvite(store, TOKEN, NOW);
    expect(view?.title).toBe("Playdate: Mia & Arjun");
    expect(JSON.stringify(view)).not.toMatch(/Zoe|Other plans|invite-2/);
  });

  it("holds only the listed fields: no phone number, invite id, other invite or token", () => {
    const view = toView(stored(), NOW);
    expect(Object.keys(view).sort()).toEqual(
      ["answer", "confirmed", "end", "label", "message", "mode", "organizerChild", "organizerFirstName", "picks", "placeAddress", "placeFacts", "placeName", "slots", "start", "state", "timeVersion", "title", "zone"].sort(),
    );
    expect(JSON.stringify(view)).not.toMatch(/\+1\d{10}|invite-1/);
  });

  it("says over once the link expired, cancelled, started, or open", () => {
    expect(toView(stored({ linksExpireAt: NOW }), NOW).state).toBe("over");
    expect(toView(stored({ status: "cancelled" }), NOW).state).toBe("cancelled");
    expect(toView(stored({ startAt: NOW }), NOW).state).toBe("started");
    expect(toView(stored(), NOW).state).toBe("open");
  });

  it("shows the final time once confirmed", () => {
    const view = toView(stored({ status: "confirmed", finalStartAt: at("2026-11-16", 10, 30, ZONE), finalEndAt: at("2026-11-16", 11, 30, ZONE) }), NOW);
    expect(view).toMatchObject({ confirmed: true, start: at("2026-11-16", 10, 30, ZONE), end: at("2026-11-16", 11, 30, ZONE) });
  });

  it("finds nothing for a malformed token without asking the store", async () => {
    let asked = 0;
    const store: InviteStore = { findByTokenHash: async () => (asked++, null), findForInvitee: async () => (asked++, null), findPreview: async () => (asked++, null), saveAnswer: async () => {} };
    expect(await loadInvite(store, "../../etc/passwd", NOW)).toBeNull();
    expect(asked).toBe(0);
  });
});

describe("parseAnswerForm", () => {
  const form = (fields: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) f.append(k, v);
    return f;
  };
  it("reads the kind, reason, note and time version; a blank reason or note is none", () => {
    const none = { pickDay: null, pickFrom: null, pickUntil: null };
    expect(parseAnswerForm(form({ kind: "yes", reason: "", note: "", timeVersion: "1" })).data).toEqual({ kind: "yes", reason: null, note: null, timeVersion: 1, ...none });
    expect(parseAnswerForm(form({ kind: "no", reason: "busy", note: "Sorry!", timeVersion: "2" })).data).toEqual({ kind: "no", reason: "busy", note: "Sorry!", timeVersion: 2, ...none });
    expect(parseAnswerForm(form({ kind: "pick", pickDay: "2026-11-16", pickFrom: "09:30", pickUntil: "11:00", timeVersion: "1" })).data).toMatchObject({ kind: "pick", pickDay: "2026-11-16", pickFrom: "09:30", pickUntil: "11:00" });
  });
  it("refuses anything else", () => {
    expect(parseAnswerForm(form({ kind: "maybe", timeVersion: "1" })).success).toBe(false);
    expect(parseAnswerForm(form({ kind: "no", reason: "bored", timeVersion: "1" })).success).toBe(false);
    expect(parseAnswerForm(form({ kind: "yes" })).success).toBe(false);
  });
});

describe("answering availability (T13: KD-04, KD-07, KD-11, KD-17)", () => {
  const MON = "2026-11-16";
  const avail = (patch: Partial<StoredInvite["playdate"]> = {}, rest: Partial<StoredInvite> = {}) =>
    stored({ mode: "availability", startAt: null, endAt: null, slots: [{ day: MON, slot: "morning" }, { day: MON, slot: "afternoon" }], ...patch }, rest);
  const pick = (from: string, until: string, day = MON) => ({ kind: "pick" as const, reason: null, note: null, timeVersion: 1, pickDay: day, pickFrom: from, pickUntil: until });

  it("saves a pick inside one free slot, on the playdate's own clock", async () => {
    const { deps, saved } = world({ [TOKEN]: avail() });
    expect((await answerInvite(deps, TOKEN, "1.2.3.4", pick("09:30", "11:00"), NOW)).ok).toBe(true);
    expect(saved[0]?.answer).toEqual({ kind: "pick", reason: null, note: null, pick: { start: at(MON, 9, 30, ZONE), end: at(MON, 11, 0, ZONE) } });
  });

  it("refuses a pick outside a free slot, across two slots, off the half hour, or too short", async () => {
    const { deps, saved } = world({ [TOKEN]: avail() });
    expect(await answerInvite(deps, TOKEN, "1.2.3.4", pick("09:00", "10:00", "2026-11-18"), NOW)).toMatchObject({ ok: false, code: "PICK_OUTSIDE_FREE_SLOT" });
    expect(await answerInvite(deps, TOKEN, "1.2.3.4", pick("11:00", "13:30"), NOW)).toMatchObject({ ok: false, code: "PICK_OUTSIDE_FREE_SLOT" });
    expect(await answerInvite(deps, TOKEN, "1.2.3.4", pick("09:15", "10:15"), NOW)).toMatchObject({ ok: false, code: "PICK_NOT_HALF_HOUR" });
    expect(await answerInvite(deps, TOKEN, "1.2.3.4", pick("09:00", "09:00"), NOW)).toMatchObject({ ok: false, code: "PICK_TOO_SHORT" });
    expect(saved).toEqual([]);
  });

  it("a pick with no time, or a yes on an availability playdate, is INVALID_ANSWER", async () => {
    const { deps } = world({ [TOKEN]: avail() });
    expect(await answerInvite(deps, TOKEN, "1.2.3.4", { kind: "pick", reason: null, note: null, timeVersion: 1 }, NOW)).toEqual({ ok: false, code: "INVALID_ANSWER", field: "pick" });
    expect(await answerInvite(deps, TOKEN, "1.2.3.4", yes, NOW)).toEqual({ ok: false, code: "INVALID_ANSWER", field: "kind" });
  });

  it("Switch to this: picking another family's range replaces this family's pick", async () => {
    const theirs = { start: at(MON, 9, 30, ZONE), end: at(MON, 11, 0, ZONE) };
    const { deps, store } = world({
      [TOKEN]: avail({}, { picks: [{ inviteId: "invite-2", firstName: "Dev", range: theirs }] }),
    });
    await answerInvite(deps, TOKEN, "1.2.3.4", pick("13:00", "14:00"), NOW);
    await answerInvite(deps, TOKEN, "1.2.3.4", pick("09:30", "11:00"), NOW);
    expect((await loadInvite(store, TOKEN, NOW))?.answer?.pick).toEqual(theirs);
  });

  it("Everyone's picks: grouped, Most picked first, other families by first name only, and Your pick marked", () => {
    const a = { start: at(MON, 9, 0, ZONE), end: at(MON, 12, 0, ZONE) };
    const b = { start: at(MON, 13, 0, ZONE), end: at(MON, 14, 0, ZONE) };
    const view = toView(
      avail({}, {
        picks: [
          { inviteId: "invite-1", firstName: "Sam", range: b },
          { inviteId: "invite-2", firstName: "Dev", range: a },
          { inviteId: "invite-3", firstName: "Maya", range: a },
        ],
      }),
      NOW,
    );
    expect(view.picks).toEqual([
      { range: a, others: ["Dev", "Maya"], families: 2, mostPicked: true, yours: false },
      { range: b, others: [], families: 1, mostPicked: false, yours: true },
    ]);
    expect(JSON.stringify(view)).not.toMatch(/invite-2|invite-3|Patel|Chen/);
  });
});

describe("a Kindred friend, signed in (T15)", () => {
  const INVITE = "11111111-2222-4333-8444-555555555555";
  const setup = () => {
    inviteeOf.set(INVITE, "user-dev");
    return world({ [TOKEN]: stored({}, { inviteId: INVITE }) });
  };

  it("opens their own invite by id: the same view as the link", async () => {
    const { store } = setup();
    expect(await loadInviteForInvitee(store, INVITE, "user-dev", NOW)).toEqual(await loadInvite(store, TOKEN, NOW));
  });
  it("finds nothing for anyone else's invite id, or a malformed one", async () => {
    const { store } = setup();
    expect(await loadInviteForInvitee(store, INVITE, "user-sam", NOW)).toBeNull();
    expect(await loadInviteForInvitee(store, "not-an-id", "user-dev", NOW)).toBeNull();
  });
  it("answers their own invite through the same rules; another user cannot", async () => {
    const { deps, saved } = setup();
    expect(await answerInviteAsInvitee(deps, INVITE, "user-sam", yes, NOW)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await answerInviteAsInvitee(deps, "x", "user-dev", yes, NOW)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(saved).toEqual([]);
    expect((await answerInviteAsInvitee(deps, INVITE, "user-dev", yes, NOW)).ok).toBe(true);
    expect(saved.map((x) => x.inviteId)).toEqual([INVITE]);
    expect(await answerInviteAsInvitee(world({ [TOKEN]: stored({ status: "cancelled" }, { inviteId: INVITE }) }).deps, INVITE, "user-dev", yes, NOW)).toEqual({ ok: false, code: "PLAYDATE_CANCELLED" });
  });
});

describe("Preview what friends see (T27)", () => {
  const dev = { start: at("2026-11-16", 10, 0, ZONE), end: at("2026-11-16", 11, 0, ZONE) };
  const maya = { start: at("2026-11-16", 13, 0, ZONE), end: at("2026-11-16", 14, 0, ZONE) };

  it("is a friend's page with nobody's answer as yours and every family's pick as another family's", async () => {
    const { store } = world({
      [TOKEN]: stored(
        { mode: "availability", startAt: null, endAt: null, slots: [{ day: "2026-11-16", slot: "morning" }, { day: "2026-11-16", slot: "afternoon" }] },
        {
          answer: { kind: "pick", reason: null, note: null, pick: dev },
          picks: [
            { inviteId: "invite-1", firstName: "Dev", range: dev },
            { inviteId: "invite-2", firstName: "Maya", range: maya },
          ],
        },
      ),
    });
    const view = await loadPreview(store, PLAYDATE, "user-alex", NOW);
    expect(view).toMatchObject({ state: "open", title: "Playdate: Mia & Arjun", organizerFirstName: "Alex", answer: null });
    expect(view?.picks.map((p) => ({ others: p.others, yours: p.yours }))).toEqual([
      { others: ["Dev"], yours: false },
      { others: ["Maya"], yours: false },
    ]);
  });

  it("matches what the link shows for set-time, confirmed and cancelled playdates, apart from the answer", async () => {
    for (const patch of [
      {},
      { status: "confirmed" as const, finalStartAt: at("2026-11-16", 10, 30, ZONE), finalEndAt: at("2026-11-16", 11, 30, ZONE) },
      { status: "cancelled" as const },
    ]) {
      const { store } = world({ [TOKEN]: stored(patch, { answer: { kind: "yes", reason: null, note: null, pick: null } }) });
      const link = await loadInvite(store, TOKEN, NOW);
      expect(await loadPreview(store, PLAYDATE, "user-alex", NOW)).toEqual({ ...link, answer: null });
    }
  });

  it("finds nothing for another parent's playdate, or for a malformed id without asking the store", async () => {
    const { store } = world({ [TOKEN]: stored() });
    expect(await loadPreview(store, PLAYDATE, "user-sam", NOW)).toBeNull();
    let asked = 0;
    const counting: InviteStore = { ...store, findPreview: async () => (asked++, null) };
    expect(await loadPreview(counting, "not-a-uuid", "user-alex", NOW)).toBeNull();
    expect(asked).toBe(0);
  });
});
