// The friends actions as a whole: the session decides whose friends these are; the form decides nothing about it.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeFriendStore } from "@/lib/domain/friends.fake-store";

const ALEX = "11111111-1111-4111-8111-111111111111";
const SAM = "22222222-2222-4222-8222-222222222222";

let session = ALEX;
const fake = createFakeFriendStore();
vi.mock("@/lib/auth/require-parent", () => ({ requireParent: async () => ({ user: { id: session, phone: "14165550101" }, profile: {} }) }));
vi.mock("@/lib/db/friends", () => ({ friendStore: fake.store }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { addFriendAction, removeFriendAction, renameFriendAction } = await import("./actions");

function form(fields: [string, string][]): FormData {
  const f = new FormData();
  for (const [k, v] of fields) f.append(k, v);
  return f;
}
const start = { version: 0, errors: {} };
const dev = (extra: [string, string][] = []) => form([["name", "Dev Patel"], ["childName", "Arjun"], ["phone", "416 555 0111"], ...extra]);

beforeEach(() => {
  session = ALEX;
  fake.rows.length = 0;
});

describe("addFriendAction", () => {
  it("adds the friend for the signed-in parent and ignores an owner_id in the form", async () => {
    const state = await addFriendAction(start, dev([["owner_id", SAM], ["ownerId", SAM], ["parent_id", SAM]]));
    expect(state).toEqual({ version: 1, errors: {}, added: "Arjun's parent added.", addedId: fake.of(ALEX)[0]!.id });
    expect(fake.of(ALEX)).toHaveLength(1);
    expect(fake.of(SAM)).toHaveLength(0);
  });
  it("shows the short message under the field that is wrong", async () => {
    const state = await addFriendAction(start, form([["name", ""], ["childName", "Arjun"], ["phone", "416 555 0111"]]));
    expect(state).toEqual({ version: 0, errors: { name: "Please add their name." } });
    expect((await addFriendAction(start, form([["name", "Dev"], ["childName", "Arjun"], ["phone", "12345"]]))).errors.phone).toBe("That doesn't look like a Canadian or US phone number.");
  });
  it("says which friend a repeated number already is", async () => {
    await addFriendAction(start, dev());
    const state = await addFriendAction(start, dev());
    expect(state.errors.phone).toBe("You already have Arjun's parent with that number.");
  });
});

describe("renameFriendAction and removeFriendAction", () => {
  it("rename and remove work on the signed-in parent's own friend", async () => {
    await addFriendAction(start, dev());
    const id = fake.of(ALEX)[0]!.id;
    expect(await renameFriendAction({}, form([["friendId", id], ["label", "Arjun's dad"]]))).toEqual({ done: true });
    expect(fake.of(ALEX)[0]!.label).toBe("Arjun's dad");
    expect(await removeFriendAction({}, form([["friendId", id]]))).toEqual({ done: true });
    expect(fake.of(ALEX)).toHaveLength(0);
  });
  it("cannot touch another parent's friend by sending their id", async () => {
    session = SAM;
    await addFriendAction(start, dev());
    const samFriend = fake.of(SAM)[0]!.id;
    session = ALEX;
    expect(await renameFriendAction({}, form([["friendId", samFriend], ["label", "Mine"]]))).toEqual({ error: "That friend isn't in your list any more." });
    expect(await removeFriendAction({}, form([["friendId", samFriend]]))).toEqual({ error: "That friend isn't in your list any more." });
    expect(fake.of(SAM)[0]!.label).toBe("Arjun's parent");
  });
});
