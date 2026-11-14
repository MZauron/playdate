// KD-10: what an edit changes. Returns the plan of changes; the repository applies it.
import type { FreeSlot, InviteLabel, PlaydateStatus, TimeMode } from "./types";

export type EditableTime = {
  mode: TimeMode;
  start: Date | null;
  end: Date | null;
  slots: readonly FreeSlot[];
};

export type EditablePlace = { name: string; address: string | null; providerPlaceId: string | null } | null;

export type EditState = {
  time: EditableTime;
  place: EditablePlace;
  message: string;
  friendIds: readonly string[];
};

export type EditPlan = {
  changed: boolean;
  timeChanged: boolean;
  timeVersion: number;
  status: PlaydateStatus;
  deleteAllAnswers: boolean;
  clearFinalTime: boolean;
  /** Label for invites that stay; null = leave them as they are. */
  existingInviteLabel: InviteLabel | null;
  addFriendIds: string[];
  removeFriendIds: string[];
};

function sameTime(a: EditableTime, b: EditableTime): boolean {
  const ms = (d: Date | null) => (d ? d.getTime() : null);
  const key = (s: readonly FreeSlot[]) => s.map((x) => `${x.day}|${x.slot}`).sort().join(",");
  return a.mode === b.mode && ms(a.start) === ms(b.start) && ms(a.end) === ms(b.end) && key(a.slots) === key(b.slots);
}

function samePlace(a: EditablePlace, b: EditablePlace): boolean {
  if (!a || !b) return a === b;
  return a.name === b.name && a.address === b.address && a.providerPlaceId === b.providerPlaceId;
}

export function planEdit(
  current: { status: PlaydateStatus; timeVersion: number },
  before: EditState,
  after: EditState,
): EditPlan {
  const timeChanged = !sameTime(before.time, after.time);
  const beforeIds = new Set(before.friendIds);
  const afterIds = new Set(after.friendIds);
  const addFriendIds = [...afterIds].filter((id) => !beforeIds.has(id));
  const removeFriendIds = [...beforeIds].filter((id) => !afterIds.has(id));
  const otherChanged =
    !samePlace(before.place, after.place) || before.message !== after.message || addFriendIds.length > 0 || removeFriendIds.length > 0;

  return {
    changed: timeChanged || otherChanged,
    timeChanged,
    timeVersion: timeChanged ? current.timeVersion + 1 : current.timeVersion,
    status: timeChanged && current.status === "confirmed" ? "collecting" : current.status,
    deleteAllAnswers: timeChanged,
    clearFinalTime: timeChanged,
    existingInviteLabel: timeChanged ? "new_time" : otherChanged ? "updated" : null,
    addFriendIds,
    removeFriendIds,
  };
}
