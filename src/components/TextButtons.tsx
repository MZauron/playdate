"use client";

import { useState } from "react";
import { Card } from "./Card";
import { cx } from "./cx";
import { enCA } from "@/lib/i18n/en-CA";
import { markTexted } from "./saved-texts";
import type { InviteChannel } from "@/lib/rules/types";

export type TextButton = { key: string; name: string; label: string; channel: InviteChannel; href: string };

/**
 * One "Text Aisha" button per family (Q3): each opens Messages on the organizer's own phone with the text filled in, and ticks once
 * tapped. The next family to text gets the coral button; the rest stay quiet. Used after Send invite and after Confirm.
 */
export function TextButtons({ texts, playdateId, initiallyTexted = [] }: { texts: TextButton[]; /** Remember ticks on this phone (saved-texts.ts). */ playdateId?: string; initiallyTexted?: string[] }) {
  const [texted, setTexted] = useState<string[]>(initiallyTexted);
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
              <a
                href={text.href}
                onClick={() => {
                  setTexted((list) => (list.includes(text.key) ? list : [...list, text.key]));
                  if (playdateId) markTexted(playdateId, text.key);
                }}
                className={cx(
                  "inline-flex h-11 shrink-0 items-center justify-center rounded-button px-4 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  done ? "text-success" : text.key === next ? "bg-accent text-white" : "bg-primary-tint text-primary",
                )}
              >
                {done ? enCA.plan.texted(text.name) : enCA.plan.textButton(text.name)}
              </a>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
