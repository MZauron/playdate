"use client";

import { useSyncExternalStore } from "react";
import { TextButtons } from "@/components/TextButtons";
import { parseSaved, readRaw } from "@/components/saved-texts";
import { enCA } from "@/lib/i18n/en-CA";

const subscribe = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

/**
 * The invite texts this phone prepared for this playdate in the last day and hasn't sent yet (saved-texts.ts). Nothing on the server
 * can rebuild a link, so this only appears on the phone that sent the invite; the server's first paint shows nothing.
 */
export function SavedInviteTexts({ playdateId }: { playdateId: string }) {
  const raw = useSyncExternalStore(subscribe, () => readRaw(playdateId), () => null);
  const saved = parseSaved(raw);
  if (!saved || saved.texts.every((x) => saved.texted.includes(x.key))) return null;
  return (
    <section aria-labelledby="saved-texts" className="flex flex-col gap-3">
      <h2 id="saved-texts" className="px-1 text-label font-bold uppercase tracking-wider text-muted">
        {enCA.playdate.savedTextsTitle}
      </h2>
      <p className="text-[15px] text-muted">{enCA.playdate.savedTextsNote}</p>
      <TextButtons texts={saved.texts} playdateId={playdateId} initiallyTexted={saved.texted} />
    </section>
  );
}
