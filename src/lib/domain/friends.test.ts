import { describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "@/platform/rate-limit";
import { phoneHash } from "@/lib/phone";
import { addFriend, defaultLabel, parseAddFriendForm, removeFriend, renameFriend, type AddFriendDeps } from "./friends";
import { createFakeFriendStore } from "./friends.fake-store";

const KEY = "k".repeat(32);
const ALEX = "11111111-1111-4111-8111-111111111111";
const SAM = "22222222-2222-4222-8222-222222222222";
const DEV_USER = "33333333-3333-4333-8333-333333333333";
const dev = { name: "Dev Patel", childName: "Arjun", phone: "(416) 555-0111" };

function setup(profilesByHash: Record<string, string> = {}, limit = 50) {
  const fake = createFakeFriendStore(profilesByHash);
  const deps: AddFriendDeps = { store: fake.store, phoneHashKey: KEY, limiter: createRateLimiter({ max: limit, windowMs: 3_600_000, now: () => 0 }) };
  return { ...fake, deps };
}

function form(fields: [string, string][]): FormData {
  const f = new FormData();
  for (const [k, v] of fields) f.append(k, v);
  return f;
}

describe("parseAddFriendForm", () => {
  it("reads the name, the child's name and the number, and nothing else", () => {
    const input = parseAddFriendForm(form([["name", "Dev"], ["childName", "Arjun"], ["phone", "416"], ["owner_id", "victim"], ["label", "x"], ["phone_hash", "h"], ["kindred_user_id", "k"]]));
    expect(Object.keys(input).sort()).toEqual(["childName", "name", "phone"]);
    expect(JSON.stringify(input)).not.toContain("victim");
  });
});

describe("addFriend: normalizing and hashing", () => {
  it("stores the number as E.164 however it was typed, with its HMAC", async () => {
    for (const typed of ["(416) 555-0111", "416-555-0111", "+1 416 555 0111", "4165550111"]) {
      const { deps, of } = setup();
      const result = await addFriend(deps, ALEX, { ...dev, phone: typed });
      expect(result.ok, typed).toBe(true);
      expect(of(ALEX)[0]).toMatchObject({ phoneE164: "+14165550111", phoneHash: phoneHash(KEY, "+14165550111") });
    }
  });
  it("never puts the number or the hash in what a screen gets back", async () => {
    const { deps } = setup();
    const result = await addFriend(deps, ALEX, dev);
    expect(result.ok && Object.keys(result.friend).sort()).toEqual(["childFirstName", "hasKindred", "id", "label", "parentName"]);
    expect(JSON.stringify(result)).not.toContain("4165550111");
  });
  it("trims the names and gives the friend a label from the child's name (Q17 default)", async () => {
    const { deps } = setup();
    const result = await addFriend(deps, ALEX, { name: "  Dev Patel ", childName: " Arjun ", phone: dev.phone });
    expect(result.ok && result.friend).toMatchObject({ parentName: "Dev Patel", childFirstName: "Arjun", label: "Arjun's parent" });
    expect(defaultLabel("Zara")).toBe("Zara's parent");
  });
});

describe("addFriend: refusals", () => {
  it("asks for each missing piece, storing nothing and not counting against the limit", async () => {
    const { deps, rows } = setup({}, 1);
    expect(await addFriend(deps, ALEX, { ...dev, name: "  " })).toEqual({ ok: false, code: "NAME_REQUIRED", field: "name" });
    expect(await addFriend(deps, ALEX, { ...dev, childName: "" })).toEqual({ ok: false, code: "CHILD_NAME_REQUIRED", field: "childName" });
    expect(await addFriend(deps, ALEX, { ...dev, phone: "+44 20 7946 0958" })).toEqual({ ok: false, code: "INVALID_PHONE", field: "phone" });
    expect(await addFriend(deps, ALEX, { ...dev, phone: "" })).toMatchObject({ code: "INVALID_PHONE" });
    expect(rows).toHaveLength(0);
    expect((await addFriend(deps, ALEX, dev)).ok).toBe(true); // the one allowed try is still there
  });
  it("refuses the owner's own number", async () => {
    const { deps, rows } = setup({ [phoneHash(KEY, "+14165550111")]: ALEX });
    expect(await addFriend(deps, ALEX, dev)).toEqual({ ok: false, code: "OWN_NUMBER", field: "phone" });
    expect(rows).toHaveLength(0);
  });
  it("refuses a number this owner already has, saying which friend, however it is written", async () => {
    const { deps, of } = setup();
    await addFriend(deps, ALEX, dev);
    const again = await addFriend(deps, ALEX, { name: "Someone", childName: "Else", phone: "+1 (416) 555-0111" });
    expect(again).toEqual({ ok: false, code: "DUPLICATE", field: "phone", existingLabel: "Arjun's parent" });
    expect(of(ALEX)).toHaveLength(1);
  });
  it("lets another parent have the same friend: lists are private", async () => {
    const { deps, of } = setup();
    expect((await addFriend(deps, ALEX, dev)).ok).toBe(true);
    expect((await addFriend(deps, SAM, dev)).ok).toBe(true);
    expect(of(ALEX)).toHaveLength(1);
    expect(of(SAM)).toHaveLength(1);
  });
});

describe("addFriend: matching Kindred parents", () => {
  it("marks a friend whose number belongs to a Kindred parent", async () => {
    const { deps, of } = setup({ [phoneHash(KEY, "+14165550111")]: DEV_USER });
    const result = await addFriend(deps, ALEX, dev);
    expect(result.ok && result.friend.hasKindred).toBe(true);
    expect(of(ALEX)[0]!.kindredUserId).toBe(DEV_USER);
  });
  it("leaves a number nobody on Kindred has as a text friend", async () => {
    const { deps, of } = setup({ [phoneHash(KEY, "+14165559999")]: DEV_USER });
    const result = await addFriend(deps, ALEX, dev);
    expect(result.ok && result.friend.hasKindred).toBe(false);
    expect(of(ALEX)[0]!.kindredUserId).toBeNull();
  });
  it("asks the store with the hash, never the number", async () => {
    const { deps, store } = setup();
    const spy = vi.spyOn(store, "findProfileIdByHash");
    await addFriend(deps, ALEX, dev);
    expect(spy).toHaveBeenCalledExactlyOnceWith(phoneHash(KEY, "+14165550111"));
  });
});

describe("addFriend: the rate limit", () => {
  it("stops one parent after their limit, with when to try again, and leaves others alone", async () => {
    const { deps, of } = setup({}, 3);
    for (const phone of ["416 555 0101", "416 555 0102", "416 555 0103"]) expect((await addFriend(deps, ALEX, { ...dev, phone })).ok, phone).toBe(true);
    const fourth = await addFriend(deps, ALEX, { ...dev, phone: "416 555 0104" });
    expect(fourth).toMatchObject({ ok: false, code: "TOO_MANY_ADDS" });
    expect(fourth.ok === false && fourth.retryAfterSeconds).toBe(3600);
    expect(of(ALEX)).toHaveLength(3);
    expect((await addFriend(deps, SAM, { ...dev, phone: "416 555 0104" })).ok).toBe(true);
  });
});

describe("renameFriend and removeFriend", () => {
  async function twoOwners() {
    const s = setup();
    const a = await addFriend(s.deps, ALEX, dev);
    const b = await addFriend(s.deps, SAM, dev);
    if (!a.ok || !b.ok) throw new Error("setup failed");
    return { ...s, alexFriend: a.friend.id, samFriend: b.friend.id };
  }

  it("renames the owner's own friend, trimming the label", async () => {
    const { store, of, alexFriend } = await twoOwners();
    expect(await renameFriend(store, ALEX, { friendId: alexFriend, label: "  Arjun's dad " })).toEqual({ ok: true });
    expect(of(ALEX)[0]!.label).toBe("Arjun's dad");
  });
  it("asks for a label of 1 to 40 characters", async () => {
    const { store, of, alexFriend } = await twoOwners();
    for (const label of ["", "   ", "x".repeat(41)]) {
      expect(await renameFriend(store, ALEX, { friendId: alexFriend, label })).toEqual({ ok: false, code: "LABEL_REQUIRED", field: "label" });
    }
    expect(of(ALEX)[0]!.label).toBe("Arjun's parent");
    expect((await renameFriend(store, ALEX, { friendId: alexFriend, label: "x".repeat(40) })).ok).toBe(true);
  });
  it("cannot rename another owner's friend, even with their id", async () => {
    const { store, of, samFriend } = await twoOwners();
    expect(await renameFriend(store, ALEX, { friendId: samFriend, label: "Mine now" })).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(of(SAM)[0]!.label).toBe("Arjun's parent");
  });
  it("removes the owner's own friend", async () => {
    const { store, of, alexFriend } = await twoOwners();
    expect(await removeFriend(store, ALEX, alexFriend)).toEqual({ ok: true });
    expect(of(ALEX)).toHaveLength(0);
    expect(of(SAM)).toHaveLength(1);
  });
  it("cannot remove another owner's friend, even with their id", async () => {
    const { store, of, samFriend } = await twoOwners();
    expect(await removeFriend(store, ALEX, samFriend)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(of(SAM)).toHaveLength(1);
  });
  it("answers NOT_FOUND for something that is not an id, without asking the store", async () => {
    const { store } = await twoOwners();
    const spy = vi.spyOn(store, "deleteFriend");
    expect(await removeFriend(store, ALEX, "1; drop table friends")).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await renameFriend(store, ALEX, { friendId: "nope", label: "x" })).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(spy).not.toHaveBeenCalled();
  });
});
