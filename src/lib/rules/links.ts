// KD-14: when an invite link stops working. Token generation lives in src/lib/domain.
import { CLEANUP_AFTER_DAYS, LINK_GRACE_HOURS } from "./config";
import { lastSlotEnd } from "./time";
import { allow, deny, type Decision, type FreeSlot, type Zone } from "./types";

export type PlaydateTimes = {
  finalEnd: Date | null;
  setEnd: Date | null;
  slots: readonly FreeSlot[];
  zone: Zone;
};

/** The playdate's end: final end, else the set end, else the end of the last free slot. */
export function playdateEnd(p: PlaydateTimes): Date | null {
  return p.finalEnd ?? p.setEnd ?? lastSlotEnd(p.slots, p.zone);
}

/** `playdates.links_expire_at`: the playdate's end + 12 hours. */
export function linkExpiresAt(p: PlaydateTimes): Date {
  const end = playdateEnd(p);
  if (!end) throw new Error("A playdate needs a time before its links can expire");
  return new Date(end.getTime() + LINK_GRACE_HOURS * 3_600_000);
}

export function checkLink(expiresAt: Date, now: Date): Decision {
  return now >= expiresAt ? deny({ code: "LINK_EXPIRED" }) : allow();
}

/**
 * T23: a playdate is cleaned once it has been over for 30 days. `links_expire_at` is the end + 12 h, so the playdates to clean are the
 * ones whose links expired at or before the moment this returns.
 */
export function cleanupCutoff(now: Date): Date {
  return new Date(now.getTime() - CLEANUP_AFTER_DAYS * 86_400_000 + LINK_GRACE_HOURS * 3_600_000);
}
