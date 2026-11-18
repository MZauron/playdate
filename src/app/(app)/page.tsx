import Link from "next/link";
import { redirect } from "next/navigation";
import { pendingFriendLink } from "@/lib/auth/friend-link-cookie";
import { friendLinkStore } from "@/lib/db/friend-links";
import { loadFriendLink } from "@/lib/domain/friend-links";
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

// The banner, the Plan a playdate card, and one list (KD-13, Q24): the playdates this parent organizes and the invites they
// received from other Kindred parents (T15), soonest first.
export default async function HomePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { user, profile } = await requireParent();
  // T34: a parent who came through a friend's Invite to Kindred link goes back to it once signed in and set up, to say yes there.
  const pendingLink = await pendingFriendLink();
  if (pendingLink) {
    const owner = await loadFriendLink(friendLinkStore, pendingLink);
    if (owner && owner.ownerId !== user.id) redirect(`/f/${pendingLink}`);
  }
  const { welcome } = await searchParams;
  const now = new Date();
  return (
    <>
    <HomeView
      firstName={profile.firstName}
      welcome={welcome === "1"}
      childName={profile.children[0]?.firstName} // Q4 default: the first child
      childNames={profile.children.map((c) => c.firstName)}
      playdates={await listHomePlaydates(user.id, now)}
      notices={(await listOpenAvailability(user.id, now)).flatMap(homeNotices)}
      invites={await listInvitesForUser(user.id, now)}
      now={now}
      zone={DEFAULT_ZONE}
    />
      <div className="flex justify-center gap-2 pb-6">
        <Link href="/privacy" className="flex min-h-11 items-center px-4 text-[15px] font-medium text-muted underline-offset-4 hover:underline">
          {enCA.app.privacy}
        </Link>
        <form action={signOutAction}>
          <button type="submit" className="min-h-11 px-4 text-[15px] font-medium text-muted underline-offset-4 hover:underline">
            {enCA.app.signOut}
          </button>
        </form>
      </div>
    </>
  );
}
