"use server";

import { requireParent } from "@/lib/auth/require-parent";
import { favouriteStore } from "@/lib/db/favourites";
import { heartLimiter, heartPlace } from "@/lib/domain/favourites";
import { places } from "@/lib/integrations/places";

/** The heart (T18) on any place card. Whose favourite it is comes from the session; the id only names a place. */
export async function heartAction(placeId: unknown, on: unknown): Promise<{ ok: boolean }> {
  const { user } = await requireParent();
  if (typeof placeId !== "string" || typeof on !== "boolean") return { ok: false };
  const result = await heartPlace({ store: favouriteStore, places: places(), limiter: heartLimiter }, user.id, placeId, on);
  if (!result.ok) console.info(`heart ${result.code} parent=${user.id}`);
  return { ok: result.ok };
}
