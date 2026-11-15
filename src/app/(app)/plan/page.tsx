import { PlanForm } from "@/components/plan/PlanForm";
import { requireParent } from "@/lib/auth/require-parent";
import { listFriends } from "@/lib/db/friends";
import { listTypedPlaces } from "@/lib/db/playdates";

export const dynamic = "force-dynamic";

// Plan a playdate (T08): Who's invited, When, Details, Send. Everything shown is this parent's own.
export default async function PlanPage() {
  const { user, profile } = await requireParent();
  const [friends, places] = await Promise.all([listFriends(user.id), listTypedPlaces(user.id)]);
  return <PlanForm friends={friends} savedPlaces={places} firstName={profile.firstName} />;
}
