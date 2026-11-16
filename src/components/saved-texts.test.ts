// The invite texts kept on the organizer's phone for a day (C2): saved, read back, ticked, forgotten after a day, and quiet when
// storage is unavailable.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markTexted, parseSaved, readRaw, saveTexts } from "./saved-texts";

const texts = [
  { key: "f1", name: "Dev", label: "Arjun's dad", channel: "text" as const, body: "x" },
  { key: "f2", name: "Maya", label: "Lily's parent", channel: "app" as const, body: "y" },
];

class MemoryStorage {
  data = new Map<string, string>();
  getItem = (k: string) => this.data.get(k) ?? null;
  setItem = (k: string, v: string) => void this.data.set(k, v);
}

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemoryStorage());
  vi.stubGlobal("window", { dispatchEvent: () => true });
  vi.stubGlobal("StorageEvent", class { constructor(public type: string) {} });
});
afterEach(() => vi.unstubAllGlobals());

describe("saved invite texts", () => {
  it("are saved for one playdate, read back, and ticked one by one", () => {
    const now = Date.now();
    saveTexts("p1", texts, now);
    expect(parseSaved(readRaw("p1"), now + 1_000)).toEqual({ savedAt: now, texts, texted: [] });
    markTexted("p1", "f1");
    markTexted("p1", "f1");
    expect(parseSaved(readRaw("p1"))?.texted).toEqual(["f1"]);
    expect(readRaw("other")).toBeNull();
  });
  it("are forgotten after a day, or when what is stored is not theirs", () => {
    saveTexts("p1", texts, 0);
    expect(parseSaved(readRaw("p1"), 24 * 60 * 60 * 1000 + 1)).toBeNull();
    expect(parseSaved("not json")).toBeNull();
    expect(parseSaved(JSON.stringify({ texts: "nope" }))).toBeNull();
  });
  it("fail quietly when the browser blocks storage", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
    expect(() => saveTexts("p1", texts)).not.toThrow();
    expect(readRaw("p1")).toBeNull();
    expect(() => markTexted("p1", "f1")).not.toThrow();
  });
});
