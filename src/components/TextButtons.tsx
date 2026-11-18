"use client";

import { useState } from "react";
import { Card } from "./Card";
import { shareText } from "./share";
import { cx } from "./cx";
import { enCA } from "@/lib/i18n/en-CA";
import { markTexted } from "./saved-texts";
import type { InviteChannel } from "@/lib/rules/types";

export type TextButton = { key: string; name: string; label: string; channel: InviteChannel; body: string };

/**
 * One "Share with Aisha" button per family (Q3, Q26): each opens the phone's share sheet with that family's text, and the parent
 * picks Aisha from their own contacts (see share.ts for phones without a share sheet). It ticks once shared. The next family to
 * share with gets the coral button; the rest stay quiet. Used after Send invite, Send update, Confirm and Cancel.
 */
export function TextButtons({ texts, playdateId, initiallyTexted = [] }: { texts: TextButton[]; /** Remember ticks on this phone (saved-texts.ts). */ playdateId?: string; initiallyTexted?: string[] }) {
  const [texted, setTexted] = useState<string[]>(initiallyTexted);
  const [copied, setCopied] = useState<string[]>([]);
  const next = texts.find((x) => !texted.includes(x.key))?.key;
  return (
    <ul className="flex flex-col gap-3">
      {texts.map((text) => {
        const done = texted.includes(text.key);
        return (
          <li key={text.key}>
            <Card className="flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{text.label}</span>
                <span className={cx("block text-[15px]", text.channel === "app" ? "text-primary" : "text-muted")}>
                  {text.channel === "app" ? enCA.friends.hasKindred : enCA.friends.getsText}
                </span>
              </span>
              <button
                type="button"
                onClick={async () => {
                  const result = await shareText(text.body);
                  if (result === "cancelled") return;
                  if (result === "copied") setCopied((list) => [...list, text.key]);
                  setTexted((list) => (list.includes(text.key) ? list : [...list, text.key]));
                  if (playdateId) markTexted(playdateId, text.key);
                }}
                className={cx(
                  "inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-4 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  done ? "text-success" : text.key === next ? "bg-accent text-white" : "bg-primary-tint text-primary",
                )}
              >
                {!done ? enCA.plan.textButton(text.name) : copied.includes(text.key) ? enCA.plan.copied(text.name) : enCA.plan.texted(text.name)}
              </button>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
