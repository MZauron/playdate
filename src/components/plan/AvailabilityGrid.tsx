"use client";

import { useState } from "react";
import { cx } from "@/components/cx";
import { enCA } from "@/lib/i18n/en-CA";
import { SLOT_HOURS, SLOT_ORDER } from "@/lib/rules/config";
import { addDays, dayHeading, dayLabel, weekFrom } from "./plan-time";

const t = enCA.plan;

/**
 * Share availability (T12): days across, Morning / Afternoon / Evening down, arrows between weeks. Tapping a box ticks it (teal);
 * days before today can't be ticked (KD-04). Values are "2026-11-16|morning", in the playdate's zone.
 */
export function AvailabilityGrid({ today, value, onChange }: { today: string; value: string[]; onChange: (value: string[]) => void }) {
  const [first, setFirst] = useState(today);
  const days = weekFrom(first);
  const toggle = (key: string) => onChange(value.includes(key) ? value.filter((v) => v !== key) : [...value, key]);
  const range = `${dayLabel(days[0]!)} – ${dayLabel(days[6]!)}`;

  return (
    // Full width under the step's number, so seven boxes stay at least 44 px wide on a 375 px phone.
    <div className="-ml-11 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={t.previousWeek}
          disabled={first <= today}
          onClick={() => setFirst(addDays(first, -7) < today ? today : addDays(first, -7))}
          className="flex size-11 items-center justify-center rounded-full text-xl text-primary disabled:opacity-30"
        >
          ‹
        </button>
        <p className="text-[15px] font-semibold" aria-live="polite">
          {range}
        </p>
        <button type="button" aria-label={t.nextWeek} onClick={() => setFirst(addDays(first, 7))} className="flex size-11 items-center justify-center rounded-full text-xl text-primary">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-[3px] text-center">
        {days.map((day) => {
          const h = dayHeading(day);
          return (
            <div key={day} className="flex flex-col text-label leading-tight text-muted">
              <span className="font-semibold uppercase">{h.weekday}</span>
              <span className="text-[15px] font-semibold text-ink">{h.date}</span>
            </div>
          );
        })}
      </div>

      {SLOT_ORDER.map((slot) => (
        <div key={slot} className="flex flex-col gap-1">
          <p className="text-label font-semibold uppercase tracking-wider text-muted">
            {t.slotNames[slot]} · {t.slotHours(SLOT_HOURS[slot].start, SLOT_HOURS[slot].end)}
          </p>
          <div className="grid grid-cols-7 gap-[3px]">
            {days.map((day) => {
              const key = `${day}|${slot}`;
              const on = value.includes(key);
              const past = day < today;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  aria-label={t.slotCell(dayLabel(day), t.slotNames[slot])}
                  disabled={past}
                  onClick={() => toggle(key)}
                  className={cx(
                    "flex h-11 items-center justify-center rounded-[10px] text-base font-bold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
                    on ? "bg-primary text-white" : "bg-card ring-1 ring-black/10",
                    past && "opacity-30",
                  )}
                >
                  {on ? "✓" : ""}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
