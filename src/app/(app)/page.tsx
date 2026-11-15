import { signOutAction } from "@/app/(app)/actions";
import { HomeView } from "@/components/home/HomeView";
import { enCA } from "@/lib/i18n/en-CA";
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
    <>
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
      <form action={signOutAction} className="flex justify-center pb-6">
        <button type="submit" className="min-h-11 px-4 text-[15px] font-medium text-muted underline-offset-4 hover:underline">
          {enCA.app.signOut}
        </button>
      </form>
    </>
  );
}
