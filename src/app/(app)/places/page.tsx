import { ButtonLink } from "@/components/Button";
import { PlaceCard } from "@/components/places/PlaceCard";
import { AskPlaces, SearchPlaces } from "@/components/places/AskPlaces";
import { SavedPlaces } from "@/components/places/SavedPlaces";
import { requireParent } from "@/lib/auth/require-parent";
import { listFavouritePlaces, listPopularPlaces } from "@/lib/db/favourites";
import { listTypedPlaces } from "@/lib/db/playdates";
import type { PlaceForParent } from "@/lib/domain/favourites";
import { enCA } from "@/lib/i18n/en-CA";

export const dynamic = "force-dynamic";

const t = enCA.explore;

// The Places tab (T32, Q25/Q7: Ask Kindred and Explore in one): Ask Kindred first (T18), then Your favourites (only this parent's),
// Your saved places (T30: the places they typed, with Rename and Remove), Popular with parents (counts only, Q22), and search.
export default async function PlacesPage() {
  const { user } = await requireParent();
  const [favourites, saved, popular] = await Promise.all([listFavouritePlaces(user.id), listTypedPlaces(user.id), listPopularPlaces(user.id)]);
  return (
    <section className="flex flex-col gap-6 pt-6 pb-6">
      <h1 className="text-title font-extrabold tracking-tight leading-tight">{t.title}</h1>
      <section aria-labelledby="places-ask" className="flex flex-col gap-3">
        <h2 id="places-ask" className="px-1 text-label font-bold uppercase tracking-wider text-muted">
          {enCA.ask.title}
        </h2>
        <p className="text-[15px] text-muted">{enCA.ask.intro}</p>
        <AskPlaces />
      </section>
      <Places title={t.favourites} places={favourites} empty={t.noFavourites} />
      <section aria-labelledby="explore-saved" className="flex flex-col gap-3">
        <h2 id="explore-saved" className="px-1 text-label font-bold uppercase tracking-wider text-muted">
          {t.saved}
        </h2>
        <SavedPlaces places={saved} />
      </section>
      <Places title={t.popular} places={popular} empty={t.noPopular} />
      <section aria-labelledby="explore-search" className="flex flex-col gap-3">
        <h2 id="explore-search" className="px-1 text-label font-bold uppercase tracking-wider text-muted">
          {t.search}
        </h2>
        <SearchPlaces />
      </section>
    </section>
  );
}

function Places({ title, places, empty }: { title: string; places: PlaceForParent[]; empty: string }) {
  const id = `explore-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="px-1 text-label font-bold uppercase tracking-wider text-muted">
        {title}
      </h2>
      {places.length === 0 ? (
        <p className="text-[15px] text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {places.map((place) => (
            <PlaceCard key={place.id} place={place} as="li">
              <ButtonLink compact href={`/plan?place=${encodeURIComponent(place.id)}`}>
                {enCA.places.planHere}
              </ButtonLink>
            </PlaceCard>
          ))}
        </ul>
      )}
    </section>
  );
}
