// Add to calendar from the invite page (T22): the friend's own link is the key, as for the page itself. Only once confirmed.
import { inviteStore } from "@/lib/db/invites";
import { buildIcs, icsResponse, inviteEvent } from "@/lib/domain/calendar";
import { loadInvite, viewLimiter } from "@/lib/domain/invite-page";
import { hashToken } from "@/lib/domain/invite-token";
import { clientAddress } from "@/platform/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!viewLimiter.hit(clientAddress(request.headers)).ok) return new Response("Too many requests", { status: 429 });
  const now = new Date();
  const view = await loadInvite(inviteStore, token, now);
  const event = view && inviteEvent(view, hashToken(token));
  if (!event) return new Response("Not found", { status: 404 });
  return icsResponse(buildIcs(event, now));
}
