// POST /api/places/ask: Ask Kindred (T18). Signed-in parents only. The words travel in the body. The AI sees the words, the
// children's age labels and the provider's candidates, never a name; nothing is stored.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { favouriteStore } from "@/lib/db/favourites";
import { getParentProfile } from "@/lib/db/profiles";
import { askKindred, askLimiter, AskRequest } from "@/lib/domain/ask";
import { forParent } from "@/lib/domain/favourites";
import { placeIdeas } from "@/lib/integrations/ai";
import { places } from "@/lib/integrations/places";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const profile = user ? await getParentProfile(user.id) : null;
  if (!user || !profile) return NextResponse.json({ error: "SIGNED_OUT" }, { status: 401 });

  const body = AskRequest.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });

  const result = await askKindred(
    { places: places(), ai: placeIdeas(), limiter: askLimiter, log: (code) => console.info(`ask ${code} parent=${user.id}`) },
    { id: user.id, childAges: profile.children.map((c) => c.ageLabel) },
    body.data.words,
  );
  if (!result.ok) {
    if (result.code === "TOO_MANY_QUESTIONS") return NextResponse.json({ error: result.code }, { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } });
    return NextResponse.json({ error: result.code }, { status: 502 });
  }
  const shown = await forParent(favouriteStore, user.id, result.picks.map((p) => p.place));
  return NextResponse.json({ picks: shown.map((place, i) => ({ place, reason: result.picks[i]!.reason })), source: result.source });
}
