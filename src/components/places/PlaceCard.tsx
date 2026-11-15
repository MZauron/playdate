// A place from the provider (T17): name, address, the facts line, and Directions, Call, Website when the provider has them.
// `children` holds the card's own buttons (Select, or Change place and Remove).
import type { Place } from "@/lib/integrations/places/types";
import { enCA } from "@/lib/i18n/en-CA";
import { placeFacts, telHref } from "./place-text";

const t = enCA.places;
const link = "inline-flex min-h-11 items-center text-[15px] font-semibold text-primary";

export function PlaceCard({ place, children, as: Tag = "div" }: { place: Place; children?: React.ReactNode; as?: "div" | "li" }) {
  const facts = placeFacts(place);
  return (
    <Tag className="flex flex-col gap-1 rounded-card bg-card p-4 shadow-card">
      <p className="font-semibold">{place.name}</p>
      {place.address && <p className="text-[15px] text-muted">{place.address}</p>}
      {facts && <p className="text-[15px] text-primary">{facts}</p>}
      <div className="flex flex-wrap gap-x-5">
        <a className={link} href={place.mapsUrl} target="_blank" rel="noreferrer">
          {t.directions}
        </a>
        {place.phone && (
          <a className={link} href={telHref(place.phone)}>
            {t.call}
          </a>
        )}
        {place.website && (
          <a className={link} href={place.website} target="_blank" rel="noreferrer">
            {t.website}
          </a>
        )}
      </div>
      {children && <div className="mt-1 flex flex-wrap gap-2">{children}</div>}
    </Tag>
  );
}
