// Invite to Kindred (T34) with an in-memory store: only the hash is kept, a stopped link finds nothing, a parent can't befriend
// themself, and saying yes befriends both sides once.
import { describe, expect, it } from "vitest";
import { acceptFriendLink, friendLinkUrl, loadFriendLink, newFriendLink, type FriendLinkStore } from "./friend-links";
import { hashToken } from "./invite-token";

function world() {
  const links: { ownerId: string; tokenHash: string }[] = [];
  const friendships: [string, string][] = [];
  const people: Record<string, { firstName: string; childFirstName: string | null }> = { alex: { firstName: "Alex", childFirstName: "Mia" } };
  const store: FriendLinkStore = {
    async addLink(ownerId, tokenHash) {
      links.push({ ownerId, tokenHash });
    },
    async removeLinks(ownerId) {
      for (let i = links.length - 1; i >= 0; i--) if (links[i]!.ownerId === ownerId) links.splice(i, 1);
    },
    async findOwner(tokenHash) {
      const link = links.find((l) => l.tokenHash === tokenHash);
      return link ? { ownerId: link.ownerId, ...people[link.ownerId]! } : null;
    },
    async befriend(a, b) {
      friendships.push([a, b]);
    },
  };
  const open = { hit: () => ({ ok: true as const }) };
  return { links, friendships, store, deps: { store, limiter: open, linkBase: "https://kindred.test" } };
}
const tokenOf = (url: string) => url.split("/f/")[1]!;

describe("Invite to Kindred (T34)", () => {
  it("makes a 128-bit link and keeps only its hash", async () => {
    const { links, deps } = world();
    const made = await newFriendLink(deps, "alex");
    if (!made.ok) throw new Error("expected ok");
    const token = tokenOf(made.url);
    expect(made.url).toBe(friendLinkUrl("https://kindred.test", token));
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(links).toEqual([{ ownerId: "alex", tokenHash: hashToken(token) }]);
    expect(JSON.stringify(links)).not.toContain(token);
  });

  it("shows the owner's first name and first child only, and nothing for a malformed or stopped link", async () => {
    const { store, deps } = world();
    const made = await newFriendLink(deps, "alex");
    if (!made.ok) throw new Error("expected ok");
    expect(await loadFriendLink(store, tokenOf(made.url))).toEqual({ ownerId: "alex", firstName: "Alex", childFirstName: "Mia" });
    expect(await loadFriendLink(store, "../../etc")).toBeNull();
    await store.removeLinks("alex");
    expect(await loadFriendLink(store, tokenOf(made.url))).toBeNull();
  });

  it("saying yes befriends the two parents; the owner's own link and a stopped link do nothing", async () => {
    const { store, friendships, deps } = world();
    const made = await newFriendLink(deps, "alex");
    if (!made.ok) throw new Error("expected ok");
    const token = tokenOf(made.url);
    expect(await acceptFriendLink(store, token, "alex")).toEqual({ ok: false, code: "OWN_LINK" });
    expect(await acceptFriendLink(store, token, "sam")).toMatchObject({ ok: true, owner: { firstName: "Alex" } });
    expect(friendships).toEqual([["alex", "sam"]]);
    await store.removeLinks("alex");
    expect(await acceptFriendLink(store, token, "maya")).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(friendships).toHaveLength(1);
  });

  it("refuses more links than the limit allows", async () => {
    const { store } = world();
    const shut = { hit: () => ({ ok: false as const, retryAfterSeconds: 60 }) };
    expect(await newFriendLink({ store, limiter: shut, linkBase: "https://kindred.test" }, "alex")).toEqual({ ok: false, code: "TOO_MANY_LINKS", retryAfterSeconds: 60 });
  });
});
