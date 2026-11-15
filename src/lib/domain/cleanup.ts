// The tick's clean-up step (T23): 30 days after a playdate is over, its invite links stop existing and friends' notes are deleted.
// The rule (when) is rules/links.ts; the store does both in one step (migration 0006) and only touches what still holds a hash or a
// note, so running it again changes nothing.
import { cleanupCutoff } from "@/lib/rules/links";

export type CleanupStore = {
  cleanUp(cutoff: Date): Promise<{ linksRemoved: number; notesRemoved: number }>;
};

export async function runCleanup(store: CleanupStore, now: Date): Promise<{ linksRemoved: number; notesRemoved: number }> {
  return store.cleanUp(cleanupCutoff(now));
}
