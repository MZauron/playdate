import { AddFriendForm } from "@/components/friends/AddFriendForm";
import { FriendRow } from "@/components/friends/FriendRow";
import { requireParent } from "@/lib/auth/require-parent";
import { listFriends } from "@/lib/db/friends";
import { enCA } from "@/lib/i18n/en-CA";

export const dynamic = "force-dynamic";

// Your friends: the list, and Add a friend. The Plan screen (T08) shows the same list and form under "Who's invited".
export default async function FriendsPage() {
  const { user } = await requireParent();
  const friends = await listFriends(user.id); // only this parent's friends
  return (
    <div className="flex flex-col gap-5 pb-6">
      <h1 className="text-title font-bold leading-tight">{enCA.friends.title}</h1>
      {friends.length === 0 ? (
        <p className="text-muted">{enCA.friends.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {friends.map((friend) => (
            <li key={friend.id}>
              <FriendRow friend={friend} />
            </li>
          ))}
        </ul>
      )}
      <AddFriendForm />
    </div>
  );
}
