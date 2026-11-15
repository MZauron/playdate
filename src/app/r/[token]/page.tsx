import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { InvitePage } from "@/components/invite/InvitePage";
import { InviteMessage } from "@/components/invite/InviteShell";
import { inviteStore } from "@/lib/db/invites";
import { loadInvite, viewLimiter } from "@/lib/domain/invite-page";
import { enCA } from "@/lib/i18n/en-CA";
import { clientAddress } from "@/platform/rate-limit";

export const dynamic = "force-dynamic";

// Never indexed, and the link (the token) is never sent on as a referrer when a friend taps Directions.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

// The invite page (T09): the same page for every friend, with or without Kindred, and no account. Outside the staging curtain.
export default async function InviteRoute({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!viewLimiter.hit(clientAddress(await headers())).ok) return <InviteMessage title={enCA.invite.tooManyTitle} note={enCA.invite.tooManyNote} />;
  const view = await loadInvite(inviteStore, token, new Date());
  if (!view) notFound();
  return <InvitePage view={view} token={token} />;
}
