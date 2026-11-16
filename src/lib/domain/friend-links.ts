// Invite to Kindred (T34, Q26): a parent's personal link. Whoever signs up or signs in through it and says yes becomes their friend
// on both sides, first names and the first child's first name only, with no phone number typed. Like invite links (KD-14) a link is
// 128 random bits and only its sha256 is stored; "Stop my old links" turns off every link the parent shared. Pure apart from the
// store, the limiter and the random source.
import { createRateLimiter, type RateLimiter } from "@/platform/rate-limit";
import { hashToken, newInviteToken } from "./invite-token";

export const FRIEND_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

/** 30 new links per parent per hour: one per share, with room for many friends. */
export const friendLinkLimiter = createRateLimiter({ max: 30, windowMs: 60 * 60 * 1000 });

export type FriendLinkOwner = { ownerId: string; firstName: string; childFirstName: string | null };

export type FriendLinkStore = {
  addLink(ownerId: string, tokenHash: string): Promise<void>;
  /** Deletes every link of this owner. */
  removeLinks(ownerId: string): Promise<void>;
  /** The owner of the link with this hash, with their first name and first child's first name only; null when none. */
  findOwner(tokenHash: string): Promise<FriendLinkOwner | null>;
  /** Makes the two parents friends on both sides (`befriend`). */
  befriend(a: string, b: string): Promise<void>;
};

export function friendLinkUrl(base: string, token: string): string {
  return `${base}/f/${token}`;
}

export type NewLinkResult = { ok: true; url: string } | { ok: false; code: "TOO_MANY_LINKS"; retryAfterSeconds: number };

export async function newFriendLink(
  deps: { store: FriendLinkStore; limiter: RateLimiter; linkBase: string; random?: (bytes: number) => Buffer },
  ownerId: string,
): Promise<NewLinkResult> {
  const attempt = deps.limiter.hit(ownerId);
  if (!attempt.ok) return { ok: false, code: "TOO_MANY_LINKS", retryAfterSeconds: attempt.retryAfterSeconds };
  const { token, tokenHash } = deps.random ? newInviteToken(deps.random) : newInviteToken();
  await deps.store.addLink(ownerId, tokenHash);
  return { ok: true, url: friendLinkUrl(deps.linkBase, token) };
}

/** Who a link belongs to, for its page; null for a malformed token or a link that was stopped. */
export async function loadFriendLink(store: FriendLinkStore, token: string): Promise<FriendLinkOwner | null> {
  if (!FRIEND_TOKEN_PATTERN.test(token)) return null;
  return store.findOwner(hashToken(token));
}

export type AcceptResult = { ok: true; owner: FriendLinkOwner } | { ok: false; code: "NOT_FOUND" | "OWN_LINK" };

/** The signed-in parent (`userId` from the session) says yes: they and the link's owner become friends on both sides. */
export async function acceptFriendLink(store: FriendLinkStore, token: string, userId: string): Promise<AcceptResult> {
  const owner = await loadFriendLink(store, token);
  if (!owner) return { ok: false, code: "NOT_FOUND" };
  if (owner.ownerId === userId) return { ok: false, code: "OWN_LINK" };
  await store.befriend(owner.ownerId, userId);
  return { ok: true, owner };
}
