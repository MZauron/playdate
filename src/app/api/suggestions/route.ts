// POST /api/suggestions: three message ideas for the Plan screen (T08). Signed-in parents only; the friend ids in the body only
// name friends, and only the parent's own are read. The response holds the ideas, nothing else from the database.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { friendsChildren } from "@/lib/db/playdates";
import { getParentProfile } from "@/lib/db/profiles";
import { suggestMessages, suggestionsLimiter, SuggestionsRequest } from "@/lib/domain/suggestions";
import { messageIdeas } from "@/lib/integrations/ai";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const profile = user ? await getParentProfile(user.id) : null;
  if (!user || !profile) return NextResponse.json({ error: "SIGNED_OUT" }, { status: 401 });

  const body = SuggestionsRequest.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });

  const result = await suggestMessages(
    { ai: messageIdeas(), limiter: suggestionsLimiter, friendsChildren, log: (code) => console.info(`suggestions ${code} parent=${user.id}`) },
    { id: user.id, childFirstName: profile.children[0]?.firstName ?? "" }, // Q4 default: the first child
    body.data,
  );
  if (!result.ok) return NextResponse.json({ error: result.code }, { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } });
  return NextResponse.json({ ideas: result.ideas });
}
