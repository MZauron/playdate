// POST /api/places/search: Find a place (T17). Signed-in parents only. The words travel in the body, not the URL, since a parent
// may type an address. The response holds the provider's places; nothing is stored (Q6).
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { PlaceSearchRequest, placeSearchLimiter, searchPlaces } from "@/lib/domain/places";
import { places } from "@/lib/integrations/places";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "SIGNED_OUT" }, { status: 401 });

  const body = PlaceSearchRequest.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });

  const result = await searchPlaces(
    { places: places(), limiter: placeSearchLimiter, log: (code) => console.info(`places ${code} parent=${user.id}`) },
    user.id,
    body.data.query,
  );
  if (!result.ok) {
    const status = result.code === "TOO_MANY_SEARCHES" ? 429 : 502;
    const headers = result.code === "TOO_MANY_SEARCHES" ? { "Retry-After": String(result.retryAfterSeconds) } : undefined;
    return NextResponse.json({ error: result.code }, { status, headers });
  }
  return NextResponse.json({ places: result.places });
}
