import { notFound } from "next/navigation";
import { z } from "zod";
import { FriendPage } from "@/components/friends/FriendPage";
import { requireParent } from "@/lib/auth/require-parent";
import { getFriend, playdatesWithFriend } from "@/lib/db/friends";

export const dynamic = "force-dynamic";

// T40: one friend's page. Only the owner's own friends open; any other id is not found.
export default async function FriendRoute({ params }: { params: Promise<{ id: string }> }) {
  const { user, profile } = await requireParent();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const friend = await getFriend(user.id, id);
  if (!friend) notFound();
  const together = await playdatesWithFriend(user.id, friend.id, new Date());
  return <FriendPage friend={friend} open={together.open} past={together.past} kids={profile.children} />;
}
