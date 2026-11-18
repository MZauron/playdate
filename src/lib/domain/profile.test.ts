import { describe, expect, it } from "vitest";
import type { ProfileStore } from "@/lib/db/profiles";
import { parseProfileForm, saveProfile } from "./profile";

const MIA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const form = (rows: [string, string, string][], firstName = "Alex") => {
  const f = new FormData();
  f.set("firstName", firstName);
  for (const [id, name, age] of rows) {
    f.append("childId", id);
    f.append("childName", name);
    f.append("childAge", age);
  }
  f.set("parentId", "someone-else"); // ignored
  return f;
};
const store = () => {
  const calls: Parameters<ProfileStore["updateProfile"]>[0][] = [];
  return { calls, store: { updateProfile: async (input) => (calls.push(input), true) } satisfies ProfileStore };
};

describe("Profile (T39)", () => {
  it("saves the signed-in parent's name and children, keeping known ids and dropping anything that isn't an id", async () => {
    const { calls, store: s } = store();
    const result = await saveProfile(s, "user-1", parseProfileForm(form([[MIA, " Mia ", "6"], ["", "Leo", "baby"], ["not-an-id", "Zoe", "3"]], " Alexandra ")));
    expect(result).toEqual({ ok: true });
    expect(calls).toEqual([
      {
        userId: "user-1",
        firstName: "Alexandra",
        children: [
          { id: MIA, firstName: "Mia", ageLabel: "6" },
          { id: null, firstName: "Leo", ageLabel: "baby" },
          { id: null, firstName: "Zoe", ageLabel: "3" },
        ],
      },
    ]);
  });
  it("uses Setup's rules: a name, at least one child, each with a name and an age; nothing is written on a no", async () => {
    const { calls, store: s } = store();
    expect(await saveProfile(s, "u", parseProfileForm(form([[MIA, "Mia", "5"]], " ")))).toEqual({ ok: false, errors: [{ code: "NAME_REQUIRED", field: "firstName" }] });
    expect(await saveProfile(s, "u", parseProfileForm(form([])))).toEqual({ ok: false, errors: [{ code: "NEEDS_CHILD", field: "children" }] });
    expect(await saveProfile(s, "u", parseProfileForm(form([["", "Leo", ""]])))).toEqual({ ok: false, errors: [{ code: "CHILD_AGE_INVALID", field: "child-0" }] });
    expect(calls).toEqual([]);
  });
});
