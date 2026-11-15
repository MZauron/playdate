import { describe, expect, it } from "vitest";
import { smsHref, textBody } from "./text-message";

describe("the Text link (Q3)", () => {
  it("KD-05: the body is the message exactly as typed, a blank line, then the link; nothing else is added", () => {
    expect(textBody("Park at 10?", "https://kindred.test/r/abc")).toBe("Park at 10?\n\nhttps://kindred.test/r/abc");
  });
  it("opens Messages to that one number with the body encoded", () => {
    const href = smsHref("+14165550111", "Park & pizza? 50% chance of rain", "https://kindred.test/r/abc");
    expect(href.startsWith("sms:+14165550111?&body=")).toBe(true);
    expect(href).not.toMatch(/[ \n&]pizza/);
    expect(decodeURIComponent(href.split("body=")[1]!)).toBe("Park & pizza? 50% chance of rain\n\nhttps://kindred.test/r/abc");
  });
});
