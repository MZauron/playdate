// The Setup action as a whole: the session decides who the parent is; the form decides nothing about it.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { phoneHash } from "@/lib/phone";

const createProfile = vi.fn<(input: unknown) => Promise<"created" | "exists">>(async () => "created");
vi.mock("@/lib/db/profiles", () => ({ setupStore: { createProfile: (input: unknown) => createProfile(input) } }));
const requireUser = vi.fn(async () => ({ id: "session-user", phone: "14165550101" }));
vi.mock("@/lib/auth/require-parent", () => ({ requireUser: () => requireUser() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const { setupAction } = await import("./actions");
const { env } = await import("@/env");

function form(fields: [string, string][]): FormData {
  const f = new FormData();
  for (const [k, v] of fields) f.append(k, v);
  return f;
}

beforeEach(() => {
  createProfile.mockClear();
  requireUser.mockClear();
});

describe("setupAction", () => {
  it("ignores a forged parent_id (and id, phone) and writes for the signed-in user", async () => {
    const forged = form([["firstName", "Alex"], ["childName", "Mia"], ["childAge", "5"], ["parent_id", "victim-user"], ["id", "victim-user"], ["phone", "+14165550999"]]);
    await expect(setupAction({ errors: {} }, forged)).rejects.toThrow("REDIRECT /?welcome=1");
    expect(createProfile).toHaveBeenCalledOnce();
    const written = createProfile.mock.calls[0]![0] as { userId: string; phoneHash: string };
    expect(written.userId).toBe("session-user");
    expect(written.phoneHash).toBe(phoneHash(env.PHONE_HASH_KEY, "+14165550101"));
    expect(JSON.stringify(written)).not.toContain("victim-user");
  });
  it("does nothing for a signed-out visitor (the guard redirects before anything is read)", async () => {
    requireUser.mockRejectedValueOnce(new Error("REDIRECT /sign-in"));
    await expect(setupAction({ errors: {} }, form([["firstName", "Alex"], ["childName", "Mia"], ["childAge", "5"]]))).rejects.toThrow("REDIRECT /sign-in");
    expect(createProfile).not.toHaveBeenCalled();
  });
  it("shows the short message for an empty first name or child name, and writes nothing", async () => {
    const state = await setupAction({ errors: {} }, form([["firstName", ""], ["childName", ""], ["childAge", "5"]]));
    expect(state.errors).toEqual({ firstName: "Please tell us your first name.", "child-0": "Please add your child's first name." });
    expect(createProfile).not.toHaveBeenCalled();
  });
  it("sends a parent who already finished Setup home, without the welcome", async () => {
    createProfile.mockResolvedValueOnce("exists");
    await expect(setupAction({ errors: {} }, form([["firstName", "Alex"], ["childName", "Mia"], ["childAge", "5"]]))).rejects.toThrow("REDIRECT /");
  });
});
