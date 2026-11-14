import { describe, expect, it } from "vitest";
import { formatPhone, maskedPhone, maskPhoneForLog, parsePhone, phoneHash, toE164 } from "./phone";

describe("parsePhone", () => {
  it("accepts the ways a person writes a Canadian or US number", () => {
    for (const input of ["(416) 555-0101", "416-555-0101", "416 555 0101", "4165550101", "+1 416 555 0101", "1-416-555-0101", "  416.555.0101  "]) {
      expect(parsePhone(input), input).toBe("+14165550101");
    }
    expect(parsePhone("212 555 0100")).toBe("+12125550100");
  });
  it("refuses other countries, short numbers and text (Q10: +1 only)", () => {
    for (const input of ["+44 20 7946 0958", "416 555", "", "hello", "416 555 01012", "+593 99 123 4567"]) {
      expect(parsePhone(input), input).toBeNull();
    }
  });
});

describe("display", () => {
  it("formats and masks a +1 number", () => {
    expect(formatPhone("+14165550101")).toBe("(416) 555-0101");
    expect(maskedPhone("+14165550101")).toBe("(•••) •••-0101");
    expect(maskPhoneForLog("+14165550101")).toBe("***0101");
  });
  it("leaves other numbers recognisable but unreadable", () => {
    expect(maskedPhone("+442079460958")).toBe("+••••••••0958");
  });
});

describe("toE164", () => {
  it("adds the + that Supabase leaves out", () => {
    expect(toE164("14165550101")).toBe("+14165550101");
    expect(toE164("+14165550101")).toBe("+14165550101");
    expect(toE164("abc")).toBeNull();
  });
});

describe("phoneHash", () => {
  const key = "k".repeat(32);
  it("is stable, hex, and the same for the same number only", () => {
    expect(phoneHash(key, "+14165550101")).toBe(phoneHash(key, "+14165550101"));
    expect(phoneHash(key, "+14165550101")).toMatch(/^[0-9a-f]{64}$/);
    expect(phoneHash(key, "+14165550101")).not.toBe(phoneHash(key, "+14165550102"));
  });
  it("depends on the key, and never contains the number", () => {
    expect(phoneHash(key, "+14165550101")).not.toBe(phoneHash("j".repeat(32), "+14165550101"));
    expect(phoneHash(key, "+14165550101")).not.toContain("4165550101");
  });
  it("is an HMAC-SHA256 (known vector)", () => {
    // echo -n '+14165550101' | openssl dgst -sha256 -hmac "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk"
    expect(phoneHash(key, "+14165550101")).toBe("37db50e4487509ab0b1cb5cbbe809a98a83b5a95aa41db790a7637f84a7b18a9");
  });
});
