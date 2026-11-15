// Groups (T19): a parent's private lists of friends ("Dance friends"). Only the owner sees them (DESIGN.md "Privacy"). The owner is
// always the signed-in parent the caller passes in; ids in a form only name a group or friends, and only the owner's own count.
// Pure apart from the ports passed in.
import type { Place } from "@/lib/integrations/places/types";
import { z } from "zod";

export const GROUP_NAME_MAX = 40;
/** A class is about 30 families; this keeps one form small. */
export const GROUP_MAX_MEMBERS = 60;

export type GroupSummary = { id: string; name: string; memberCount: number; initials: string[]; friendIds: string[] };

export type GroupMember = { friendId: string; label: string; parentName: string; hasKindred: boolean };

export type Group = { id: string; name: string; members: GroupMember[] };

export type GroupStore = {
  /** THIS owner's friends among these ids; anyone else's are not found. */
  ownFriendIds(ownerId: string, friendIds: readonly string[]): Promise<string[]>;
  /** Creates (groupId null) or renames and replaces the members of THIS owner's group; null when the owner has no such group. */
  saveGroup(ownerId: string, groupId: string | null, name: string, friendIds: readonly string[]): Promise<string | null>;
  /** Takes one friend out of THIS owner's group; the friend stays a friend. False when there was nothing to remove. */
  removeMember(ownerId: string, groupId: string, friendId: string): Promise<boolean>;
  /** Deletes THIS owner's group (its member rows go with it, the friends stay). */
  deleteGroup(ownerId: string, groupId: string): Promise<boolean>;
};

export type GroupErrorCode = "NAME_REQUIRED" | "NO_MEMBERS" | "NOT_FOUND";
export type GroupResult = { ok: true; groupId: string } | { ok: false; code: GroupErrorCode; field?: string };

const isId = (id: string) => z.uuid().safeParse(id).success;

/** What Create a group and Edit post: `name` and one `friendId` per ticked friend. An owner id in the form is ignored. */
export function parseGroupForm(form: FormData): { name: string; friendIds: string[] } {
  return { name: String(form.get("name") ?? ""), friendIds: form.getAll("friendId").map(String) };
}

/** Create a group (groupId null) or Edit one: a name of 1–40 characters and at least one of the owner's own friends. */
export async function saveGroup(store: GroupStore, ownerId: string, groupId: string | null, input: { name: string; friendIds: string[] }): Promise<GroupResult> {
  if (groupId !== null && !isId(groupId)) return { ok: false, code: "NOT_FOUND" };
  const name = input.name.trim();
  if (!name || name.length > GROUP_NAME_MAX) return { ok: false, code: "NAME_REQUIRED", field: "name" };
  const ids = [...new Set(input.friendIds.filter(isId))].slice(0, GROUP_MAX_MEMBERS);
  const own = ids.length ? await store.ownFriendIds(ownerId, ids) : [];
  if (!own.length) return { ok: false, code: "NO_MEMBERS", field: "members" };
  const saved = await store.saveGroup(ownerId, groupId, name, own);
  return saved ? { ok: true, groupId: saved } : { ok: false, code: "NOT_FOUND" };
}

export async function removeMember(store: GroupStore, ownerId: string, groupId: string, friendId: string): Promise<{ ok: boolean }> {
  if (!isId(groupId) || !isId(friendId)) return { ok: false };
  return { ok: await store.removeMember(ownerId, groupId, friendId) };
}

export async function deleteGroup(store: GroupStore, ownerId: string, groupId: string): Promise<{ ok: boolean }> {
  if (!isId(groupId)) return { ok: false };
  return { ok: await store.deleteGroup(ownerId, groupId) };
}

// --- Plan again: same place, next week ---------------------------------------------------------------------------------------------
export type LastPlaydate = {
  id: string;
  title: string;
  mode: "set_time" | "availability";
  timezone: string;
  start: Date | null;
  end: Date | null;
  placeName: string | null;
  placeAddress: string | null;
  /** A searched place (T17), looked up when read. */
  searchedPlace: Place | null;
};

/**
 * The Plan screen filled in for "Plan again: same place, next week": the same place and, when the last playdate had a time (a set
 * time, or the confirmed final time), the same clock times one week later on its own clock. The message stays empty: Kindred never
 * writes it (KD-05).
 */
export function planAgainValues(last: LastPlaydate): { day: string; start: string; end: string; place: Place | null; placeName: string; placeAddress: string } {
  const zone = last.timezone;
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const clock = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  const nextWeek = (dayText: string) => {
    const d = new Date(`${dayText}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10);
  };
  const timed = !!(last.start && last.end);
  return {
    day: timed ? nextWeek(day(last.start!)) : "",
    start: timed ? clock(last.start!) : "",
    end: timed ? clock(last.end!) : "",
    place: last.searchedPlace,
    placeName: last.searchedPlace ? "" : (last.placeName ?? ""),
    placeAddress: last.searchedPlace ? "" : (last.placeAddress ?? ""),
  };
}
