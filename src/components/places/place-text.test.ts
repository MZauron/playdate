import { describe, expect, it } from "vitest";
import { placeFacts, telHref } from "./place-text";

describe("placeFacts", () => {
  it("says only what the provider knows, in the doc's order", () => {
    expect(placeFacts({ setting: "outdoor", ages: { min: 2, max: 12 }, price: "free", rating: 4.6 })).toBe("Outdoor · Ages 2–12 · Free · ★ 4.6");
    expect(placeFacts({ setting: "both", ages: { min: 0, max: null } })).toBe("Indoor and outdoor · All ages");
    expect(placeFacts({ setting: null, ages: { min: 3, max: null }, price: null, rating: null })).toBe("Ages 3+");
    expect(placeFacts({ setting: null, ages: null })).toBe("");
  });
  it("turns a provider's number into a tel: link", () => {
    expect(telHref("+1 416-555-0190")).toBe("tel:+14165550190");
    expect(telHref("(416) 555-0190")).toBe("tel:4165550190");
  });
});
