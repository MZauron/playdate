// T45 (KD-19, Q31): Free to play. A parent sets or turns off a status for one of their own children; the server works out when it
// turns off (src/lib/rules/free.ts) and stores it. Nothing is sent. Who sees it is the database's job (friends_free_now).
// Pure apart from the ports passed in.
import { z } from "zod";
import { createRateLimiter, type RateLimiter } from "@/platform/rate-limit";
import { checkFreeStatus, type FreeKind, type FreeStatus } from "@/lib/rules/free";
import { zoneOrDefault } from "./playdates";

export type FreeStore = {
  /** false when the child isn't this parent's. */
  set(parentId: string, childId: string, status: FreeStatus): Promise<boolean>;
  clear(parentId: string, childId: string): Promise<boolean>;
};

/** A friend's free child, by the viewer's own friend row. */
export type FriendFree = { friendId: string; childFirstName: string; kind: FreeKind; words: string | null; until: Date };
/** One of the parent's own children's statuses. */
export type OwnFree = { childId: string; kind: FreeKind; words: string | null; until: Date };

export type FreeFailure = "FREE_NOT_NOW" | "FREE_INVALID" | "NOT_FOUND" | "TOO_MANY";
export type FreeResult = { ok: true } | { ok: false; code: FreeFailure };

export const freeLimiter = createRateLimiter({ max: 30, windowMs: 10 * 60_000 });

const SetForm = z.object({
  childId: z.string().uuid(),
  when: z.string().max(20),
  words: z.string().max(200).optional(),
  zone: z.string().max(64).optional(),
});

export async function setFree(deps: { store: FreeStore; limiter: RateLimiter }, parentId: string, input: unknown, now: Date): Promise<FreeResult> {
  const parsed = SetForm.safeParse(input);
  if (!parsed.success) return { ok: false, code: "FREE_INVALID" };
  if (!deps.limiter.hit(parentId).ok) return { ok: false, code: "TOO_MANY" };
  const { childId, when, words, zone } = parsed.data;
  const decision = checkFreeStatus({ when, words }, now, zoneOrDefault(zone ?? ""));
  if (!decision.ok) return { ok: false, code: decision.errors[0]!.code === "FREE_NOT_NOW" ? "FREE_NOT_NOW" : "FREE_INVALID" };
  return (await deps.store.set(parentId, childId, decision.value)) ? { ok: true } : { ok: false, code: "NOT_FOUND" };
}

export async function clearFree(deps: { store: FreeStore; limiter: RateLimiter }, parentId: string, childId: unknown): Promise<FreeResult> {
  const parsed = z.string().uuid().safeParse(childId);
  if (!parsed.success) return { ok: false, code: "NOT_FOUND" };
  if (!deps.limiter.hit(parentId).ok) return { ok: false, code: "TOO_MANY" };
  return (await deps.store.clear(parentId, parsed.data)) ? { ok: true } : { ok: false, code: "NOT_FOUND" };
}

/** Each friend's free children, in the order the database gave them (soonest to turn off first). */
export function freeByFriend(rows: readonly FriendFree[]): Map<string, FriendFree[]> {
  const out = new Map<string, FriendFree[]>();
  for (const row of rows) out.set(row.friendId, [...(out.get(row.friendId) ?? []), row]);
  return out;
}
