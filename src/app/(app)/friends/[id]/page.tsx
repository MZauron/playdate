import { notFound } from "next/navigation";
import { z } from "zod";
import { FriendPage } from "@/components/friends/FriendPage";
import { requireParent } from "@/lib/auth/require-parent";
import { getFriend, playdatesWithFriend } from "@/lib/db/friends";
import { listFriendsFree } from "@/lib/db/free-status";
import { enCA } from "@/lib/i18n/en-CA";

export const dynamic = "force-dynamic";

// T40: one friend's page. Only the owner's own friends open; any other id is not found.
export default async function FriendRoute({ params }: { params: Promise<{ id: string }> }) {
  const { user, profile } = await requireParent();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const friend = await getFriend(user.id, id);
  if (!friend) notFound();
  const now = new Date();
  const [together, freeRows] = await Promise.all([playdatesWithFriend(user.id, friend.id, now), listFriendsFree(user.id, now)]);
  const free = freeRows.filter((r) => r.friendId === friend.id).map((r) => enCA.free.status(r.childFirstName, r.kind, r.words)).join(" · ");
  return <FriendPage friend={friend} open={together.open} past={together.past} kids={profile.children} free={free || undefined} />;
}
