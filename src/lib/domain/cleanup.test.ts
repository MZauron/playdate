import { describe, expect, it } from "vitest";
import { cleanupCutoff } from "@/lib/rules/links";
import { runCleanup } from "./cleanup";

describe("runCleanup (T23)", () => {
  it("asks the store to clean everything past the rule's cut-off, and reports the counts", async () => {
    const now = new Date("2026-11-14T15:00:00Z");
    const seen: Date[] = [];
    const result = await runCleanup({ cleanUp: async (cutoff) => (seen.push(cutoff), { linksRemoved: 2, notesRemoved: 1 }) }, now);
    expect(seen).toEqual([cleanupCutoff(now)]);
    expect(result).toEqual({ linksRemoved: 2, notesRemoved: 1 });
  });
});
