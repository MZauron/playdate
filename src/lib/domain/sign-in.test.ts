import { describe, expect, it, vi } from "vitest";
import { createCodeLog } from "@/lib/auth/code-log";
import { createRateLimiter } from "@/platform/rate-limit";
import { checkCode, requestCode, type SendCodeDeps, type VerifyDeps } from "./sign-in";

function deps(overrides: Partial<SendCodeDeps> & { nowMs?: number } = {}) {
  const sendCode = vi.fn<SendCodeDeps["sendCode"]>(async () => true);
  const base: SendCodeDeps = { sendCode, codeLog: createCodeLog(), addressLimiter: createRateLimiter({ max: 20, windowMs: 3_600_000 }), nowMs: 1_000_000, ...overrides };
  return { base, sendCode };
}
const ask = (d: SendCodeDeps, phone = "(416) 555-0101", address = "1.2.3.4") => requestCode(d, { phone, address });

describe("requestCode", () => {
  it("sends a code to the number as E.164, however it was typed", async () => {
    const { base, sendCode } = deps();
    expect(await ask(base, "416-555-0101")).toEqual({ ok: true, phone: "+14165550101" });
    expect(sendCode).toHaveBeenCalledExactlyOnceWith("+14165550101");
  });
  it("refuses a number that is not Canadian or US, sending nothing", async () => {
    const { base, sendCode } = deps();
    expect(await ask(base, "+44 20 7946 0958")).toEqual({ ok: false, code: "INVALID_PHONE" });
    expect(sendCode).not.toHaveBeenCalled();
  });
  it("makes a person wait 60 seconds for another code", async () => {
    const { base } = deps();
    await ask(base);
    const again = await ask({ ...base, nowMs: base.nowMs + 20_000 });
    expect(again).toEqual({ ok: false, code: "RESEND_TOO_SOON", retryAfterSeconds: 40 });
    expect((await ask({ ...base, nowMs: base.nowMs + 61_000 })).ok).toBe(true);
  });
  it("allows five codes an hour per phone", async () => {
    const { base } = deps();
    for (let i = 0; i < 5; i++) expect((await ask({ ...base, nowMs: base.nowMs + i * 61_000 })).ok, `code ${i + 1}`).toBe(true);
    const sixth = await ask({ ...base, nowMs: base.nowMs + 5 * 61_000 });
    expect(sixth).toMatchObject({ ok: false, code: "TOO_MANY_CODES" });
  });
  it("limits one address, whatever numbers it tries", async () => {
    const { base } = deps({ addressLimiter: createRateLimiter({ max: 2, windowMs: 3_600_000, now: () => 0 }) });
    expect((await ask(base, "416 555 0101")).ok).toBe(true);
    expect((await ask(base, "416 555 0102")).ok).toBe(true);
    expect(await ask(base, "416 555 0103")).toMatchObject({ ok: false, code: "TOO_MANY_REQUESTS" });
    expect((await ask(base, "416 555 0103", "5.6.7.8")).ok).toBe(true);
  });
  it("does not count a code that was not sent", async () => {
    const { base } = deps({ sendCode: vi.fn(async () => false) });
    expect(await ask(base)).toEqual({ ok: false, code: "SEND_FAILED" });
    expect(base.codeLog.sentAt("+14165550101", base.nowMs)).toEqual([]);
  });
});

describe("checkCode", () => {
  const make = (ok: boolean) => {
    const verifyCode = vi.fn<VerifyDeps["verifyCode"]>(async () => ok);
    return { verifyCode, attemptLimiter: createRateLimiter({ max: 3, windowMs: 900_000, now: () => 0 }) };
  };
  it("checks a six-digit code for the number as E.164", async () => {
    const d = make(true);
    expect(await checkCode(d, { phone: "(416) 555-0101", code: "123 456" })).toEqual({ ok: true });
    expect(d.verifyCode).toHaveBeenCalledExactlyOnceWith("+14165550101", "123456");
  });
  it("asks for a full code before it asks the identity service", async () => {
    const d = make(true);
    expect(await checkCode(d, { phone: "+14165550101", code: "12345" })).toEqual({ ok: false, code: "INVALID_CODE" });
    expect(d.verifyCode).not.toHaveBeenCalled();
  });
  it("says so when the code is wrong", async () => {
    expect(await checkCode(make(false), { phone: "+14165550101", code: "000000" })).toEqual({ ok: false, code: "CODE_REJECTED" });
  });
  it("stops guessing after a few tries on one number", async () => {
    const d = make(false);
    for (let i = 0; i < 3; i++) await checkCode(d, { phone: "+14165550101", code: "000000" });
    expect(await checkCode(d, { phone: "+14165550101", code: "000001" })).toMatchObject({ ok: false, code: "TOO_MANY_REQUESTS" });
    expect(d.verifyCode).toHaveBeenCalledTimes(3);
    expect(await checkCode(d, { phone: "+14165550102", code: "000000" })).toEqual({ ok: false, code: "CODE_REJECTED" });
  });
});
