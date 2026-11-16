import { describe, expect, it } from "vitest";
import { textBody } from "./text-message";

describe("the shared text (Q3, Q26)", () => {
  it("KD-05: the body is the message exactly as typed, a blank line, then the link; nothing else is added", () => {
    expect(textBody("Park at 10?", "https://kindred.test/r/abc")).toBe("Park at 10?\n\nhttps://kindred.test/r/abc");
    expect(textBody("Park & pizza? 50% chance of rain", "https://kindred.test/r/abc")).toBe("Park & pizza? 50% chance of rain\n\nhttps://kindred.test/r/abc");
  });
});
