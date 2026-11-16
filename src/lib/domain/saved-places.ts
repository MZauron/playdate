// Your saved places (T30, Q14 answered by T30): the places a parent typed and saved, renamed or removed from Places. Only the owner's
// own rows: the owner is always the signed-in parent, and an id names one of their places or nothing. Pure apart from the store.
import { z } from "zod";

export const SAVED_NAME_MAX = 80; // saved_places_name_check

export type SavedPlaceStore = {
  /** "taken": the owner already has a typed place with that name (any case). "missing": no such place of theirs. */
  rename(ownerId: string, id: string, name: string): Promise<"ok" | "taken" | "missing">;
  /** false: no such place of theirs. */
  remove(ownerId: string, id: string): Promise<boolean>;
};

export type SavedPlaceResult = { ok: true } | { ok: false; code: "NAME_REQUIRED" | "NAME_TOO_LONG" | "NAME_TAKEN" | "NOT_FOUND" };

const isUuid = (id: unknown): id is string => z.uuid().safeParse(id).success;

export async function renameSavedPlace(store: SavedPlaceStore, ownerId: string, id: unknown, name: unknown): Promise<SavedPlaceResult> {
  if (!isUuid(id) || typeof name !== "string") return { ok: false, code: "NOT_FOUND" };
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return { ok: false, code: "NAME_REQUIRED" };
  if (trimmed.length > SAVED_NAME_MAX) return { ok: false, code: "NAME_TOO_LONG" };
  const result = await store.rename(ownerId, id, trimmed);
  return result === "ok" ? { ok: true } : { ok: false, code: result === "taken" ? "NAME_TAKEN" : "NOT_FOUND" };
}

export async function removeSavedPlace(store: SavedPlaceStore, ownerId: string, id: unknown): Promise<SavedPlaceResult> {
  if (!isUuid(id)) return { ok: false, code: "NOT_FOUND" };
  return (await store.remove(ownerId, id)) ? { ok: true } : { ok: false, code: "NOT_FOUND" };
}
