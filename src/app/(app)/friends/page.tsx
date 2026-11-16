import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { StatusLine } from "@/components/StatusLine";
import { AddFriendForm } from "@/components/friends/AddFriendForm";
import { InviteToKindred } from "@/components/friends/InviteToKindred";
import { FriendRow } from "@/components/friends/FriendRow";
import { Initials } from "@/components/groups/Initials";
import { requireParent } from "@/lib/auth/require-parent";
import { listFriends } from "@/lib/db/friends";
import { listGroups } from "@/lib/db/groups";
import { enCA } from "@/lib/i18n/en-CA";

export const dynamic = "force-dynamic";

const g = enCA.groups;

// The Friends tab (T32, Q25): this parent's groups (T19), their friends (T07) and Add a friend. All of it private to them. The Plan
// screen (T08) shows the same friends and groups under "Who's invited".
export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ befriended?: string }> }) {
  const { user } = await requireParent();
  const { befriended } = await searchParams;
  const [friends, groups] = await Promise.all([listFriends(user.id), listGroups(user.id)]); // only this parent's
  return (
    <div className="flex flex-col gap-6 pt-6 pb-6">
      <h1 className="text-title font-bold leading-tight">{enCA.friends.tabTitle}</h1>
      {befriended === "1" && (
        <StatusLine tone="success" role="status">
          {enCA.friendLink.befriended}
        </StatusLine>
      )}

      <section aria-labelledby="friends-groups" className="flex flex-col gap-3">
        <h2 id="friends-groups" className="text-lg font-semibold">
          {g.title}
        </h2>
        {groups.length === 0 ? (
          <p className="text-[15px] text-muted">{g.empty}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {groups.map((group) => (
              <li key={group.id}>
                <Link href={`/friends/groups/${group.id}`} className="block rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  <Card className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{group.name}</span>
                      <span className="block text-[15px] text-muted">{g.families(group.memberCount)}</span>
                    </span>
                    <Initials letters={group.initials} />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <ButtonLink href="/friends/groups/new" fullWidth>
          {g.create}
        </ButtonLink>
      </section>

      <section aria-labelledby="friends-list" className="flex flex-col gap-3">
        <h2 id="friends-list" className="text-lg font-semibold">
          {enCA.friends.title}
        </h2>
        {friends.length === 0 ? (
          <p className="text-[15px] text-muted">{enCA.friends.empty}</p>
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
      </section>

      {/* T34 (Q26): friends on Kindred without typing a number. */}
      <section aria-labelledby="friends-invite" className="flex flex-col gap-3">
        <h2 id="friends-invite" className="text-lg font-semibold">
          {enCA.friendLink.title}
        </h2>
        <InviteToKindred />
      </section>
    </div>
  );
}
