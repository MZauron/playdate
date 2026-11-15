// The invite page (T09): what a friend sees through their link, and their answer. A friend has no account: the link token is the
// only key, looked up by its sha256 (KD-14). The view holds this one invite and its playdate only, with first names (KD-17): never a
// phone number, another invite, another family's answer, a group, an age or a saved place.
import type { Place } from "@/lib/integrations/places/types";
import { z } from "zod";
import { createRateLimiter, type RateLimiter } from "@/platform/rate-limit";
import { checkAnswer, type Answer } from "@/lib/rules/answers";
import { DECLINE_REASONS, NOTE_MAX_LENGTH, SLOT_ORDER } from "@/lib/rules/config";
import { checkLink, playdateEnd } from "@/lib/rules/links";
import { groupPicks } from "@/lib/rules/picks";
import type { AnswerKind, DeclineReason, ErrorCode, FreeSlot, InviteLabel, PlaydateStatus, Range, TimeMode, Zone } from "@/lib/rules/types";
import { hashToken } from "./invite-token";
import { wallTime } from "./playdates";

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
    /** A searched place (T17), looked up when read; null for a typed place or none. */
    searchedPlace: Place | null;
    message: string;
    timeVersion: number;
    linksExpireAt: Date;
    slots: FreeSlot[];
  };
  organizer: { firstName: string; childFirstName: string | null };
  /** This invite's answer for the current time version, if any. */
  answer: StoredAnswer | null;
  /**
   * Every family's current pick on this playdate (availability, KD-11), this one included, with the parent's first name only.
   * Invite ids never leave toView.
   */
  picks: { inviteId: string; firstName: string; range: Range }[];
};

export type StoredAnswer = { kind: AnswerKind; reason: DeclineReason | null; note: string | null; pick: Range | null };

export type InviteStore = {
  findByTokenHash(tokenHash: string): Promise<StoredInvite | null>;
  /** T15: a Kindred friend's own invite, found by its id and THEIR user id only; anyone else's id finds nothing. */
  findForInvitee(inviteId: string, userId: string): Promise<StoredInvite | null>;
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
  /** A searched place: what the details card shows (indoor/outdoor, ages) and its map link. Nothing else of the provider's. */
  placeFacts: Pick<Place, "setting" | "ages" | "mapsUrl"> | null;
  timeVersion: number;
  answer: StoredAnswer | null;
  /** The organizer's free slots (availability, KD-04). */
  slots: FreeSlot[];
  /**
   * KD-11 Everyone's picks: ranges with the first names of the OTHER families who picked them (KD-17), how many families in all,
   * Most picked, and whether this family's own pick is that range. Empty for a set time.
   */
  picks: { range: Range; others: string[]; families: number; mostPicked: boolean; yours: boolean }[];
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
    placeFacts: p.searchedPlace && { setting: p.searchedPlace.setting, ages: p.searchedPlace.ages, mapsUrl: p.searchedPlace.mapsUrl },
    timeVersion: p.timeVersion,
    answer: stored.answer,
    slots: [...p.slots].sort((a, b) => a.day.localeCompare(b.day) || SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)),
    picks: groupPicks(stored.picks).map((g) => {
      const mine = stored.picks.filter((x) => x.inviteId === stored.inviteId && x.range.start.getTime() === g.range.start.getTime() && x.range.end.getTime() === g.range.end.getTime());
      const others = stored.picks
        .filter((x) => x.inviteId !== stored.inviteId && x.range.start.getTime() === g.range.start.getTime() && x.range.end.getTime() === g.range.end.getTime())
        .map((x) => x.firstName);
      return { range: g.range, others, families: g.families, mostPicked: g.mostPicked, yours: mine.length > 0 };
    }),
  };
}

const isUuid = (id: string) => z.uuid().safeParse(id).success;

/** T15: a Kindred friend's own invite, signed in; null for a malformed id or anyone else's invite. Same view as the link (toView). */
export async function loadInviteForInvitee(store: InviteStore, inviteId: string, userId: string, now: Date): Promise<InviteView | null> {
  if (!isUuid(inviteId)) return null;
  const stored = await store.findForInvitee(inviteId, userId);
  return stored ? toView(stored, now) : null;
}

/** The page's lookup: null when the token is malformed or matches no invite. */
export async function loadInvite(store: InviteStore, token: string, now: Date): Promise<InviteView | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const stored = await store.findByTokenHash(hashToken(token));
  return stored ? toView(stored, now) : null;
}

// --- Answering ---------------------------------------------------------------------------------------------------------------------
export const AnswerForm = z.object({
  kind: z.enum(["yes", "no", "pick"]),
  reason: z.enum(DECLINE_REASONS as [DeclineReason, ...DeclineReason[]]).nullable().default(null),
  note: z.string().max(NOTE_MAX_LENGTH * 4).nullable().default(null), // the rule checks the real limit; this only bounds the input
  timeVersion: z.coerce.number().int().min(1),
  /** A pick (availability, KD-04): one day with from/until on the playdate's own clock, "2026-11-16", "09:30", "11:00". */
  pickDay: z.string().max(10).nullable().default(null),
  pickFrom: z.string().max(5).nullable().default(null),
  pickUntil: z.string().max(5).nullable().default(null),
});
export type AnswerForm = z.infer<typeof AnswerForm>;
/** What answerInvite takes: the form, with the pick fields optional for a yes or a no. */
export type AnswerInput = Omit<AnswerForm, "pickDay" | "pickFrom" | "pickUntil"> & Partial<Pick<AnswerForm, "pickDay" | "pickFrom" | "pickUntil">>;

/** What the answer form posts. A blank reason or note counts as none. */
export function parseAnswerForm(form: FormData): z.ZodSafeParseResult<AnswerForm> {
  const text = (name: string) => {
    const v = form.get(name);
    return typeof v === "string" && v !== "" ? v : null;
  };
  return AnswerForm.safeParse({
    kind: text("kind"),
    reason: text("reason"),
    note: text("note"),
    timeVersion: text("timeVersion"),
    pickDay: text("pickDay"),
    pickFrom: text("pickFrom"),
    pickUntil: text("pickUntil"),
  });
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

/** The pick's instants on the playdate's own clock (KD-16); null when it is missing or malformed (the rule then says INVALID_ANSWER). */
function pickRange(form: AnswerInput, zone: Zone): Range | null {
  if (form.kind !== "pick" || !form.pickDay || !form.pickFrom || !form.pickUntil) return null;
  const start = wallTime(form.pickDay, form.pickFrom, zone);
  const end = wallTime(form.pickDay, form.pickUntil, zone);
  return start && end ? { start, end } : null;
}

/** KD-07 through rules/answers.ts. Nothing about who answers comes from the form: the token decides which invite this is. */
export async function answerInvite(deps: AnswerDeps, token: string, address: string, form: AnswerInput, now: Date): Promise<AnswerResult> {
  if (!TOKEN_PATTERN.test(token)) return { ok: false, code: "NOT_FOUND" };
  const tokenHash = hashToken(token);
  if (!deps.limiters.address.hit(address).ok || !deps.limiters.token.hit(tokenHash).ok) return { ok: false, code: "TOO_MANY_TRIES" };
  return answerStored(deps.store, await deps.store.findByTokenHash(tokenHash), form, now);
}

/** T15: a Kindred friend answers signed in. The invite must be theirs (`invitee_user_id` = the session's user); the id only names it. */
export async function answerInviteAsInvitee(deps: AnswerDeps, inviteId: string, userId: string, form: AnswerInput, now: Date): Promise<AnswerResult> {
  if (!isUuid(inviteId)) return { ok: false, code: "NOT_FOUND" };
  if (!deps.limiters.token.hit(`invite:${inviteId}`).ok) return { ok: false, code: "TOO_MANY_TRIES" };
  return answerStored(deps.store, await deps.store.findForInvitee(inviteId, userId), form, now);
}

/** KD-07 through rules/answers.ts, for one invite already found. The same for both ways in. */
async function answerStored(store: InviteStore, stored: StoredInvite | null, form: AnswerInput, now: Date): Promise<AnswerResult> {
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
    { kind: form.kind, reason: form.reason, note: form.note, timeVersion: form.timeVersion, pick: pickRange(form, p.timezone) },
    now,
  );
  if (!decision.ok) {
    const first = decision.errors[0]!;
    return { ok: false, code: first.code, field: first.field };
  }
  await store.saveAnswer(stored.inviteId, decision.value, p.timeVersion, now);
  return { ok: true, answer: decision.value };
}
