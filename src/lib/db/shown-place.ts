// A playdate's place as shown (T17). A typed place is what the parent wrote. A searched place is stored as the provider's id only
// (Q6, migration 0008), so its name and address are looked up here, at read time, through the short cache; they are never written.
import "server-only";
import { showPlace, type Place } from "@/lib/integrations/places";

export type PlaceColumns = { place_name: string | null; place_address: string | null; place_provider_id: string | null };
export type ShownPlace = { placeName: string | null; placeAddress: string | null; searchedPlace: Place | null };

export async function shownPlace(row: PlaceColumns): Promise<ShownPlace> {
  if (!row.place_provider_id) return { placeName: row.place_name, placeAddress: row.place_address, searchedPlace: null };
  const place = await showPlace(row.place_provider_id);
  return { placeName: place.name, placeAddress: place.address, searchedPlace: place };
}
