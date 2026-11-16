// Check-ins during a playdate (T35, KD-18, Q27). Three ways in, one rule (src/lib/rules/checkins.ts): the organizer (session), a
// friend through their link (the token alone decides which invite), and a Kindred friend (invite id + their own user id). The server
// sends nothing: the person checking in may share it from their own phone. Pure apart from the stores and the limiter.
import { createRateLimiter, type RateLimiter } from "@/platform/rate-limit";
import { checkCheckIn, checkInsOpen, mayCheckIn, type CheckInKind, type CheckInPoster, type CheckInTarget } from "@/lib/rules/checkins";
import type { ErrorCode } from "@/lib/rules/types";
import { hashToken } from "./invite-token";
import { TOKEN_PATTERN, type InviteStore, type StoredInvite } from "./invite-page";
import type { OrganizerPlaydate } from "./playdate-page";

/** 20 check-ins per poster per 10 minutes: plenty for a playdate, not for flooding the others' pages. */
export const checkInLimiter = createRateLimiter({ max: 20, windowMs: 10 * 60 * 1000 });

export type StoredCheckIn = { id: string; inviteId: string | null; kind: CheckInKind; note: string | null; createdAt: Date; firstName: string };

export type CheckInStore = {
  add(playdateId: string, inviteId: string | null, kind: CheckInKind, note: string | null, at: Date): Promise<void>;
  /** The playdate's check-ins, newest first, each with the poster's first name only (KD-17). */
  list(playdateId: string): Promise<StoredCheckIn[]>;
};

/** What a page shows: who (first name), what, when, and whether it is the viewer's own. */
export type CheckInView = { id: string; firstName: string; kind: CheckInKind; note: string | null; at: Date; yours: boolean };

/** The check-in part of a page: the list, and whether this viewer may post now. */
export type CheckInPanel = { checkIns: CheckInView[]; canPost: boolean };

export type CheckInResult = { ok: true; kind: CheckInKind; note: string | null } | { ok: false; code: ErrorCode | "NOT_FOUND" | "TOO_MANY_CHECKINS" };

const targetOf = (p: { status: CheckInTarget["status"]; finalStartAt: Date | null; finalEndAt: Date | null }): CheckInTarget => ({
  status: p.status,
  finalStart: p.finalStartAt,
  finalEnd: p.finalEndAt,
});
const posterOf = (s: StoredInvite): CheckInPoster => ({ organizer: false, answer: s.answer && { kind: s.answer.kind, pick: s.answer.pick } });

async function post(
  deps: { checkIns: CheckInStore; limiter: RateLimiter },
  key: string,
  playdateId: string,
  inviteId: string | null,
  target: CheckInTarget,
  poster: CheckInPoster,
  input: { kind: string; note?: string | null },
  now: Date,
): Promise<CheckInResult> {
  const decision = checkCheckIn(target, poster, input, now);
  if (!decision.ok) return { ok: false, code: decision.errors[0]!.code };
  if (!deps.limiter.hit(key).ok) return { ok: false, code: "TOO_MANY_CHECKINS" };
  await deps.checkIns.add(playdateId, inviteId, decision.value.kind, decision.value.note, now);
  return { ok: true, ...decision.value };
}

/** The organizer's own playdate only: `playdate` comes from the organizer-scoped store. */
export function checkInAsOrganizer(deps: { checkIns: CheckInStore; limiter: RateLimiter }, playdate: OrganizerPlaydate, input: { kind: string; note?: string | null }, now: Date) {
  return post(deps, `o:${playdate.id}`, playdate.id, null, targetOf(playdate), { organizer: true }, input, now);
}

export async function checkInByLink(
  deps: { invites: InviteStore; checkIns: CheckInStore; limiter: RateLimiter },
  token: string,
  input: { kind: string; note?: string | null },
  now: Date,
): Promise<CheckInResult> {
  if (!TOKEN_PATTERN.test(token)) return { ok: false, code: "NOT_FOUND" };
  const stored = await deps.invites.findByTokenHash(hashToken(token));
  if (!stored) return { ok: false, code: "NOT_FOUND" };
  return post(deps, `i:${stored.inviteId}`, stored.playdateId, stored.inviteId, targetOf(stored.playdate), posterOf(stored), input, now);
}

export async function checkInAsInvitee(
  deps: { invites: InviteStore; checkIns: CheckInStore; limiter: RateLimiter },
  inviteId: string,
  userId: string,
  input: { kind: string; note?: string | null },
  now: Date,
): Promise<CheckInResult> {
  const stored = /^[0-9a-f-]{36}$/i.test(inviteId) ? await deps.invites.findForInvitee(inviteId, userId) : null;
  if (!stored) return { ok: false, code: "NOT_FOUND" };
  return post(deps, `i:${stored.inviteId}`, stored.playdateId, stored.inviteId, targetOf(stored.playdate), posterOf(stored), input, now);
}

const views = (rows: StoredCheckIn[], mine: string | null) =>
  rows.map((r) => ({ id: r.id, firstName: r.firstName, kind: r.kind, note: r.note, at: r.createdAt, yours: r.inviteId === mine }));

/** The organizer's page: every check-in; the organizer may post while check-ins are open. */
export async function organizerPanel(checkIns: CheckInStore, playdate: OrganizerPlaydate, now: Date): Promise<CheckInPanel> {
  return { checkIns: views(await checkIns.list(playdate.id), null), canPost: checkInsOpen(targetOf(playdate), now) };
}

/** An invite page: every check-in of that playdate, by first name; this family may post while open, if they are coming. */
export async function invitePanel(checkIns: CheckInStore, stored: StoredInvite, now: Date): Promise<CheckInPanel> {
  const target = targetOf(stored.playdate);
  return {
    checkIns: views(await checkIns.list(stored.playdateId), stored.inviteId),
    canPost: checkInsOpen(target, now) && mayCheckIn(target, posterOf(stored)),
  };
}

/** The link's page: the same invite the token opens (null when it opens none). */
export async function panelByLink(invites: InviteStore, checkIns: CheckInStore, token: string, now: Date): Promise<CheckInPanel | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const stored = await invites.findByTokenHash(hashToken(token));
  return stored ? invitePanel(checkIns, stored, now) : null;
}

/** A Kindred friend's invite page: their own invite only. */
export async function panelForInvitee(invites: InviteStore, checkIns: CheckInStore, inviteId: string, userId: string, now: Date): Promise<CheckInPanel | null> {
  const stored = /^[0-9a-f-]{36}$/i.test(inviteId) ? await invites.findForInvitee(inviteId, userId) : null;
  return stored ? invitePanel(checkIns, stored, now) : null;
}
