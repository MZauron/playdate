// Add to calendar for a Kindred friend's own invite (T15, T22): the signed-in invitee only, once confirmed.
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { inviteStore } from "@/lib/db/invites";
import { buildIcs, icsResponse, inviteEvent } from "@/lib/domain/calendar";
import { loadInviteForInvitee } from "@/lib/domain/invite-page";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in first", { status: 401 });
  const now = new Date();
  const view = await loadInviteForInvitee(inviteStore, id, user.id, now);
  const event = view && inviteEvent(view, id.replace(/-/g, ""));
  if (!event) return new Response("Not found", { status: 404 });
  return icsResponse(buildIcs(event, now));
}
