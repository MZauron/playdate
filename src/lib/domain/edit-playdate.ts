// Edit playdate and Send update (T16, KD-10). The organizer is the signed-in parent the caller passes in; the playdate id names a
// playdate, and only the organizer's own is found. rules/plan.ts checks the new plan, rules/edit.ts decides what changes, and the
// store applies it in one step. Pure apart from the ports passed in.
import type { Places } from "@/lib/integrations/places/types";
import { createRateLimiter, type RateLimiter } from "@/platform/rate-limit";
import { enCA, formatShortDay, formatTimeRange } from "@/lib/i18n/en-CA";
import { planEdit, type EditState } from "@/lib/rules/edit";
import { linkExpiresAt } from "@/lib/rules/links";
import { playdateTitle } from "@/lib/rules/plan";
import type { FreeSlot, InviteChannel, InviteLabel, PlaydateStatus, TimeMode } from "@/lib/rules/types";
import { inviteLink, newInviteToken } from "./invite-token";
import { isPlaydateId, type OrganizerPlaydate, type PlaydatePageStore } from "./playdate-page";
import { checkPlanForm, checkSelectedPlace, firstWord, MAX_INVITEES, type NewInvite, type PlanError, type PlanFormInput, type PlaydateStore, type TextToSend } from "./playdates";
import { textBody } from "./text-message";

export type PlaydateUpdate = {
  title: string;
  mode: "set_time" | "availability";
  startAt: Date | null;
  endAt: Date | null;
  /** The free slots, rewritten each time (none for a set time, KD-02). */
  slots: FreeSlot[];
  placeName: string | null;
  placeAddress: string | null;
  placeProviderId: string | null;
  message: string;
  linksExpireAt: Date;
  timeVersion: number;
  status: PlaydateStatus;
  clearFinal: boolean;
  add: NewInvite[];
  removeFriendIds: string[];
  deleteAnswers: boolean;
  label: InviteLabel | null;
};

export type ApplyUpdate = (organizerId: string, playdateId: string, update: PlaydateUpdate) => Promise<void>;

export type UpdateDeps = {
  pages: PlaydatePageStore;
  places: Pick<Places, "details">;
  playdates: PlaydateStore;
  apply: ApplyUpdate;
  limiter: RateLimiter;
  linkBase: string;
  newToken?: () => { token: string; tokenHash: string };
};

/** 60 updates per organizer per hour. */
export const updatesLimiter = createRateLimiter({ max: 60, windowMs: 60 * 60 * 1000 });

export type UpdateResult =
  | { ok: true; changed: false }
  | { ok: true; changed: true; kind: "new_time" | "updated"; texts: TextToSend[] }
  | { ok: false; errors: PlanError[] | { code: "NOT_FOUND" | "PLAYDATE_CANCELLED" | "TOO_MANY_PLAYDATES" }[] };

/** The Plan form, filled in from a playdate (the Edit playdate screen), in the playdate's own zone (KD-16). */
export function editFormValues(p: OrganizerPlaydate, zone = p.timezone) {
  const clock = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return {
    friendIds: p.invites.map((i) => i.friendId),
    mode: p.mode as TimeMode,
    slots: p.slots.map((s) => `${s.day}|${s.slot}`),
    day: p.startAt ? day(p.startAt) : "",
    start: p.startAt ? clock(p.startAt) : "",
    end: p.endAt ? clock(p.endAt) : "",
    // A searched place comes back as the selected place; only a typed one fills the Details fields.
    place: p.searchedPlace,
    placeName: p.searchedPlace ? "" : (p.placeName ?? ""),
    placeAddress: p.searchedPlace ? "" : (p.placeAddress ?? ""),
    message: p.message,
  };
}

/**
 * Q19 default: the update text is Kindred's short sentence with the new day, time and place, and no link. Links never change (only
 * their hashes are stored), and the first text with the link is right above it in the same Messages thread.
 */
export function updateSentence(kind: "new_time" | "updated", start: Date | null, end: Date | null, zone: string, place: string | null): string {
  // Share availability before confirmation: there is no one time to name, only free times to pick from (T12).
  if (!start || !end) return kind === "new_time" ? enCA.updateTexts.newTimes(place) : enCA.updateTexts.updatedNoTime(place);
  const words = kind === "new_time" ? enCA.updateTexts.newTime : enCA.updateTexts.updated;
  return words(formatShortDay(start, zone), formatTimeRange(start, end, zone), place);
}

/** KD-10 compares places: a searched place by its provider id alone (its name is looked up, not stored); a typed one by name and address. */
function editablePlace(providerId: string | null, name: string | null, address: string | null): EditState["place"] {
  if (providerId) return { name: "", address: null, providerPlaceId: providerId };
  return name ? { name, address, providerPlaceId: null } : null;
}

export async function sendUpdate(deps: UpdateDeps, organizer: { id: string; firstName: string; childFirstName: string }, playdateId: string, input: PlanFormInput, now: Date): Promise<UpdateResult> {
  if (!isPlaydateId(playdateId)) return { ok: false, errors: [{ code: "NOT_FOUND" }] };
  const p = await deps.pages.getForOrganizer(organizer.id, playdateId);
  if (!p) return { ok: false, errors: [{ code: "NOT_FOUND" }] };
  if (p.status === "cancelled") return { ok: false, errors: [{ code: "PLAYDATE_CANCELLED" }] };

  const zone = p.timezone; // the zone stays the one the playdate was made in (KD-16), whatever the browser says now
  const ids = [...new Set(input.friendIds)].slice(0, MAX_INVITEES);
  const friends = ids.length ? await deps.playdates.friendsForInvite(organizer.id, ids) : [];

  const checked = checkPlanForm(input, friends.length, zone, now);
  if (!checked.ok) return { ok: false, errors: checked.errors };
  const { plan, yourName, placeName, placeAddress, placeProviderId } = checked;
  const selected = await checkSelectedPlace(deps.places, placeProviderId);
  if (!selected.ok) return { ok: false, errors: selected.errors };

  const before: EditState = {
    time: { mode: p.mode, start: p.startAt, end: p.endAt, slots: p.slots },
    place: editablePlace(p.searchedPlace?.id ?? null, p.placeName, p.placeAddress),
    message: p.message,
    friendIds: p.invites.map((i) => i.friendId),
  };
  const after: EditState = {
    time: { mode: plan.time.mode, start: plan.time.start, end: plan.time.end, slots: plan.time.slots },
    place: editablePlace(placeProviderId, placeName, placeAddress),
    message: plan.message,
    friendIds: friends.map((f) => f.id),
  };
  const edit = planEdit({ status: p.status, timeVersion: p.timeVersion }, before, after);

  if (yourName !== organizer.firstName) await deps.playdates.setFirstName(organizer.id, yourName);
  if (input.savePlace && placeName && placeAddress) await deps.playdates.saveTypedPlace(organizer.id, placeName, placeAddress);
  if (!edit.changed) return { ok: true, changed: false };

  const attempt = deps.limiter.hit(organizer.id);
  if (!attempt.ok) return { ok: false, errors: [{ code: "TOO_MANY_PLAYDATES" }] };

  const newToken = deps.newToken ?? newInviteToken;
  const added = friends.filter((f) => edit.addFriendIds.includes(f.id)).map((friend) => ({ friend, ...newToken() }));
  const staysConfirmed = edit.status === "confirmed";
  const finalEnd = staysConfirmed ? p.finalEndAt : null;

  await deps.apply(organizer.id, playdateId, {
    // KD-06: the title follows the families now invited (first child each, Q4 default).
    title: playdateTitle(organizer.childFirstName, friends.map((f) => f.childFirstName).filter((n): n is string => !!n)),
    mode: plan.time.mode,
    startAt: plan.time.start,
    endAt: plan.time.end,
    slots: plan.time.slots,
    placeName,
    placeAddress,
    placeProviderId,
    message: plan.message,
    linksExpireAt: linkExpiresAt({ finalEnd, setEnd: plan.time.end, slots: plan.time.slots, zone }),
    timeVersion: edit.timeVersion,
    status: edit.status,
    clearFinal: edit.clearFinalTime,
    add: added.map(({ friend, tokenHash }) => ({
      friendId: friend.id,
      inviteeUserId: friend.kindredUserId,
      channel: friend.kindredUserId ? "app" : "text",
      tokenHash,
    })),
    removeFriendIds: edit.removeFriendIds,
    deleteAnswers: edit.deleteAllAnswers,
    label: edit.existingInviteLabel,
  });

  // Text buttons: families who stay get the update sentence; families just added get the invite with their own new link.
  const kind = edit.timeChanged ? "new_time" : "updated";
  const shownStart = staysConfirmed && p.finalStartAt ? p.finalStartAt : plan.time.start;
  const shownEnd = staysConfirmed && p.finalEndAt ? p.finalEndAt : plan.time.end;
  const sentence = updateSentence(kind, shownStart, shownEnd, zone, selected.shownName ?? placeName);
  const staying = p.invites.filter((i) => !edit.removeFriendIds.includes(i.friendId));
  const texts: TextToSend[] = [
    ...staying.map((i) => ({ friendId: i.friendId, name: firstWord(i.parentName), label: i.label, channel: i.channel, body: sentence })),
    ...added.map(({ friend, token }) => ({
      friendId: friend.id,
      name: firstWord(friend.parentName),
      label: friend.label,
      channel: (friend.kindredUserId ? "app" : "text") as InviteChannel,
      body: textBody(plan.message, inviteLink(deps.linkBase, token)),
    })),
  ];
  return { ok: true, changed: true, kind, texts };
}
