import { NextResponse } from "next/server";
import { adminClient } from "@/lib/db/admin";

export const dynamic = "force-dynamic";

/** Is the database reachable? One cheap read with the service role; no data in the answer. */
export async function databaseReachable(): Promise<boolean> {
  try {
    const { error } = await adminClient().from("profiles").select("id", { head: true, count: "exact" }).limit(1);
    return !error;
  } catch {
    return false;
  }
}

// For Railway's health check and people: 200 when the app and its database answer, 503 otherwise. Outside the staging curtain.
export async function GET() {
  const database = await databaseReachable();
  return NextResponse.json({ ok: database, database: database ? "reachable" : "unreachable" }, { status: database ? 200 : 503 });
}
