// The invite texts a parent just prepared (T08 Send, T16 Send update), kept on THEIR phone for a day so the Text buttons survive a
// reload or a trip to Home. The links exist nowhere else: only their hashes are stored on the server (KD-14). Browser storage can be
// missing or blocked (private mode), so every read and write is allowed to fail quietly.
import type { TextButton } from "./TextButtons";

const PREFIX = "kindred:texts:";
const KEEP_MS = 24 * 60 * 60 * 1000;

export type SavedTexts = { savedAt: number; texts: TextButton[]; texted: string[] };

const key = (playdateId: string) => PREFIX + playdateId;

export function saveTexts(playdateId: string, texts: TextButton[], now = Date.now()): void {
  try {
    localStorage.setItem(key(playdateId), JSON.stringify({ savedAt: now, texts, texted: [] } satisfies SavedTexts));
  } catch {}
}

/** The raw stored value (for useSyncExternalStore), or null. */
export function readRaw(playdateId: string): string | null {
  try {
    return localStorage.getItem(key(playdateId));
  } catch {
    return null;
  }
}

/** Parses what readRaw returned; null when missing, malformed or older than a day. */
export function parseSaved(raw: string | null, now = Date.now()): SavedTexts | null {
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as SavedTexts;
    if (!Array.isArray(saved.texts) || typeof saved.savedAt !== "number" || now - saved.savedAt > KEEP_MS) return null;
    return { ...saved, texted: Array.isArray(saved.texted) ? saved.texted : [] };
  } catch {
    return null;
  }
}

export function markTexted(playdateId: string, textKey: string): void {
  const saved = parseSaved(readRaw(playdateId));
  if (!saved || saved.texted.includes(textKey)) return;
  try {
    localStorage.setItem(key(playdateId), JSON.stringify({ ...saved, texted: [...saved.texted, textKey] }));
    window.dispatchEvent(new StorageEvent("storage", { key: key(playdateId) })); // same-tab listeners
  } catch {}
}
