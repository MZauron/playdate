import { redirect } from "next/navigation";
import { pendingFriendLink } from "@/lib/auth/friend-link-cookie";
import { friendLinkStore } from "@/lib/db/friend-links";
import { loadFriendLink } from "@/lib/domain/friend-links";
import { HomeView } from "@/components/home/HomeView";
import { SayIt } from "@/components/home/SayIt";
import { FreeSheet } from "@/components/home/FreeSheet";
import { listFriends } from "@/lib/db/friends";
import { listFriendsFree, listOwnFree } from "@/lib/db/free-status";
import { freeByFriend } from "@/lib/domain/free-status";
import { enCA, joinNames } from "@/lib/i18n/en-CA";
import { requireParent } from "@/lib/auth/require-parent";
import { listInvitesForUser } from "@/lib/db/invites";
import { listOpenAvailability } from "@/lib/db/playdate-page";
import { listHomePlaydates, listRecentPlaces, listRecentPlaydates } from "@/lib/db/playdates";
import { homeNotices } from "@/lib/domain/majority";
import { familyPicks } from "@/lib/domain/playdate-page";
import { preselectedPick, groupPicks } from "@/lib/rules/picks";
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
  // T45 (KD-19): the parent's own children's statuses for the banner, and the friends' children who are free (friends both ways).
  const [own, friendsFree, friends] = await Promise.all([listOwnFree(user.id, now), listFriendsFree(user.id, now), listFriends(user.id)]);
  const freeKids = profile.children.map((c) => {
    const st = own.find((o) => o.childId === c.id);
    return { id: c.id, firstName: c.firstName, status: st ? { kind: st.kind, words: st.words } : null };
  });
  const freeNow = freeKids.filter((k) => k.status);
  const freeLabel = freeNow.length
    ? freeNow.map((k) => enCA.free.status(k.firstName, k.status!.kind, k.status!.words)).join(" · ")
    : enCA.free.bannerShare(joinNames(profile.children.map((c) => c.firstName)));
  const names = new Map(friends.map((f) => [f.id, f.parentName]));
  const homeFree = [...freeByFriend(friendsFree)].flatMap(([friendId, statuses]) =>
    names.has(friendId) ? [{ friendId, parentName: names.get(friendId)!, statuses }] : [],
  );
  // T50 (T44): each open availability playdate's time most families can make, for the sheet's Confirm.
  const open = await listOpenAvailability(user.id, now);
  const chosen = Object.fromEntries(open.flatMap((p) => {
    const top = preselectedPick(groupPicks(familyPicks(p)));
    return top ? [[p.id, top.range]] : [];
  }));
  return (
    <HomeView
      firstName={profile.firstName}
      welcome={welcome === "1"}
      childName={profile.children[0]?.firstName} // Q4 default: the first child
      childNames={profile.children.map((c) => c.firstName)}
      playdates={await listHomePlaydates(user.id, now)}
      notices={open.flatMap(homeNotices)}
      chosen={chosen}
      invites={await listInvitesForUser(user.id, now)}
      recent={await listRecentPlaydates(user.id, now)}
      recentPlaces={await listRecentPlaces(user.id, now)}
      now={now}
      zone={DEFAULT_ZONE}
      sayIt={<SayIt />}
      free={profile.children.length > 0 ? <FreeSheet kids={freeKids} label={freeLabel} anyFree={freeNow.length > 0} /> : undefined}
      friendsFree={homeFree}
    />
  );
}
