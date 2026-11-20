import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/supabase-server";
import { myData } from "@/lib/db/my-data";
import { createRateLimiter } from "@/platform/rate-limit";

export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ max: 5, windowMs: 10 * 60_000 });

// T55 (Q13): Download my data, from Account. Only the signed-in parent's own data, as a JSON file; nothing is logged but the event.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "SIGNED_OUT" }, { status: 401 });
  if (!limiter.hit(user.id).ok) return NextResponse.json({ error: "TOO_MANY" }, { status: 429 });
  const now = new Date();
  const data = await myData(user.id, now);
  console.info("my_data exported");
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="kindred-my-data-${now.toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
