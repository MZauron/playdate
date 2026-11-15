// The invite page (T09): what a friend sees through their link, and their answer. A friend has no account: the link token is the
// only key, looked up by its sha256 (KD-14). The view holds this one invite and its playdate only, with first names (KD-17): never a
// phone number, another invite, another family's answer, a group, an age or a saved place.
import { z } from "zod";
import { createRateLimiter, type RateLimiter } from "@/platform/rate-limit";
import { checkAnswer, type Answer } from "@/lib/rules/answers";
import { DECLINE_REASONS, NOTE_MAX_LENGTH } from "@/lib/rules/config";
import { checkLink, playdateEnd } from "@/lib/rules/links";
import type { AnswerKind, DeclineReason, ErrorCode, FreeSlot, InviteLabel, PlaydateStatus, TimeMode, Zone } from "@/lib/rules/types";
import { hashToken } from "./invite-token";

/** 22 characters of base64url (KD-14). Anything else is not a link Kindred made. */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

// --- What the store returns for one token ------------------------------------------------------------------------------------
export type StoredInvite = {
  inviteId: string;
  label: InviteLabel;
  playdate: {
    title: string;
    mode: TimeMode;
    status: PlaydateStatus;
    timezone: Zone;
    startAt: Date | null;
    endAt: Date | null;
    finalStartAt: Date | null;
    finalEndAt: Date | null;
    placeName: string | null;
    placeAddress: string | null;
    message: string;
    timeVersion: number;
    linksExpireAt: Date;
    slots: FreeSlot[];
  };
  organizer: { firstName: string; childFirstName: string | null };
  /** This invite's answer for the current time version, if any. */
  answer: { kind: AnswerKind; reason: DeclineReason | null; note: string | null } | null;
};

export type InviteStore = {
  findByTokenHash(tokenHash: string): Promise<StoredInvite | null>;
  /** Replaces this invite's answer (KD-07: one current answer per invite). */
  saveAnswer(inviteId: string, answer: Answer, timeVersion: number, answeredAt: Date): Promise<void>;
};

// --- What the page shows -----------------------------------------------------------------------------------------------------------
/** open: answers accepted. started / over / cancelled: the page says so and takes no answer. */
export type InviteState = "open" | "started" | "over" | "cancelled";

export type InviteView = {
  state: InviteState;
  organizerFirstName: string;
  organizerChild: string | null;
  title: string;
  label: InviteLabel;
  message: string;
  mode: TimeMode;
  zone: Zone;
  /** The final time once confirmed, else the set time; null for an availability playdate nobody has confirmed. */
  start: Date | null;
  end: Date | null;
  confirmed: boolean;
  placeName: string | null;
  placeAddress: string | null;
  timeVersion: number;
  answer: { kind: AnswerKind; reason: DeclineReason | null; note: string | null } | null;
};

function stateOf(p: StoredInvite["playdate"], now: Date): InviteState {
  if (p.status === "cancelled") return "cancelled";
  if (!checkLink(p.linksExpireAt, now).ok) return "over";
  const startsAt = p.finalStartAt ?? p.startAt;
  if (startsAt && now >= startsAt) return "started";
  return "open";
}

/** Builds the view from one stored invite. Only the fields listed in InviteView leave this function. */
export function toView(stored: StoredInvite, now: Date): InviteView {
  const p = stored.playdate;
  const confirmed = p.status === "confirmed";
  return {
    state: stateOf(p, now),
    organizerFirstName: stored.organizer.firstName,
    organizerChild: stored.organizer.childFirstName,
    title: p.title,
    label: stored.label,
    message: p.message,
    mode: p.mode,
    zone: p.timezone,
    start: confirmed ? p.finalStartAt : p.startAt,
    end: confirmed ? p.finalEndAt : (p.endAt ?? (p.slots.length ? playdateEnd({ finalEnd: null, setEnd: null, slots: p.slots, zone: p.timezone }) : null)),
    confirmed,
    placeName: p.placeName,
    placeAddress: p.placeAddress,
    timeVersion: p.timeVersion,
    answer: stored.answer,
  };
}

/** The page's lookup: null when the token is malformed or matches no invite. */
export async function loadInvite(store: InviteStore, token: string, now: Date): Promise<InviteView | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const stored = await store.findByTokenHash(hashToken(token));
  return stored ? toView(stored, now) : null;
}

// --- Answering ---------------------------------------------------------------------------------------------------------------------
export const AnswerForm = z.object({
  kind: z.enum(["yes", "no"]),
  reason: z.enum(DECLINE_REASONS as [DeclineReason, ...DeclineReason[]]).nullable().default(null),
  note: z.string().max(NOTE_MAX_LENGTH * 4).nullable().default(null), // the rule checks the real limit; this only bounds the input
  timeVersion: z.coerce.number().int().min(1),
});
export type AnswerForm = z.infer<typeof AnswerForm>;

/** What the answer form posts. A blank reason or note counts as none. */
export function parseAnswerForm(form: FormData): z.ZodSafeParseResult<AnswerForm> {
  const text = (name: string) => {
    const v = form.get(name);
    return typeof v === "string" && v !== "" ? v : null;
  };
  return AnswerForm.safeParse({ kind: text("kind"), reason: text("reason"), note: text("note"), timeVersion: text("timeVersion") });
}

/** Per link: 20 answers in 15 minutes is a lot of changing one's mind. Per address: 60, for a family sharing a phone or Wi-Fi. */
export const answerLimiters = {
  token: createRateLimiter({ max: 20, windowMs: 15 * 60 * 1000 }),
  address: createRateLimiter({ max: 60, windowMs: 15 * 60 * 1000 }),
};
/** Page views per address: enough for anyone with a few links, not for guessing tokens. */
export const viewLimiter = createRateLimiter({ max: 120, windowMs: 15 * 60 * 1000 });

export type AnswerDeps = { store: InviteStore; limiters: { token: RateLimiter; address: RateLimiter } };

export type AnswerErrorCode = ErrorCode | "NOT_FOUND" | "TOO_MANY_TRIES";
export type AnswerResult = { ok: true; answer: Answer } | { ok: false; code: AnswerErrorCode; field?: string };

/** KD-07 through rules/answers.ts. Nothing about who answers comes from the form: the token decides which invite this is. */
export async function answerInvite(deps: AnswerDeps, token: string, address: string, form: AnswerForm, now: Date): Promise<AnswerResult> {
  if (!TOKEN_PATTERN.test(token)) return { ok: false, code: "NOT_FOUND" };
  const tokenHash = hashToken(token);
  if (!deps.limiters.address.hit(address).ok || !deps.limiters.token.hit(tokenHash).ok) return { ok: false, code: "TOO_MANY_TRIES" };

  const stored = await deps.store.findByTokenHash(tokenHash);
  if (!stored) return { ok: false, code: "NOT_FOUND" };
  const p = stored.playdate;
  const decision = checkAnswer(
    {
      status: p.status,
      mode: p.mode,
      timeVersion: p.timeVersion,
      startsAt: p.finalStartAt ?? p.startAt,
      linkExpiresAt: p.linksExpireAt,
      slots: p.slots,
      zone: p.timezone,
    },
    { kind: form.kind, reason: form.reason, note: form.note, timeVersion: form.timeVersion },
    now,
  );
  if (!decision.ok) {
    const first = decision.errors[0]!;
    return { ok: false, code: first.code, field: first.field };
  }
  await deps.store.saveAnswer(stored.inviteId, decision.value, p.timeVersion, now);
  return { ok: true, answer: decision.value };
}
