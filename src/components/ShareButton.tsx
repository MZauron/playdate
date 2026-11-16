"use client";

import { useState } from "react";
import { cx } from "./cx";
import { shareText } from "./share";
import { enCA } from "@/lib/i18n/en-CA";

/** One "Share with Dev" button (Q26): the phone's share sheet with this text; ticks once shared. For a single text on a card. */
export function ShareButton({ text, name, className }: { text: string; name: string; className?: string }) {
  const [state, setState] = useState<"idle" | "shared" | "copied">("idle");
  return (
    <button
      type="button"
      onClick={async () => {
        const result = await shareText(text);
        if (result !== "cancelled") setState(result === "copied" ? "copied" : "shared");
      }}
      className={cx(
        "inline-flex min-h-11 shrink-0 items-center justify-center rounded-button px-4 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        state === "idle" ? "bg-accent text-white" : "text-success",
        className,
      )}
    >
      {state === "idle" ? enCA.plan.textButton(name) : state === "copied" ? enCA.plan.copied(name) : enCA.plan.texted(name)}
    </button>
  );
}
