import { notFound } from "next/navigation";
import { GroupForm } from "@/components/groups/GroupForm";
import { requireParent } from "@/lib/auth/require-parent";
import { listFriends } from "@/lib/db/friends";
import { getGroup } from "@/lib/db/groups";
import { enCA } from "@/lib/i18n/en-CA";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Edit group (T19): rename it, add or remove families. Only the owner's own group.
export default async function EditGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { user } = await requireParent();
  const [group, friends] = await Promise.all([getGroup(user.id, id), listFriends(user.id)]);
  if (!group) notFound();
  return (
    <div className="flex flex-col gap-5 pb-6">
      <h1 className="text-title font-extrabold tracking-tight leading-tight">{enCA.groups.editTitle}</h1>
      <GroupForm friends={friends} group={{ id: group.id, name: group.name, friendIds: group.members.map((m) => m.friendId) }} />
    </div>
  );
}
