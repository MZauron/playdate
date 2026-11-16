"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { realtimeTokenAction } from "@/app/(app)/playdates/[id]/actions";
import { enCA } from "@/lib/i18n/en-CA";

/** One client per page load (React may run the effect twice in development). */
let shared: { url: string; client: ReturnType<typeof createClient> } | undefined;
function realtimeClient(url: string, anonKey: string) {
  if (shared?.url !== url) shared = { url, client: createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }) };
  return shared.client;
}

/** Access tokens last an hour; ask the server for a fresh one well before. */
const TOKEN_REFRESH_MS = 45 * 60 * 1000;
/**
 * Realtime can report the channel as joined a few seconds before it really delivers changes (seen locally right after Realtime
 * starts, and a quiet hosted project can start it cold too), so the page reads itself again shortly after joining, and once a minute
 * while it is on screen, in case an event was missed.
 */
const CATCH_UP_AFTER_JOIN_MS = [5_000, 15_000];
const SAFETY_REFRESH_MS = 60_000;

/**
 * Live answers (T10): listens to this playdate's row, its invites, and the parent's answers through Supabase Realtime with the
 * parent's own token (RLS decides what arrives), and re-reads the page from the server when anything changes. Shows "· Live" while
 * connected; nothing from the events themselves is shown.
 */
export function LiveAnswers({ playdateId, supabaseUrl, anonKey }: { playdateId: string; supabaseUrl: string; anonKey: string }) {
  const router = useRouter();
  const [live, setLive] = useState(false);

  useEffect(() => {
    const client = realtimeClient(supabaseUrl, anonKey);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250); // several events at once make one refresh
    };
    const authorize = async () => {
      const token = await realtimeTokenAction();
      if (token) await client.realtime.setAuth(token);
    };
    let channel: ReturnType<typeof client.channel> | undefined;
    let cancelled = false;
    void authorize().then(() => {
      if (cancelled) return;
      channel = client
        .channel(`playdate-${playdateId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "answers" }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "invites", filter: `playdate_id=eq.${playdateId}` }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "playdates", filter: `id=eq.${playdateId}` }, refresh)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "check_ins", filter: `playdate_id=eq.${playdateId}` }, refresh) // T35
        .subscribe((status) => {
          setLive(status === "SUBSCRIBED");
          if (status === "SUBSCRIBED") for (const ms of CATCH_UP_AFTER_JOIN_MS) catchUps.push(setTimeout(() => router.refresh(), ms));
        });
    });
    const catchUps: ReturnType<typeof setTimeout>[] = [];
    const renew = setInterval(() => void authorize(), TOKEN_REFRESH_MS);
    const safety = setInterval(() => document.visibilityState === "visible" && router.refresh(), SAFETY_REFRESH_MS);
    // Coming back to the tab (a phone wakes up): read the page again in case events were missed.
    const onVisible = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      catchUps.forEach(clearTimeout);
      clearInterval(renew);
      clearInterval(safety);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void client.removeChannel(channel);
    };
  }, [playdateId, supabaseUrl, anonKey, router]);

  return live ? <span className="text-success"> · {enCA.playdate.live}</span> : null;
}
