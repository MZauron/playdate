import { HomeView } from "@/components/home/HomeView";
import { requireParent } from "@/lib/auth/require-parent";
import { listInvitesForUser } from "@/lib/db/invites";
import { listOpenAvailability } from "@/lib/db/playdate-page";
import { listHomePlaydates } from "@/lib/db/playdates";
import { homeNotices } from "@/lib/domain/majority";
import { DEFAULT_ZONE } from "@/lib/rules/config";

// Always the current time and the current parent.
export const dynamic = "force-dynamic";

// The banner, the Plan a playdate card, and the playdates this parent organizes in their KD-13 sections. Invites from other
// parents join with T15.
export default async function HomePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { user, profile } = await requireParent();
  const { welcome } = await searchParams;
  const now = new Date();
  return (
    <HomeView
      firstName={profile.firstName}
      welcome={welcome === "1"}
      childName={profile.children[0]?.firstName} // Q4 default: the first child
      playdates={await listHomePlaydates(user.id, now)}
      notices={(await listOpenAvailability(user.id, now)).flatMap(homeNotices)}
      invites={await listInvitesForUser(user.id, now)}
      now={now}
      zone={DEFAULT_ZONE}
    />
  );
}
