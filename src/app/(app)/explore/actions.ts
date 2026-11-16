"use server";

import { revalidatePath } from "next/cache";
import { requireParent } from "@/lib/auth/require-parent";
import { favouriteStore } from "@/lib/db/favourites";
import { savedPlaceStore } from "@/lib/db/playdates";
import { heartLimiter, heartPlace } from "@/lib/domain/favourites";
import { removeSavedPlace, renameSavedPlace, type SavedPlaceResult } from "@/lib/domain/saved-places";
import { places } from "@/lib/integrations/places";

/** The heart (T18) on any place card. Whose favourite it is comes from the session; the id only names a place. */
export async function heartAction(placeId: unknown, on: unknown): Promise<{ ok: boolean }> {
  const { user } = await requireParent();
  if (typeof placeId !== "string" || typeof on !== "boolean") return { ok: false };
  const result = await heartPlace({ store: favouriteStore, places: places(), limiter: heartLimiter }, user.id, placeId, on);
  if (!result.ok) console.info(`heart ${result.code} parent=${user.id}`);
  return { ok: result.ok };
}

/** T30: rename one of the parent's own saved places. The id names a place; whose it is comes from the session. */
export async function renamePlaceAction(id: unknown, name: unknown): Promise<SavedPlaceResult> {
  const { user } = await requireParent();
  const result = await renameSavedPlace(savedPlaceStore, user.id, id, name);
  if (result.ok) revalidatePath("/explore");
  return result;
}

/** T30: remove one of the parent's own saved places. */
export async function removePlaceAction(id: unknown): Promise<SavedPlaceResult> {
  const { user } = await requireParent();
  const result = await removeSavedPlace(savedPlaceStore, user.id, id);
  if (result.ok) revalidatePath("/explore");
  return result;
}
