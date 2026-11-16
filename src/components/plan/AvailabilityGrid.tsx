"use client";

import { Chip } from "@/components/Chip";
import { cx } from "@/components/cx";
import { enCA } from "@/lib/i18n/en-CA";
import { SLOT_HOURS, SLOT_ORDER } from "@/lib/rules/config";
import { applyShortcut, dayHeading, dayLabel, pickerDays, SHORTCUTS, shortcutSlots } from "./plan-time";

const t = enCA.plan;

/**
 * Share availability, the faster picker (T31; KD-02 and KD-04 unchanged). Quick picks on top ("Weekend mornings"), then today and
 * the next 13 days, one row each with three big Morning / Afternoon / Evening toggles: every free time is one tap. Values are
 * "2026-11-16|morning", in the playdate's zone. Times already ticked on days beyond the two weeks (an edited playdate) are kept.
 */
export function AvailabilityGrid({ today, value, onChange }: { today: string; value: string[]; onChange: (value: string[]) => void }) {
  const days = pickerDays(today);
  const toggle = (key: string) => onChange(value.includes(key) ? value.filter((v) => v !== key) : [...value, key]);

  return (
    // Full width under the step's number, so three toggles and the day stay readable on a 375 px phone.
    <div className="-ml-11 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <p className="text-label font-semibold uppercase tracking-wider text-muted">{t.shortcutsLabel}</p>
        {/* One row the parent can swipe; the page column keeps its width. */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {SHORTCUTS.map((shortcut) => {
            const slots = shortcutSlots(shortcut, today);
            return (
              <Chip key={shortcut} className="shrink-0 whitespace-nowrap" selected={slots.length > 0 && slots.every((s) => value.includes(s))} onClick={() => onChange(applyShortcut(value, shortcut, today))}>
                {t.shortcuts[shortcut]}
              </Chip>
            );
          })}
        </div>
      </div>

      {[days.slice(0, 7), days.slice(7)].map((week, w) => (
        <section key={w} aria-label={w === 0 ? t.thisWeek : t.nextWeekTitle} className="flex flex-col gap-2">
          <h3 className="text-label font-semibold uppercase tracking-wider text-muted">{w === 0 ? t.thisWeek : t.nextWeekTitle}</h3>
          <ul className="flex flex-col gap-2">
            {week.map((day) => {
              const h = dayHeading(day);
              return (
                <li key={day} className="flex items-center gap-2">
                  <span className="w-[64px] shrink-0 leading-tight">
                    <span className="block text-[15px] font-semibold">{day === today ? t.today : h.weekday}</span>
                    <span className="block text-label text-muted">
                      {h.month} {h.date}
                    </span>
                  </span>
                  {SLOT_ORDER.map((slot) => {
                    const key = `${day}|${slot}`;
                    const on = value.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={on}
                        aria-label={t.slotCell(dayLabel(day), t.slotNames[slot])}
                        onClick={() => toggle(key)}
                        className={cx(
                          "flex h-14 min-w-0 flex-1 flex-col items-center justify-center rounded-button leading-tight focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
                          on ? "bg-primary text-white" : "bg-card text-ink shadow-card",
                        )}
                      >
                        <span className="text-[14px] font-semibold">{t.slotNames[slot]}</span>
                        <span className={cx("text-label", on ? "text-white/85" : "text-muted")}>{t.slotHours(SLOT_HOURS[slot].start, SLOT_HOURS[slot].end)}</span>
                      </button>
                    );
                  })}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
