// T42 (Q30): which of the owner's children a friend knows. Pure, so the Plan screen can use it in the browser.
import type { Friend } from "./friends";

/**
 * T42 (Q30 default): the owner's children this friend knows, in the owner's order. Not set (or only children since removed) counts
 * as the owner's first child, as in the mock-up.
 */
export function knownKids(friend: Pick<Friend, "childIds">, kids: readonly { id: string }[]): string[] {
  const stored = new Set(friend.childIds ?? []);
  const known = kids.filter((k) => stored.has(k.id)).map((k) => k.id);
  return known.length ? known : kids.slice(0, 1).map((k) => k.id);
}

/** T42: friends who know any of these children first, then the rest, each in list order. With no children given, everyone is first. */
export function friendsForKids<T extends Pick<Friend, "childIds">>(friends: readonly T[], kids: readonly { id: string }[], childIds: readonly string[]): { first: T[]; rest: T[] } {
  if (!childIds.length || kids.length < 2) return { first: [...friends], rest: [] };
  const wanted = new Set(childIds);
  const first: T[] = [];
  const rest: T[] = [];
  for (const f of friends) (knownKids(f, kids).some((id) => wanted.has(id)) ? first : rest).push(f);
  return { first, rest };
}
