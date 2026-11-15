// POST /api/cron/tick: the Railway cron service calls this with `Authorization: Bearer $CRON_SECRET` (CLAUDE.md "Stack"). Each step is
// idempotent, so a repeated or overlapping call changes nothing more. Logs counts only.
import { NextResponse } from "next/server";
import { env } from "@/env";
import { cleanupStore, tickStore } from "@/lib/db/tick";
import { runCleanup } from "@/lib/domain/cleanup";
import { runMajorityNotices } from "@/lib/domain/majority";
import { cronAuthorized } from "@/platform/cron-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!cronAuthorized(request.headers.get("authorization"), env.CRON_SECRET)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const now = new Date();
  const majority = await runMajorityNotices(tickStore, now);
  const cleanup = await runCleanup(cleanupStore, now);
  console.info(`tick majority_stamped=${majority.stamped} links_removed=${cleanup.linksRemoved} notes_removed=${cleanup.notesRemoved}`);
  return NextResponse.json({ ok: true, majorityStamped: majority.stamped, ...cleanup });
}
