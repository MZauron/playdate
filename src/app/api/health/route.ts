import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// T04 adds the database check.
export function GET() {
  return NextResponse.json({ ok: true });
}
