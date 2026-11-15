import { z } from "zod";
import { PlanForm } from "@/components/plan/PlanForm";
import { requireParent } from "@/lib/auth/require-parent";
import { listFriends } from "@/lib/db/friends";
import { getGroup, lastPlaydateWith, listGroups } from "@/lib/db/groups";
import { listTypedPlaces } from "@/lib/db/playdates";
import { planAgainValues } from "@/lib/domain/groups";

export const dynamic = "force-dynamic";

// Plan a playdate (T08): Who's invited, When, Details, Send. Everything shown is this parent's own.
// From a group (T19): ?group=<id> pre-selects its families; &again=<playdate id> also fills in the same place, next week.
export default async function PlanPage({ searchParams }: { searchParams: Promise<{ group?: string; again?: string }> }) {
  const { user, profile } = await requireParent();
  const { group: groupId, again } = await searchParams;
  const isId = (v: string | undefined): v is string => !!v && z.uuid().safeParse(v).success;
  const [friends, places, groupList, group] = await Promise.all([
    listFriends(user.id),
    listTypedPlaces(user.id),
    listGroups(user.id),
    isId(groupId) ? getGroup(user.id, groupId) : null,
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
      prefill={group ? { friendIds: memberIds, ...(last && last.id === again ? planAgainValues(last) : {}) } : undefined}
    />
  );
}
