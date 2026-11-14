import { describe, expect, it } from "vitest";
import { createCodeLog } from "./code-log";

describe("createCodeLog", () => {
  it("remembers when codes went to each phone, for an hour", () => {
    const log = createCodeLog();
    log.record("+14165550101", 1_000);
    log.record("+14165550101", 5_000);
    log.record("+14165550102", 2_000);
    expect(log.sentAt("+14165550101", 10_000)).toEqual([1_000, 5_000]);
    expect(log.sentAt("+14165550102", 10_000)).toEqual([2_000]);
    expect(log.sentAt("+14165550101", 1_000 + 3_600_000)).toEqual([5_000]);
    expect(log.sentAt("+14165550103", 10_000)).toEqual([]);
  });
  it("forgets the oldest phones past its limit, so memory cannot grow without bound", () => {
    const log = createCodeLog(2);
    log.record("a", 1);
    log.record("b", 2);
    log.record("c", 3);
    expect(log.sentAt("a", 4)).toEqual([]);
    expect(log.sentAt("c", 4)).toEqual([3]);
  });
});
