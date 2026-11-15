"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/Button";
import { Field, SelectField } from "@/components/Field";
import { TwoPartSwitch } from "@/components/TwoPartSwitch";
import { enCA } from "@/lib/i18n/en-CA";
import { dayIn } from "@/lib/rules/time";
import type { TimeMode } from "@/lib/rules/types";
import { browserZone, checkWhen, clockLabel, endForNewStart, timeOptions, whenRange, whenSummary } from "./plan-time";

const t = enCA.plan;
const TIMES = timeOptions();
const noSubscription = () => () => {};

export type WhenState = { mode: TimeMode; day: string; start: string; end: string; done: boolean };

/** 2 When: Pick date and time (Share availability arrives with T12). Done folds it into a summary; Edit reopens it. */
export function WhenStep({ value, onChange, serverError, zone: fixedZone }: { value: WhenState; onChange: (value: WhenState) => void; serverError?: string; zone?: string }) {
  // A new playdate takes the browser's zone; an edited one keeps the zone it was made in (KD-16).
  const zoneOf = () => fixedZone ?? browserZone();
  const [error, setError] = useState<string | null>(null);
  // Today on the parent's own clock; only the browser knows it, so the server's first paint has no minimum.
  const today = useSyncExternalStore(noSubscription, () => dayIn(new Date(), zoneOf()), () => undefined);
  const set = (patch: Partial<WhenState>) => onChange({ ...value, ...patch });
  const shown = error ?? serverError;

  const range = value.done ? whenRange(value, zoneOf()) : null;

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
          set({ mode, done: false });
        }}
      />
      {value.mode === "availability" ? (
        <p className="text-[15px] text-muted">{t.availabilitySoon}</p>
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
              if (!check.ok) {
                const code = check.errors[0]?.code;
                setError(code && code in t.errors ? t.errors[code as keyof typeof t.errors] : enCA.somethingWentWrong);
                return;
              }
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
