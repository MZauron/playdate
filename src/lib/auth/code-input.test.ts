import { describe, expect, it } from "vitest";
import { parseCode, resendSecondsLeft } from "./code-input";

describe("parseCode", () => {
  it("takes six digits, with or without spaces", () => {
    expect(parseCode("123456")).toBe("123456");
    expect(parseCode(" 123 456 ")).toBe("123456");
  });
  it("refuses anything else", () => {
    for (const input of ["", "12345", "1234567", "12345a", "abcdef"]) expect(parseCode(input), input).toBeNull();
  });
});

describe("resendSecondsLeft", () => {
  it("counts down from 60 to 0", () => {
    expect(resendSecondsLeft(0, 0)).toBe(60);
    expect(resendSecondsLeft(0, 15_000)).toBe(45);
    expect(resendSecondsLeft(0, 59_001)).toBe(1);
    expect(resendSecondsLeft(0, 60_000)).toBe(0);
    expect(resendSecondsLeft(0, 120_000)).toBe(0);
  });
});
