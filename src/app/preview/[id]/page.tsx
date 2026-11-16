import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvitePage } from "@/components/invite/InvitePage";
import { requireParent } from "@/lib/auth/require-parent";
import { inviteStore } from "@/lib/db/invites";
import { loadPreview } from "@/lib/domain/invite-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

// T27 Preview what friends see: the invite page in its own column, as on a friend's phone (no tabs), for the organizer's own
// playdate only. Behind sign-in and the staging curtain; another parent's playdate id is simply not found. Nothing is written.
export default async function PreviewRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireParent();
  const view = await loadPreview(inviteStore, id, user.id, new Date());
  if (!view) notFound();
  return <InvitePage view={view} inviteKey={{ inviteId: "preview" }} preview={{ playdateId: id }} />;
}
