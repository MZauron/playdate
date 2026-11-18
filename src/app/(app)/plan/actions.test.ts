// The Send invite action as a whole: the session decides who organizes and whose friends can be invited; the form decides nothing
// about it. Errors come back as copy under the right field.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakePlaydateStore } from "@/lib/domain/playdates.fake-store";

const ALEX = "11111111-1111-4111-8111-111111111111";
const SAM = "22222222-2222-4222-8222-222222222222";
const DEV = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SAMS_FRIEND = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

let session = ALEX;
const FRIENDS = [
  { ownerId: ALEX, id: DEV, parentName: "Dev Patel", childFirstName: "Arjun", label: "Arjun's dad", kindredUserId: null },
  { ownerId: SAM, id: SAMS_FRIEND, parentName: "Zoe's mom", childFirstName: "Zoe", label: "Zoe's mom", kindredUserId: null },
];
const fake = createFakePlaydateStore(FRIENDS);
vi.mock("@/lib/auth/require-parent", () => ({
  requireParent: async () => ({ user: { id: session, phone: "14165550101" }, profile: { id: session, firstName: "Alex", children: [{ firstName: "Mia", ageLabel: "5" }] } }),
}));
vi.mock("@/lib/db/playdates", () => ({ playdateStore: fake.store, listTypedPlaces: async () => [] }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// T43: Or just say it. The friends list is the session's own; the cookie and the redirect are recorded, not real.
const remembered: { parentId: string; prefill: unknown }[] = [];
vi.mock("./said-cookie", () => ({
  rememberSaid: async (parentId: string, prefill: unknown) => void remembered.push({ parentId, prefill }),
  forgetSaid: async () => {},
}));
vi.mock("@/lib/db/friends", () => ({
  listFriends: async (ownerId: string) => FRIENDS.filter((f) => f.ownerId === ownerId).map((f) => ({ ...f, hasKindred: false })),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`redirect ${to}`);
  },
}));

const { sayItAction, sendInviteAction } = await import("./actions");

function form(fields: [string, string][]): FormData {
  const f = new FormData();
  for (const [k, v] of fields) f.append(k, v);
  return f;
}
const future = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
const plan = (extra: [string, string][] = []) =>
  form([["friendId", DEV], ["mode", "set_time"], ["day", future], ["startTime", "10:00"], ["endTime", "12:00"], ["zone", "America/Toronto"], ["yourName", "Alex"], ["message", "Park?"], ...extra]);

beforeEach(() => {
  session = ALEX;
  fake.playdates.length = 0;
});

describe("sendInviteAction", () => {
  it("creates the playdate for the signed-in parent and ignores an organizer id in the form", async () => {
    const state = await sendInviteAction({ errors: {} }, plan([["organizerId", SAM], ["organizer_id", SAM]]));
    expect(state.errors).toEqual({});
    expect(state.sent?.texts.map((t) => t.name)).toEqual(["Dev"]);
    expect(fake.playdates.map((p) => [p.organizerId, p.title])).toEqual([[ALEX, "Playdate: Mia & Arjun"]]);
  });

  it("cannot invite another parent's friend, even by id", async () => {
    session = SAM;
    const state = await sendInviteAction({ errors: {} }, plan());
    expect(state.errors).toEqual({ invitees: "Choose at least one family to invite." });
    expect(fake.playdates).toHaveLength(0);
  });

  it("puts each message under its field; start and end errors under When", async () => {
    const state = await sendInviteAction({ errors: {} }, form([["mode", "set_time"], ["day", future], ["startTime", "10:00"], ["endTime", "09:00"], ["yourName", ""], ["message", " "]]));
    expect(state.errors).toEqual({
      time: "The end has to be after the start.",
      message: "Please write a short message to the parents.",
      invitees: "Choose at least one family to invite.",
      yourName: "Please add your first name.",
    });
  });
});

describe("sayItAction (T43)", () => {
  beforeEach(() => {
    remembered.length = 0;
  });
  const words = (w: string) => form([["words", w], ["zone", "America/Toronto"]]);

  it("fills in Plan from the sentence (AI_MODE=fake: the built-in reader) with the session's own friends, then opens Plan", async () => {
    await expect(sayItAction({}, words("Dev and Zoe, tomorrow 2 to 4 at the park"))).rejects.toThrow("redirect /plan?said=1");
    expect(remembered).toEqual([{ parentId: ALEX, prefill: expect.objectContaining({ friendIds: [DEV], start: "14:00", end: "16:00", placeName: "the park" }) }]);
  });

  it("says how to phrase it when nothing in the sentence is usable, and remembers nothing", async () => {
    expect(await sayItAction({}, words("let's do something soon"))).toEqual({ error: "Try who, when and where, like “Dev, Saturday 2 to 4 at the park”." });
    expect(await sayItAction({}, words("x".repeat(1001)))).toMatchObject({ error: expect.any(String) });
    expect(remembered).toEqual([]);
  });
});
