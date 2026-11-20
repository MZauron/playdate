"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";
import { ShareButton } from "@/components/ShareButton";
import { enCA } from "@/lib/i18n/en-CA";

const t = enCA.friends.page.quick;

/**
 * T53 (KD-05 unchanged): Send a quick message to one friend. Three ready lines the parent picks and edits; the text in the box is what
 * goes, through the phone's share sheet (T33), to whoever they choose. Nothing is sent by Kindred, and nothing is kept or logged.
 */
export function QuickMessage({ name, lines }: { name: string; lines: readonly { label: string; text: string }[] }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(0);
  const [text, setText] = useState(lines[0]?.text ?? "");
  if (!open)
    return (
      <Button fullWidth onClick={() => setOpen(true)}>
        {t.open}
      </Button>
    );
  return (
    <Card className="flex flex-col gap-3">
      <p className="text-[15px] text-muted">{t.hint}</p>
      <div className="flex flex-wrap gap-2">
        {lines.map((line, i) => (
          <Chip
            key={line.label}
            selected={picked === i}
            onClick={() => {
              setPicked(i);
              setText(line.text);
            }}
          >
            {line.label}
          </Chip>
        ))}
      </div>
      <div>
        <label htmlFor="quick-message" className="mb-1.5 block text-[12px] font-bold uppercase tracking-wider text-muted">
          {t.label}
        </label>
        <textarea
          id="quick-message"
          rows={3}
          maxLength={300}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="block w-full rounded-xl bg-card px-4 py-3 text-base text-ink ring-1 ring-border focus-visible:outline-2 focus-visible:outline-primary"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {text.trim() && <ShareButton text={text.trim()} name={name} tone="teal" />}
        <Button compact onClick={() => setOpen(false)}>
          {t.close}
        </Button>
      </div>
    </Card>
  );
}
