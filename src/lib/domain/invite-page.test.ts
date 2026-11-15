// The invite page through the service with an in-memory store: a valid answer, a change of answer, an expired link, a stale time
// version, a cancelled playdate, and that the view never holds a phone number or another playdate (T09 "done when").
import { describe, expect, it } from "vitest";
import type { Answer } from "@/lib/rules/answers";
import { at } from "@/lib/rules/time";
import { answerInvite, loadInvite, parseAnswerForm, toView, type AnswerDeps, type InviteStore, type StoredInvite } from "./invite-page";
import { hashToken } from "./invite-token";

const ZONE = "America/Toronto";
const NOW = at("2026-11-14", 10, 0, ZONE);
const TOKEN = "AAAAAAAAAAAAAAAAAAAAAA"; // 22 characters, as Kindred makes them
const OTHER_TOKEN = "BBBBBBBBBBBBBBBBBBBBBB";

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
      message: "Park at 10?",
      timeVersion: 1,
      linksExpireAt: at("2026-11-17", 0, 0, ZONE),
      slots: [],
      ...patch,
    },
    organizer: { firstName: "Alex", childFirstName: "Mia" },
    answer: null,
    ...rest,
  };
}

/** One invite per token hash; saved answers are kept so a test can read them back. */
function world(byToken: Record<string, StoredInvite>) {
  const invites = new Map(Object.entries(byToken).map(([token, s]) => [hashToken(token), structuredClone(s)]));
  const saved: { inviteId: string; answer: Answer; timeVersion: number }[] = [];
  const store: InviteStore = {
    async findByTokenHash(hash) {
      return invites.get(hash) ?? null;
    },
    async saveAnswer(inviteId, answer, timeVersion) {
      saved.push({ inviteId, answer, timeVersion });
      for (const s of invites.values()) if (s.inviteId === inviteId) s.answer = { kind: answer.kind, reason: answer.reason, note: answer.note };
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
    expect((await loadInvite(store, TOKEN, NOW))?.answer).toEqual({ kind: "yes", reason: null, note: null });
    await answerInvite(deps, TOKEN, "1.2.3.4", noBusy, NOW);
    expect((await loadInvite(store, TOKEN, NOW))?.answer).toEqual({ kind: "no", reason: "busy", note: "Sorry!" });
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
      ["answer", "confirmed", "end", "label", "message", "mode", "organizerChild", "organizerFirstName", "placeAddress", "placeName", "start", "state", "timeVersion", "title", "zone"].sort(),
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
    const store: InviteStore = { findByTokenHash: async () => (asked++, null), saveAnswer: async () => {} };
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
    expect(parseAnswerForm(form({ kind: "yes", reason: "", note: "", timeVersion: "1" })).data).toEqual({ kind: "yes", reason: null, note: null, timeVersion: 1 });
    expect(parseAnswerForm(form({ kind: "no", reason: "busy", note: "Sorry!", timeVersion: "2" })).data).toEqual({ kind: "no", reason: "busy", note: "Sorry!", timeVersion: 2 });
  });
  it("refuses anything else", () => {
    expect(parseAnswerForm(form({ kind: "pick", timeVersion: "1" })).success).toBe(false);
    expect(parseAnswerForm(form({ kind: "no", reason: "bored", timeVersion: "1" })).success).toBe(false);
    expect(parseAnswerForm(form({ kind: "yes" })).success).toBe(false);
  });
});
