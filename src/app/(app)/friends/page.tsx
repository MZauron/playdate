import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { StatusLine } from "@/components/StatusLine";
import { AddFriendForm } from "@/components/friends/AddFriendForm";
import { InviteToKindred } from "@/components/friends/InviteToKindred";
import { FriendListRow } from "@/components/friends/FriendListRow";
import { Initials } from "@/components/groups/Initials";
import { requireParent } from "@/lib/auth/require-parent";
import { listFriends } from "@/lib/db/friends";
import { listFriendsFree } from "@/lib/db/free-status";
import { freeByFriend } from "@/lib/domain/free-status";
import { listGroups } from "@/lib/db/groups";
import { knownKids } from "@/lib/domain/friend-kids";
import { cx } from "@/components/cx";
import { enCA } from "@/lib/i18n/en-CA";

export const dynamic = "force-dynamic";

const g = enCA.groups;

// The Friends tab (T32, Q25): this parent's groups (T19), their friends (T07) and Add a friend. All of it private to them. The Plan
// screen (T08) shows the same friends and groups under "Who's invited".
export default async function FriendsPage({ searchParams }: { searchParams: Promise<{ befriended?: string; kid?: string }> }) {
  const { user, profile } = await requireParent();
  const { befriended, kid } = await searchParams;
  const kids = profile.children;
  // T42 (Q30): with two or more children, a switch shows one child's friends (the first child's by default, as in the mock-up) or All.
  const kidId = kids.length > 1 ? (kid === "all" ? "all" : kids.some((k) => k.id === kid) ? kid! : kids[0]!.id) : "all";
  const [allFriends, groups, freeRows] = await Promise.all([listFriends(user.id), listGroups(user.id), listFriendsFree(user.id, new Date())]); // only this parent's
  // T45 (KD-19): friends with a child free now come first, with a green dot and when.
  const free = new Map([...freeByFriend(freeRows)].map(([id, rows]) => [id, rows.map((r) => enCA.free.status(r.childFirstName, r.kind, r.words)).join(" · ")]));
  const shown = kidId === "all" ? allFriends : allFriends.filter((f) => knownKids(f, kids).includes(kidId));
  const friends = [...shown.filter((f) => free.has(f.id)), ...shown.filter((f) => !free.has(f.id))];
  return (
    <div className="flex flex-col gap-6 pt-6 pb-6">
      <h1 className="text-title font-extrabold tracking-tight leading-tight">{enCA.friends.tabTitle}</h1>
      {befriended === "1" && (
        <StatusLine tone="success" role="status">
          {enCA.friendLink.befriended}
        </StatusLine>
      )}

      <section aria-labelledby="friends-groups" className="flex flex-col gap-3">
        <h2 id="friends-groups" className="px-1 text-label font-bold uppercase tracking-wider text-muted">
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
        <h2 id="friends-list" className="px-1 text-label font-bold uppercase tracking-wider text-muted">
          {enCA.friends.title}
        </h2>
        {kids.length > 1 && (
          <nav aria-label={enCA.friends.kidSwitch} className="flex gap-1 rounded-full bg-fill p-1">
            {[...kids.map((k) => ({ id: k.id, name: k.firstName })), { id: "all", name: enCA.friends.allKids }].map((k) => (
              <Link
                key={k.id}
                href={`/friends?kid=${k.id}`}
                aria-current={kidId === k.id ? "page" : undefined}
                className={cx(
                  "flex min-h-11 flex-1 items-center justify-center rounded-full px-3 text-[14px] font-bold focus-visible:outline-2 focus-visible:outline-primary",
                  kidId === k.id ? "bg-card text-ink shadow-card" : "text-muted",
                )}
              >
                {k.name}
              </Link>
            ))}
          </nav>
        )}
        {friends.length === 0 ? (
          <p className="text-[15px] text-muted">
            {allFriends.length && kidId !== "all" ? enCA.friends.noneForKid(kids.find((k) => k.id === kidId)?.firstName ?? "") : enCA.friends.empty}
          </p>
        ) : (
          <Card className="px-4 py-1">
            <ul>
              {friends.map((friend) => (
                <li key={friend.id} className="border-line [&+&]:border-t">
                  <FriendListRow friend={friend} free={free.get(friend.id)} />
                </li>
              ))}
            </ul>
          </Card>
        )}
        <AddFriendForm />
      </section>

      {/* T34 (Q26): friends on Kindred without typing a number. */}
      <section aria-labelledby="friends-invite" className="flex flex-col gap-3">
        <h2 id="friends-invite" className="px-1 text-label font-bold uppercase tracking-wider text-muted">
          {enCA.friendLink.title}
        </h2>
        <InviteToKindred />
      </section>
    </div>
  );
}
