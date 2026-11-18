// Send invite (T08): the Plan screen's form → src/lib/rules/plan.ts → one playdate with one invite (and one link) per friend.
// The organizer is always the signed-in parent the caller passes in; the friend ids in the form only name friends, and only the
// organizer's own friends are ever invited. Pure apart from the ports passed in.
import { z } from "zod";
import { createRateLimiter, type RateLimiter } from "@/platform/rate-limit";
import { PLACE_ID_PATTERN, type Places } from "@/lib/integrations/places/types";
import { DEFAULT_ZONE } from "@/lib/rules/config";
import { linkExpiresAt } from "@/lib/rules/links";
import { checkChildren, checkPlan, playdateTitle, type PlanTime } from "@/lib/rules/plan";
import { at } from "@/lib/rules/time";
import type { DaySlot, ErrorCode, FreeSlot, InviteChannel, Zone } from "@/lib/rules/types";
import { inviteLink, newInviteToken } from "./invite-token";
import { textBody } from "./text-message";

export const NAME_MAX = 40;
export const PLACE_NAME_MAX = 80;
export const PLACE_ADDRESS_MAX = 200;
/** More friends than this in one playdate is not a playdate (and keeps one request small). */
export const MAX_INVITEES = 50;

// --- What the form posts ------------------------------------------------------------------------------------------------------
export type PlanFormInput = {
  friendIds: string[];
  /** T41: which of the organizer's children it is for (ids; only their own count, KD-06). */
  childIds?: string[];
  mode: string;
  day: string;
  startTime: string;
  endTime: string;
  /** Share availability (T12): "2026-11-16|morning", one per free slot ticked on the grid. */
  slots: string[];
  zone: string;
  placeName: string;
  placeAddress: string;
  savePlace: boolean;
  /** Find a place (T17): the provider's id of the place the parent selected; when set, the typed place is ignored. */
  placeId: string;
  yourName: string;
  message: string;
};

/** Everything else in the form (an organizer id, a title, a phone number, a token) is ignored. */
export function parsePlanForm(form: FormData): PlanFormInput {
  const text = (name: string) => String(form.get(name) ?? "");
  return {
    friendIds: form.getAll("friendId").map(String),
    childIds: form.getAll("childId").map(String),
    mode: text("mode"),
    day: text("day"),
    startTime: text("startTime"),
    endTime: text("endTime"),
    slots: form.getAll("slot").map(String),
    zone: text("zone"),
    placeName: text("placeName"),
    placeAddress: text("placeAddress"),
    savePlace: form.get("savePlace") === "1",
    placeId: text("placeId"),
    yourName: text("yourName"),
    message: text("message"), // exactly as typed (KD-05)
  };
}

// --- Wall-clock times on the playdate's own clock (KD-16) ---------------------------------------------------------------------------
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** The organizer's browser zone, if it is one this server knows; otherwise the rules' default. */
export function zoneOrDefault(zone: string): Zone {
  if (!zone) return DEFAULT_ZONE;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: zone });
    return zone;
  } catch {
    return DEFAULT_ZONE;
  }
}

/** "2026-11-16" + "10:00" in a zone → the instant, or null when either part is missing or malformed. */
export function wallTime(day: string, time: string, zone: Zone): Date | null {
  const t = TIME.exec(time);
  if (!DAY.test(day) || !t) return null;
  const instant = at(day, Number(t[1]), Number(t[2]), zone);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

const DAY_SLOTS: readonly DaySlot[] = ["morning", "afternoon", "evening"];

/** "2026-11-16|morning" → a free slot; anything malformed is dropped (the rules then see fewer slots, or none: NO_FREE_SLOTS). */
export function parseSlots(values: readonly string[]): FreeSlot[] {
  return values.flatMap((v) => {
    const [day, slot] = v.split("|");
    return day && DAY.test(day) && DAY_SLOTS.includes(slot as DaySlot) ? [{ day, slot: slot as DaySlot }] : [];
  }).slice(0, 7 * 3 * 8); // eight weeks of slots at most
}

// --- The store the service talks to (src/lib/db/playdates.ts is the real one) ----------------------------------------------------
/** One of the organizer's friends, as Send needs it. No phone number: Kindred keeps none (Q26). */
export type InviteeFriend = {
  id: string;
  parentName: string;
  childFirstName: string | null;
  label: string;
  kindredUserId: string | null;
};

export type NewInvite = { friendId: string; inviteeUserId: string | null; channel: InviteChannel; tokenHash: string };

export type NewPlaydate = {
  organizerId: string;
  title: string;
  mode: "set_time" | "availability";
  timezone: Zone;
  /** Set time only (KD-02). */
  startAt: Date | null;
  endAt: Date | null;
  /** Share availability only (KD-02, KD-04). */
  slots: FreeSlot[];
  /** Typed places only. */
  placeName: string | null;
  placeAddress: string | null;
  /** Searched places only, and then nothing else about the place is stored (Q6, migration 0008). */
  placeProviderId: string | null;
  message: string;
  linksExpireAt: Date;
  invites: NewInvite[];
  /** T41: the organizer's children it is for. */
  childIds: string[];
};

export type PlaydateStore = {
  /** THIS owner's friends among these ids, in the owner's list order; ids of anyone else's friends are simply not found. */
  friendsForInvite(ownerId: string, friendIds: readonly string[]): Promise<InviteeFriend[]>;
  /** Writes the playdate and its invites together; returns the playdate id. */
  createPlaydate(playdate: NewPlaydate): Promise<string>;
  /** ☆ Save this place: a typed place in the owner's saved places. Saving the same name again keeps the first. */
  saveTypedPlace(ownerId: string, name: string, address: string): Promise<void>;
  /** "Your name" on the Plan screen is the name friends see (`profiles.first_name`, Q18 default). */
  setFirstName(ownerId: string, firstName: string): Promise<void>;
};

// --- Send ---------------------------------------------------------------------------------------------------------------------------
export type PlanErrorCode = ErrorCode | "NAME_REQUIRED" | "PLACE_NAME_REQUIRED" | "ADDRESS_REQUIRED" | "PLACE_NOT_FOUND" | "TOO_MANY_PLAYDATES";
export type PlanError = { code: PlanErrorCode; field?: string };

/** One "Text Aisha" button: opens the organizer's Messages with that friend's number, the message and that friend's link (Q3). */
/** One family's text: who it is for (first name and label, never a number) and the text itself, shared from the organizer's phone. */
export type TextToSend = { friendId: string; name: string; label: string; channel: InviteChannel; body: string };

export type SendResult = { ok: true; playdateId: string; texts: TextToSend[] } | { ok: false; errors: PlanError[]; retryAfterSeconds?: number };

/** 30 playdates per organizer per hour: more than any parent plans, few enough to stop a script making links. */
export const playdatesLimiter = createRateLimiter({ max: 30, windowMs: 60 * 60 * 1000 });

export type SendDeps = {
  store: PlaydateStore;
  /** Checks that a selected place exists (the id comes from the browser). */
  places: Pick<Places, "details">;
  limiter: RateLimiter;
  linkBase: string;
  newToken?: () => { token: string; tokenHash: string };
};

/** `children` (T41): the organizer's own children, in their order; without it the title uses `childFirstName` alone. */
export type Organizer = { id: string; firstName: string; childFirstName: string; children?: readonly { id: string; firstName: string }[] };

/** KD-06 (T41): the organizer's children this plan is for, and their names for the title. */
export function chosenChildren(organizer: Organizer, childIds: readonly string[] | undefined): { ok: true; ids: string[]; names: string[] } | { ok: false; errors: PlanError[] } {
  if (!organizer.children?.length) return { ok: true, ids: [], names: organizer.childFirstName ? [organizer.childFirstName] : [] };
  const decision = checkChildren(
    organizer.children.map((c) => c.id),
    childIds ?? [],
  );
  if (!decision.ok) return { ok: false, errors: decision.errors };
  const names = new Map(organizer.children.map((c) => [c.id, c.firstName]));
  return { ok: true, ids: decision.value, names: decision.value.map((id) => names.get(id)!) };
}

const isId = (id: string) => z.uuid().safeParse(id).success;

/** "Aisha Khan" → "Aisha", for the button. */
export function firstWord(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export type CheckedPlanForm =
  | {
      ok: true;
      plan: { time: PlanTime; message: string };
      yourName: string;
      placeName: string | null;
      placeAddress: string | null;
      placeProviderId: string | null;
    }
  | { ok: false; errors: PlanError[] };

/**
 * KD-02…06 through rules/plan.ts, plus the Details checks (your name, place name with an address, an address to save a place).
 * Every refusal at once. Used by Send invite and Send update, so the two can never disagree.
 */
export function checkPlanForm(input: PlanFormInput, inviteeCount: number, zone: Zone, now: Date): CheckedPlanForm {
  const errors: PlanError[] = [];
  const plan = checkPlan(
    {
      mode: input.mode === "set_time" || input.mode === "availability" ? input.mode : null,
      start: wallTime(input.day, input.startTime, zone),
      end: wallTime(input.day, input.endTime, zone),
      slots: parseSlots(input.slots),
      message: input.message,
      inviteeCount,
      zone,
    },
    now,
  );
  if (!plan.ok) errors.push(...plan.errors);

  const yourName = input.yourName.trim();
  if (!yourName || yourName.length > NAME_MAX) errors.push({ code: "NAME_REQUIRED", field: "yourName" });

  // A selected place wins over a typed one; whether the id is real is checked against the provider (checkSelectedPlace).
  const placeProviderId = input.placeId.trim() || null;
  if (placeProviderId && !PLACE_ID_PATTERN.test(placeProviderId)) errors.push({ code: "PLACE_NOT_FOUND", field: "place" });
  const placeName = placeProviderId ? null : input.placeName.trim().slice(0, PLACE_NAME_MAX) || null;
  const placeAddress = placeProviderId ? null : input.placeAddress.trim().slice(0, PLACE_ADDRESS_MAX) || null;
  if (placeAddress && !placeName) errors.push({ code: "PLACE_NAME_REQUIRED", field: "placeName" });
  if (input.savePlace && placeName && !placeAddress) errors.push({ code: "ADDRESS_REQUIRED", field: "placeAddress" });

  if (!plan.ok || errors.length) return { ok: false, errors };
  return { ok: true, plan: { time: plan.value.time, message: plan.value.message }, yourName, placeName, placeAddress, placeProviderId };
}

/**
 * The selected place's id came from the browser: the provider must know it. Returns the place's name to use in this answer's
 * texts (never stored), or an error. A provider that fails counts as not found, so nothing unverified is stored.
 */
export async function checkSelectedPlace(
  places: Pick<Places, "details">,
  placeProviderId: string | null,
): Promise<{ ok: true; shownName: string | null } | { ok: false; errors: PlanError[] }> {
  if (!placeProviderId) return { ok: true, shownName: null };
  const place = await places.details(placeProviderId).catch(() => null);
  return place ? { ok: true, shownName: place.name } : { ok: false, errors: [{ code: "PLACE_NOT_FOUND", field: "place" }] };
}

/**
 * `organizer` comes from the session (`requireParent`). Returns every refusal at once so the screen can show them together; nothing
 * is written unless all of them pass.
 */
export async function sendInvite(deps: SendDeps, organizer: Organizer, input: PlanFormInput, now: Date): Promise<SendResult> {
  const zone = zoneOrDefault(input.zone);
  const ids = [...new Set(input.friendIds.filter(isId))].slice(0, MAX_INVITEES);
  const friends = ids.length ? await deps.store.friendsForInvite(organizer.id, ids) : [];

  const checked = checkPlanForm(input, friends.length, zone, now);
  const kids = chosenChildren(organizer, input.childIds);
  if (!checked.ok || !kids.ok) return { ok: false, errors: [...(kids.ok ? [] : kids.errors), ...(checked.ok ? [] : checked.errors)] };
  const { plan, yourName, placeName, placeAddress, placeProviderId } = checked;
  const place = await checkSelectedPlace(deps.places, placeProviderId);
  if (!place.ok) return place;

  // A try counts once the plan is complete: only a sendable plan makes links.
  const attempt = deps.limiter.hit(organizer.id);
  if (!attempt.ok) return { ok: false, errors: [{ code: "TOO_MANY_PLAYDATES" }], retryAfterSeconds: attempt.retryAfterSeconds };

  const time = plan.time; // KD-02: exactly one mode; the other one's fields are empty
  const newToken = deps.newToken ?? newInviteToken;
  const links = friends.map((friend) => ({ friend, ...newToken() }));

  const playdateId = await deps.store.createPlaydate({
    organizerId: organizer.id,
    // KD-06: the organizer's chosen children (T41), then one child per invited family, the first (Q4 default).
    title: playdateTitle(kids.names, friends.map((f) => f.childFirstName).filter((n): n is string => !!n)),
    childIds: kids.ids,
    mode: time.mode,
    timezone: zone,
    startAt: time.start,
    endAt: time.end,
    slots: time.slots,
    placeName,
    placeAddress,
    placeProviderId,
    message: plan.message,
    linksExpireAt: linkExpiresAt({ finalEnd: null, setEnd: time.end, slots: time.slots, zone }), // KD-14: set end, else the last slot
    invites: links.map(({ friend, tokenHash }) => ({
      friendId: friend.id,
      inviteeUserId: friend.kindredUserId,
      channel: friend.kindredUserId ? "app" : "text",
      tokenHash, // only the hash is stored (KD-14)
    })),
  });

  if (yourName !== organizer.firstName) await deps.store.setFirstName(organizer.id, yourName);
  if (input.savePlace && placeName && placeAddress) await deps.store.saveTypedPlace(organizer.id, placeName, placeAddress);

  // Q11 default: a Kindred friend has no push yet (Phase 3), so they get a Text button too and nobody misses the invite.
  const texts = links.map(({ friend, token }) => ({
    friendId: friend.id,
    name: firstWord(friend.parentName),
    label: friend.label,
    channel: (friend.kindredUserId ? "app" : "text") as InviteChannel,
    body: textBody(plan.message, inviteLink(deps.linkBase, token)),
  }));
  return { ok: true, playdateId, texts };
}
