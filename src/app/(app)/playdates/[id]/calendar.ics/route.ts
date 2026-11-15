// Add to calendar from the organizer's playdate page (T22). The signed-in parent's own playdate only, once confirmed.
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { playdatePageStore } from "@/lib/db/playdate-page";
import { buildIcs, icsResponse, organizerEvent } from "@/lib/domain/calendar";
import { isPlaydateId } from "@/lib/domain/playdate-page";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in first", { status: 401 });
  const playdate = isPlaydateId(id) ? await playdatePageStore.getForOrganizer(user.id, id) : null;
  const event = playdate && organizerEvent(playdate);
  if (!event) return new Response("Not found", { status: 404 });
  return icsResponse(buildIcs(event, new Date()));
}
