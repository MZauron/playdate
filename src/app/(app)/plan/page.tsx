import { z } from "zod";
import { PlanForm } from "@/components/plan/PlanForm";
import { requireParent } from "@/lib/auth/require-parent";
import { listFriends } from "@/lib/db/friends";
import { getGroup, lastPlaydateWith, listGroups } from "@/lib/db/groups";
import { listFavouritePlaces } from "@/lib/db/favourites";
import { listTypedPlaces } from "@/lib/db/playdates";
import { places as placesProvider, PLACE_ID_PATTERN } from "@/lib/integrations/places";
import { planAgainValues } from "@/lib/domain/groups";

export const dynamic = "force-dynamic";

// Plan a playdate (T08): Who's invited, When, Details, Send. Everything shown is this parent's own.
// From a group (T19): ?group=<id> pre-selects its families; &again=<playdate id> also fills in the same place, next week.
// From a place (T18, Plan a playdate here): ?place=<provider id> selects it, once the provider confirms it exists.
export default async function PlanPage({ searchParams }: { searchParams: Promise<{ group?: string; again?: string; place?: string }> }) {
  const { user, profile } = await requireParent();
  const { group: groupId, again, place: placeId } = await searchParams;
  const isId = (v: string | undefined): v is string => !!v && z.uuid().safeParse(v).success;
  const [friends, places, groupList, group, favourites, chosen] = await Promise.all([
    listFriends(user.id),
    listTypedPlaces(user.id),
    listGroups(user.id),
    isId(groupId) ? getGroup(user.id, groupId) : null,
    listFavouritePlaces(user.id),
    placeId && PLACE_ID_PATTERN.test(placeId) ? placesProvider().details(placeId).catch(() => null) : null,
  ]);
  const memberIds = group?.members.map((m) => m.friendId) ?? [];
  const last = group && isId(again) ? await lastPlaydateWith(user.id, memberIds) : null;
  const groups = groupList.map((g) => ({ id: g.id, name: g.name, friendIds: g.friendIds }));
  return (
    <PlanForm
      friends={friends}
      savedPlaces={places}
      firstName={profile.firstName}
      groups={groups}
      favourites={favourites}
      prefill={
        group
          ? { friendIds: memberIds, ...(last && last.id === again ? planAgainValues(last) : {}) }
          : chosen
            ? { friendIds: [], place: chosen }
            : undefined
      }
    />
  );
}
