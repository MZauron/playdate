// Friends (T07): add by name, child's name and number; rename the label; remove. The owner is always the signed-in parent the
// caller passes in; nothing the form says about who owns a friend (an owner id) is read. Pure apart from the ports passed in.
import { z } from "zod";
import { createRateLimiter, type RateLimiter } from "@/platform/rate-limit";
import { parsePhone, phoneHash } from "@/lib/phone";

export const LABEL_MAX = 40;

// --- What the owner sees --------------------------------------------------------------------------------------------------
/** A friend as a screen may show it. No phone number and no hash: those never leave the server (CLAUDE.md "Privacy"). */
export type Friend = {
  id: string;
  parentName: string;
  childFirstName: string | null;
  label: string;
  /** True when the number belongs to a Kindred parent: they get the invite in the app. Otherwise they get a text. */
  hasKindred: boolean;
};

/** Q17 default: "Arjun's parent" (not "dad" or "mom": nobody told us which). The owner can rename it. */
export function defaultLabel(childFirstName: string): string {
  return `${childFirstName}'s parent`;
}

// --- The store the service talks to (src/lib/db/friends.ts is the real one) ---------------------------------------------------
export type FriendStore = {
  /** The Kindred parent whose number hashes to this, or null. */
  findProfileIdByHash(phoneHash: string): Promise<string | null>;
  /** Adds the friend for this owner. "duplicate" when the owner already has a friend with this number. */
  insertFriend(input: {
    ownerId: string;
    parentName: string;
    childFirstName: string;
    label: string;
    /** Only the keyed hash (for "has Kindred" and duplicates): the number itself is never stored (Q26). */
    phoneHash: string;
    kindredUserId: string | null;
  }): Promise<{ status: "added"; friend: Friend } | { status: "duplicate"; label: string }>;
  /** Changes the label of THIS owner's friend; false when the owner has no such friend. */
  renameFriend(ownerId: string, friendId: string, label: string): Promise<boolean>;
  /** Removes THIS owner's friend (their invites and answers go with it); false when the owner has no such friend. */
  deleteFriend(ownerId: string, friendId: string): Promise<boolean>;
};

// --- Add ----------------------------------------------------------------------------------------------------------------------
export type FriendErrorCode =
  | "NAME_REQUIRED"
  | "CHILD_NAME_REQUIRED"
  | "INVALID_PHONE"
  | "OWN_NUMBER"
  | "DUPLICATE"
  | "TOO_MANY_ADDS"
  | "LABEL_REQUIRED"
  | "NOT_FOUND";
export type FriendFailure = { ok: false; code: FriendErrorCode; field?: string; retryAfterSeconds?: number; existingLabel?: string };

const name = (max: number) => z.string().trim().min(1).max(max);

/** What the add form posts: `name`, `childName`, `phone`. Anything else in it (an owner id, a label, a hash) is ignored. */
export function parseAddFriendForm(form: FormData): { name: string; childName: string; phone: string } {
  return { name: String(form.get("name") ?? ""), childName: String(form.get("childName") ?? ""), phone: String(form.get("phone") ?? "") };
}

/** 50 adds per owner per hour: enough to add a whole class, not enough to probe which numbers use Kindred. */
export const friendsLimiter = createRateLimiter({ max: 50, windowMs: 60 * 60 * 1000 });

export type AddFriendDeps = { store: FriendStore; phoneHashKey: string; limiter: RateLimiter };

/**
 * `ownerId` comes from `auth.getUser()`. The number is normalized to E.164, hashed with the server's key, and matched against
 * Kindred parents; then it is dropped (Q26): only the hash is stored, for the owner only.
 */
export async function addFriend(
  deps: AddFriendDeps,
  ownerId: string,
  input: { name: string; childName: string; phone: string },
): Promise<{ ok: true; friend: Friend } | FriendFailure> {
  if (!name(60).safeParse(input.name).success) return { ok: false, code: "NAME_REQUIRED", field: "name" };
  if (!name(40).safeParse(input.childName).success) return { ok: false, code: "CHILD_NAME_REQUIRED", field: "childName" };
  const phone = parsePhone(input.phone);
  if (!phone) return { ok: false, code: "INVALID_PHONE", field: "phone" };

  // A try counts once the input is well formed: only a valid number can probe who uses Kindred.
  const attempt = deps.limiter.hit(ownerId);
  if (!attempt.ok) return { ok: false, code: "TOO_MANY_ADDS", retryAfterSeconds: attempt.retryAfterSeconds };

  const hash = phoneHash(deps.phoneHashKey, phone);
  const kindredUserId = await deps.store.findProfileIdByHash(hash);
  if (kindredUserId === ownerId) return { ok: false, code: "OWN_NUMBER", field: "phone" };

  const childFirstName = input.childName.trim();
  const result = await deps.store.insertFriend({
    ownerId,
    parentName: input.name.trim(),
    childFirstName,
    label: defaultLabel(childFirstName),
    phoneHash: hash,
    kindredUserId,
  });
  if (result.status === "duplicate") return { ok: false, code: "DUPLICATE", field: "phone", existingLabel: result.label };
  return { ok: true, friend: result.friend };
}

// --- Rename and remove: the friend id in the form only names a friend; whose friend it is comes from the session -------------------
const isId = (id: string) => z.uuid().safeParse(id).success;

export async function renameFriend(store: FriendStore, ownerId: string, input: { friendId: string; label: string }): Promise<{ ok: true } | FriendFailure> {
  const label = input.label.trim();
  if (!label || label.length > LABEL_MAX) return { ok: false, code: "LABEL_REQUIRED", field: "label" };
  if (!isId(input.friendId)) return { ok: false, code: "NOT_FOUND" };
  return (await store.renameFriend(ownerId, input.friendId, label)) ? { ok: true } : { ok: false, code: "NOT_FOUND" };
}

export async function removeFriend(store: FriendStore, ownerId: string, friendId: string): Promise<{ ok: true } | FriendFailure> {
  if (!isId(friendId)) return { ok: false, code: "NOT_FOUND" };
  return (await store.deleteFriend(ownerId, friendId)) ? { ok: true } : { ok: false, code: "NOT_FOUND" };
}
