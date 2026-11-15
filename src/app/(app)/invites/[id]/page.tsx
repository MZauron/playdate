import { notFound } from "next/navigation";
import { InvitePage } from "@/components/invite/InvitePage";
import { requireParent } from "@/lib/auth/require-parent";
import { inviteStore } from "@/lib/db/invites";
import { loadInviteForInvitee } from "@/lib/domain/invite-page";

export const dynamic = "force-dynamic";

// T15: a Kindred friend opens an invite from their Home, signed in. The same view as the link (/r/[token]); only the invitee finds it.
export default async function InviteForKindredFriend({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireParent();
  const view = await loadInviteForInvitee(inviteStore, id, user.id, new Date());
  if (!view) notFound();
  return <InvitePage view={view} inviteKey={{ inviteId: id }} embedded />;
}
