// Favourite places (T18). Server only; every write and every list is scoped to the owner id the caller got from `auth.getUser()`.
// The two counting functions (migration 0009) return counts only and are callable by the service role alone.
import "server-only";
import { forParent, MIN_PARENTS_SHOWN, POPULAR_LIMIT, type FavouriteStore, type PlaceForParent } from "@/lib/domain/favourites";
import { showPlace } from "@/lib/integrations/places";
import { adminClient } from "./admin";

export const favouriteStore: FavouriteStore = {
  async favouriteIds(ownerId) {
    const { data, error } = await adminClient()
      .from("saved_places")
      .select("provider_place_id")
      .eq("owner_id", ownerId)
      .eq("source", "searched")
      .eq("is_favourite", true)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(`favouriteIds failed: ${error.code}`);
    return (data ?? []).flatMap((r) => (r.provider_place_id ? [r.provider_place_id] : []));
  },

  async setFavourite(ownerId, placeId, on) {
    const db = adminClient();
    if (on) {
      // Only the provider's id (Q6 default); 23505 = already hearted, which is fine.
      const { error } = await db.from("saved_places").insert({ owner_id: ownerId, source: "searched", provider_place_id: placeId, is_favourite: true });
      if (error && error.code !== "23505") throw new Error(`setFavourite failed: ${error.code}`);
      return;
    }
    const { error } = await db.from("saved_places").delete().eq("owner_id", ownerId).eq("source", "searched").eq("provider_place_id", placeId);
    if (error) throw new Error(`setFavourite failed: ${error.code}`);
  },

  async likeCounts(placeIds, min) {
    if (!placeIds.length) return {};
    const { data, error } = await adminClient().rpc("place_like_counts", { p_ids: [...placeIds], p_min: min });
    if (error) throw new Error(`likeCounts failed: ${error.code}`);
    return Object.fromEntries((data ?? []).map((r) => [r.provider_place_id, r.parents]));
  },

  async popular(min, limit) {
    const { data, error } = await adminClient().rpc("popular_places", { p_min: min, p_limit: limit });
    if (error) throw new Error(`popular failed: ${error.code}`);
    return (data ?? []).map((r) => ({ placeId: r.provider_place_id, parents: r.parents }));
  },
};

/** Your favourites (Explore, the chips under Where): the hearted places, looked up when shown (Q6), newest first. */
export async function listFavouritePlaces(ownerId: string): Promise<PlaceForParent[]> {
  const ids = await favouriteStore.favouriteIds(ownerId);
  return forParent(favouriteStore, ownerId, await Promise.all(ids.map((id) => showPlace(id))));
}

/** Popular with parents (Explore): the most-hearted places, at least two parents each (Q22 default), counts only. */
export async function listPopularPlaces(ownerId: string): Promise<PlaceForParent[]> {
  const popular = await favouriteStore.popular(MIN_PARENTS_SHOWN, POPULAR_LIMIT);
  return forParent(favouriteStore, ownerId, await Promise.all(popular.map((p) => showPlace(p.placeId))));
}
