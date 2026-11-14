import { describe, expect, it, vi } from "vitest";
import type { SetupStore } from "@/lib/db/profiles";
import { phoneHash } from "@/lib/phone";
import { completeSetup, parseSetupForm, setupErrors } from "./setup";

const KEY = "k".repeat(32);
const user = { id: "user-1", phone: "14165550101" }; // Supabase's form: no "+"

function form(fields: [string, string][]): FormData {
  const f = new FormData();
  for (const [k, v] of fields) f.append(k, v);
  return f;
}
const good = form([["firstName", "Alex"], ["childName", "Mia"], ["childAge", "5"]]);

function fakeStore(outcome: "created" | "exists" = "created") {
  const createProfile = vi.fn<SetupStore["createProfile"]>(async () => outcome);
  return { store: { createProfile } satisfies SetupStore, createProfile };
}

describe("parseSetupForm", () => {
  it("reads the first name and one child per row, in order", () => {
    const input = parseSetupForm(form([["firstName", "Alex"], ["childName", "Mia"], ["childAge", "5"], ["childName", "Leo"], ["childAge", "baby"]]));
    expect(input).toEqual({ firstName: "Alex", children: [{ firstName: "Mia", ageLabel: "5" }, { firstName: "Leo", ageLabel: "baby" }] });
  });
  it("ignores everything else the form says, such as who the parent is", () => {
    const input = parseSetupForm(form([["firstName", "Alex"], ["childName", "Mia"], ["childAge", "5"], ["parent_id", "someone-else"], ["id", "someone-else"], ["userId", "someone-else"], ["phone", "+14165550999"], ["phone_hash", "x"]]));
    expect(Object.keys(input).sort()).toEqual(["children", "firstName"]);
    expect(JSON.stringify(input)).not.toContain("someone-else");
    expect(JSON.stringify(input)).not.toContain("4165550999");
  });
});

describe("setupErrors", () => {
  it("is empty for a good form", () => {
    expect(setupErrors(parseSetupForm(good))).toEqual([]);
  });
  it("asks for the parent's first name (empty or spaces)", () => {
    expect(setupErrors({ firstName: "", children: [{ firstName: "Mia", ageLabel: "5" }] })).toEqual([{ code: "NAME_REQUIRED", field: "firstName" }]);
    expect(setupErrors({ firstName: "   ", children: [{ firstName: "Mia", ageLabel: "5" }] })).toEqual([{ code: "NAME_REQUIRED", field: "firstName" }]);
  });
  it("asks for each child's first name, naming the row", () => {
    const errors = setupErrors({ firstName: "Alex", children: [{ firstName: "Mia", ageLabel: "5" }, { firstName: " ", ageLabel: "3" }] });
    expect(errors).toEqual([{ code: "CHILD_NAME_REQUIRED", field: "child-1" }]);
  });
  it("asks for an age that is Baby or whole years", () => {
    for (const ageLabel of ["", "0", "five", "5.5", "-1"]) {
      expect(setupErrors({ firstName: "Alex", children: [{ firstName: "Mia", ageLabel }] }), ageLabel).toEqual([{ code: "CHILD_AGE_INVALID", field: "child-0" }]);
    }
  });
  it("needs at least one child, and not too many", () => {
    expect(setupErrors({ firstName: "Alex", children: [] })).toEqual([{ code: "NEEDS_CHILD", field: "children" }]);
    const many = Array.from({ length: 9 }, () => ({ firstName: "Mia", ageLabel: "5" }));
    expect(setupErrors({ firstName: "Alex", children: many }).map((e) => e.code)).toEqual(["TOO_MANY_CHILDREN"]);
  });
  it("reports the parent's and the child's mistakes together", () => {
    expect(setupErrors({ firstName: "", children: [{ firstName: "", ageLabel: "" }] }).map((e) => e.field)).toEqual(["firstName", "child-0"]);
  });
});

describe("completeSetup", () => {
  it("writes the signed-in user's profile with the HMAC of their own number, computed here", async () => {
    const { store, createProfile } = fakeStore();
    const result = await completeSetup({ store, phoneHashKey: KEY }, user, parseSetupForm(good));
    expect(result).toEqual({ ok: true, created: true });
    expect(createProfile).toHaveBeenCalledExactlyOnceWith({
      userId: "user-1",
      firstName: "Alex",
      phoneHash: phoneHash(KEY, "+14165550101"),
      children: [{ firstName: "Mia", ageLabel: "5" }],
    });
  });
  it("trims names and keeps the children in order", async () => {
    const { store, createProfile } = fakeStore();
    await completeSetup({ store, phoneHashKey: KEY }, user, { firstName: "  Alex ", children: [{ firstName: " Mia ", ageLabel: "5" }, { firstName: "Leo", ageLabel: "baby" }] });
    expect(createProfile.mock.calls[0]![0]).toMatchObject({ firstName: "Alex", children: [{ firstName: "Mia", ageLabel: "5" }, { firstName: "Leo", ageLabel: "baby" }] });
  });
  it("writes nothing when the form is wrong", async () => {
    const { store, createProfile } = fakeStore();
    const result = await completeSetup({ store, phoneHashKey: KEY }, user, { firstName: "", children: [{ firstName: "Mia", ageLabel: "5" }] });
    expect(result).toEqual({ ok: false, errors: [{ code: "NAME_REQUIRED", field: "firstName" }] });
    expect(createProfile).not.toHaveBeenCalled();
  });
  it("overwrites nobody: a parent who already finished Setup gets created: false", async () => {
    const { store } = fakeStore("exists");
    expect(await completeSetup({ store, phoneHashKey: KEY }, user, parseSetupForm(good))).toEqual({ ok: true, created: false });
  });
  it("refuses a user without a usable phone number", async () => {
    const { store, createProfile } = fakeStore();
    for (const phone of [undefined, "", "abc"]) {
      expect((await completeSetup({ store, phoneHashKey: KEY }, { id: "user-1", phone }, parseSetupForm(good))).ok, String(phone)).toBe(false);
    }
    expect(createProfile).not.toHaveBeenCalled();
  });
});
