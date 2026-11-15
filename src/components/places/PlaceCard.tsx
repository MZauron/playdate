// A place from the provider (T17): name, address, the facts line, and Directions, Call, Website when the provider has them.
// T18: the heart, "N parents like it" (counts only, Q22) and Ask Kindred's one-line reason. `children` holds the card's own buttons
// (Select, Plan a playdate here, or Change place and Remove).
import type { PlaceForParent } from "@/lib/domain/favourites";
import type { Place } from "@/lib/integrations/places/types";
import { enCA } from "@/lib/i18n/en-CA";
import { Heart } from "./Heart";
import { placeFacts, telHref } from "./place-text";

const t = enCA.places;
const link = "inline-flex min-h-11 items-center text-[15px] font-semibold text-primary";

export function PlaceCard({
  place,
  reason,
  children,
  as: Tag = "div",
}: {
  /** With `favourite` and `likes` (a PlaceForParent), the card shows the heart and the likes. */
  place: Place | PlaceForParent;
  reason?: string;
  children?: React.ReactNode;
  as?: "div" | "li";
}) {
  const facts = placeFacts(place);
  const forParent = "favourite" in place ? place : null;
  return (
    <Tag className="flex flex-col gap-1 rounded-card bg-card p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-semibold">{place.name}</p>
        {forParent && <Heart key={`${place.id}-${forParent.favourite}`} placeId={place.id} name={place.name} initial={forParent.favourite} />}
      </div>
      {reason && <p className="text-[15px] text-purple">{reason}</p>}
      {place.address && <p className="text-[15px] text-muted">{place.address}</p>}
      {facts && <p className="text-[15px] text-primary">{facts}</p>}
      {forParent && forParent.likes > 0 && <p className="text-[15px] text-accent">{t.likes(forParent.likes)}</p>}
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
