import { GroupForm } from "@/components/groups/GroupForm";
import { requireParent } from "@/lib/auth/require-parent";
import { listFriends } from "@/lib/db/friends";
import { enCA } from "@/lib/i18n/en-CA";

export const dynamic = "force-dynamic";

// Create a group (T19): a name and some of this parent's own friends.
export default async function NewGroupPage() {
  const { user } = await requireParent();
  const friends = await listFriends(user.id);
  return (
    <div className="flex flex-col gap-5 pb-6">
      <h1 className="text-title font-bold leading-tight">{enCA.groups.create}</h1>
      <GroupForm friends={friends} />
    </div>
  );
}
