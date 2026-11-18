import { notFound, redirect } from "next/navigation";
import { PlanForm } from "@/components/plan/PlanForm";
import { requireParent } from "@/lib/auth/require-parent";
import { listFavouritePlaces } from "@/lib/db/favourites";
import { listFriends } from "@/lib/db/friends";
import { playdatePageStore } from "@/lib/db/playdate-page";
import { listTypedPlaces } from "@/lib/db/playdates";
import { editFormValues } from "@/lib/domain/edit-playdate";
import { isPlaydateId } from "@/lib/domain/playdate-page";

export const dynamic = "force-dynamic";

// Edit playdate (T16): the planning screen, filled in, ending in Send update. Only the organizer's own playdate.
export default async function EditPlaydateRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isPlaydateId(id)) notFound();
  const { user, profile } = await requireParent();
  const playdate = await playdatePageStore.getForOrganizer(user.id, id);
  if (!playdate) notFound();
  if (playdate.status === "cancelled") redirect(`/playdates/${id}`);
  const [friends, places, favourites] = await Promise.all([listFriends(user.id), listTypedPlaces(user.id), listFavouritePlaces(user.id)]);
  const initial = editFormValues(playdate);
  // T41: a playdate from before T41 has no children stored; it was for the first child (Q4 default).
  if (!initial.childIds.length && profile.children[0]) initial.childIds = [profile.children[0].id];
  return (
    <PlanForm
      friends={friends}
      savedPlaces={places}
      favourites={favourites}
      firstName={profile.firstName}
      kids={profile.children}
      edit={{ playdateId: id, zone: playdate.timezone, initial }}
    />
  );
}
