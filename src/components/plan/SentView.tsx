"use client";

import { useEffect } from "react";
import { ButtonLink } from "@/components/Button";
import { saveTexts } from "@/components/saved-texts";
import { TextButtons } from "@/components/TextButtons";
import type { TextToSend } from "@/lib/domain/playdates";
import { enCA } from "@/lib/i18n/en-CA";

const t = enCA.plan;

/** After Send invite (or Send update, T16): one Text button per family (Q3). */
export function SentView({ texts, playdateId, update = false, backTo = "/" }: { texts: TextToSend[]; playdateId: string; update?: boolean; backTo?: string }) {
  const buttons = texts.map((x) => ({ key: x.friendId, name: x.name, label: x.label, channel: x.channel, href: x.href }));
  // Kept on this phone for a day, so the playdate page can show the ones not sent yet after a reload.
  useEffect(() => saveTexts(playdateId, buttons), [playdateId]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex flex-col gap-5 pb-6 pt-4">
      <h1 className="text-title font-bold leading-tight">{update ? t.updateTitle : t.sentTitle}</h1>
      <p className="text-muted">{update ? t.updateNote : t.sentNote}</p>
      <TextButtons texts={buttons} playdateId={playdateId} />
      <ButtonLink href={backTo} fullWidth>
        {update ? t.backToPlaydate : t.backHome}
      </ButtonLink>
    </div>
  );
}
