"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/Button";
import { Field, SelectField } from "@/components/Field";
import { TwoPartSwitch } from "@/components/TwoPartSwitch";
import { enCA } from "@/lib/i18n/en-CA";
import { dayIn } from "@/lib/rules/time";
import type { TimeMode } from "@/lib/rules/types";
import { AvailabilityGrid } from "./AvailabilityGrid";
import { browserZone, checkSlots, checkWhen, clockLabel, DEFAULT_END, DEFAULT_START, endForNewStart, timeOptions, whenRange, whenSummary } from "./plan-time";

const t = enCA.plan;
const TIMES = timeOptions();
const noSubscription = () => () => {};

/** `slots` are the Share availability boxes ticked, "2026-11-16|morning". */
export type WhenState = { mode: TimeMode; day: string; start: string; end: string; slots: string[]; done: boolean };

/** 2 When: Pick date and time, or Share availability (T12). Done folds either into a summary; Edit reopens it. */
export function WhenStep({ value, onChange, serverError, zone: fixedZone }: { value: WhenState; onChange: (value: WhenState) => void; serverError?: string; zone?: string }) {
  // A new playdate takes the browser's zone; an edited one keeps the zone it was made in (KD-16).
  const zoneOf = () => fixedZone ?? browserZone();
  const [error, setError] = useState<string | null>(null);
  // Today on the parent's own clock; only the browser knows it, so the server's first paint has no minimum.
  const today = useSyncExternalStore(noSubscription, () => dayIn(new Date(), zoneOf()), () => undefined);
  const set = (patch: Partial<WhenState>) => onChange({ ...value, ...patch });
  const shown = error ?? serverError;

  const range = value.done && value.mode === "set_time" ? whenRange(value, zoneOf()) : null;
  const errorFor = (code: string | undefined) => (code && code in t.errors ? t.errors[code as keyof typeof t.errors] : enCA.somethingWentWrong);

  return (
    <div className="mt-2 flex flex-col gap-3">
      <TwoPartSwitch
        label={t.modeLabel}
        options={[
          { value: "set_time", label: t.pickTime },
          { value: "availability", label: t.shareAvailability },
        ]}
        value={value.mode}
        onChange={(mode) => {
          setError(null);
          // KD-02: one time mode. Switching clears what the other option held.
          if (mode !== value.mode) onChange(mode === "availability" ? { ...value, mode, day: "", start: DEFAULT_START, end: DEFAULT_END, done: false } : { ...value, mode, slots: [], done: false });
        }}
      />
      {value.mode === "availability" ? (
        value.done ? (
          <div className="flex items-center justify-between gap-3 rounded-card bg-card px-4 py-3 shadow-card">
            <p className="text-[15px] font-semibold">{t.freeTimes(value.slots.length)}</p>
            <Button compact onClick={() => set({ done: false })}>
              {t.edit}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[15px] text-muted">{t.availabilityHint}</p>
            {today && <AvailabilityGrid today={today} value={value.slots} onChange={(slots) => set({ slots })} />}
            <Button
              onClick={() => {
                const check = checkSlots(value.slots, zoneOf(), new Date());
                if (!check.ok) return setError(errorFor(check.errors[0]?.code));
                setError(null);
                set({ done: true });
              }}
            >
              {t.done}
            </Button>
          </div>
        )
      ) : range ? (
        <div className="flex items-center justify-between gap-3 rounded-card bg-card px-4 py-3 shadow-card">
          <p className="text-[15px] font-semibold">{whenSummary(range, zoneOf())}</p>
          <Button compact onClick={() => set({ done: false })}>
            {t.edit}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-card bg-page p-3 ring-1 ring-black/5">
          <Field id="when-day" type="date" label={t.dateLabel} value={value.day} min={today} onChange={(e) => set({ day: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              id="when-start"
              label={t.startLabel}
              value={value.start}
              onChange={(e) => set({ start: e.target.value, end: endForNewStart(value.start, value.end, e.target.value) })}
            >
              {TIMES.map((time) => (
                <option key={time} value={time}>
                  {clockLabel(time)}
                </option>
              ))}
            </SelectField>
            <SelectField id="when-end" label={t.endLabel} value={value.end} onChange={(e) => set({ end: e.target.value })}>
              {TIMES.map((time) => (
                <option key={time} value={time}>
                  {clockLabel(time)}
                </option>
              ))}
            </SelectField>
          </div>
          <Button
            onClick={() => {
              const check = checkWhen(value, zoneOf(), new Date());
              if (!check.ok) return setError(errorFor(check.errors[0]?.code));
              setError(null);
              set({ done: true });
            }}
          >
            {t.done}
          </Button>
        </div>
      )}
      {shown && (
        <p role="alert" className="text-[15px] font-medium text-danger">
          {shown}
        </p>
      )}
    </div>
  );
}
