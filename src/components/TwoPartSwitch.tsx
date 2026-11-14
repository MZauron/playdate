"use client";

import { cx } from "./cx";

export type SwitchOption<T extends string> = { value: T; label: string };

/** A grey pill with two sides; the active side is white. "Pick date and time" / "Share availability". */
export function TwoPartSwitch<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly [SwitchOption<T>, SwitchOption<T>];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-button bg-page p-1 ring-1 ring-black/5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cx(
              "min-h-11 flex-1 rounded-[11px] px-3 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-primary",
              active ? "bg-card text-ink shadow-card" : "text-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
