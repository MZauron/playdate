"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/Button";
import { Card } from "@/components/Card";
import { cx } from "@/components/cx";
import type { TextToSend } from "@/lib/domain/playdates";
import { enCA } from "@/lib/i18n/en-CA";

const t = enCA.plan;

/**
 * After Send invite: one Text button per family (Q3). Each opens Messages on the organizer's own phone with the message and that
 * family's link; it ticks once tapped. The next family to text gets the coral button, the rest stay quiet.
 */
export function SentView({ texts }: { texts: TextToSend[] }) {
  const [texted, setTexted] = useState<string[]>([]);
  const next = texts.find((x) => !texted.includes(x.friendId))?.friendId;
  return (
    <div className="flex flex-col gap-5 pb-6 pt-4">
      <h1 className="text-title font-bold leading-tight">{t.sentTitle}</h1>
      <p className="text-muted">{t.sentNote}</p>
      <ul className="flex flex-col gap-3">
        {texts.map((text) => {
          const done = texted.includes(text.friendId);
          return (
            <li key={text.friendId}>
              <Card className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{text.label}</span>
                  <span className={cx("block text-[15px]", text.channel === "app" ? "text-primary" : "text-muted")}>
                    {text.channel === "app" ? enCA.friends.hasKindred : enCA.friends.getsText}
                  </span>
                </span>
                <a
                  href={text.href}
                  onClick={() => setTexted((list) => (list.includes(text.friendId) ? list : [...list, text.friendId]))}
                  className={cx(
                    "inline-flex h-11 shrink-0 items-center justify-center rounded-button px-4 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    done ? "text-success" : text.friendId === next ? "bg-accent text-white" : "bg-primary-tint text-primary",
                  )}
                >
                  {done ? t.texted(text.name) : t.textButton(text.name)}
                </a>
              </Card>
            </li>
          );
        })}
      </ul>
      <ButtonLink href="/" fullWidth>
        {t.backHome}
      </ButtonLink>
    </div>
  );
}
