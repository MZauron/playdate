"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { cx } from "@/components/cx";
import { SelectField } from "@/components/Field";
import { clockLabel, dayLabel } from "@/components/plan/plan-time";
import { enCA, formatShortDay, formatTimeRange } from "@/lib/i18n/en-CA";
import type { InviteView } from "@/lib/domain/invite-page";
import { PICK_STEP_MINUTES, MIN_PICK_MINUTES, SLOT_HOURS } from "@/lib/rules/config";
import type { FreeSlot, Range } from "@/lib/rules/types";

const t = enCA.invite;
const p = enCA.plan;

type Pick = InviteView["picks"][number];

/** "Mon, Nov 23, 9:00 AM to 10:00 AM" on the playdate's own clock. */
export function rangeWords(range: Range, zone: string): string {
  return `${formatShortDay(range.start, zone)}, ${formatTimeRange(range.start, range.end, zone)}`;
}

/** A range as the answer form posts it: the day and from/until on the playdate's clock. */
export function rangeFields(range: Range, zone: string): { pickDay: string; pickFrom: string; pickUntil: string } {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(range.start);
  const clock = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return { pickDay: day, pickFrom: clock(range.start), pickUntil: clock(range.end) };
}

const toClock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** KD-04: half-hour steps inside one slot. From: start … end − 30 min; until: from + 30 min … end. */
export function pickOptions(slot: FreeSlot, from: string | null): { froms: string[]; untils: string[] } {
  const start = SLOT_HOURS[slot.slot].start * 60;
  const end = SLOT_HOURS[slot.slot].end * 60;
  const froms: string[] = [];
  for (let m = start; m <= end - MIN_PICK_MINUTES; m += PICK_STEP_MINUTES) froms.push(toClock(m));
  const first = (from ? toMinutes(from) : start) + MIN_PICK_MINUTES;
  const untils: string[] = [];
  for (let m = first; m <= end; m += PICK_STEP_MINUTES) untils.push(toClock(m));
  return { froms, untils };
}

/** Hidden fields that make a pick out of a range, for one-tap Pick this / Switch to this. */
function PickFields({ range, zone }: { range: Range; zone: string }) {
  const f = rangeFields(range, zone);
  return (
    <>
      <input type="hidden" name="kind" value="pick" />
      <input type="hidden" name="pickDay" value={f.pickDay} />
      <input type="hidden" name="pickFrom" value={f.pickFrom} />
      <input type="hidden" name="pickUntil" value={f.pickUntil} />
    </>
  );
}

/** "You, Dev · 2 families" (KD-11: first names only, KD-17). */
function names(pick: Pick): string {
  const who = [...(pick.yours ? [t.you] : []), ...pick.others].join(", ");
  return `${who} · ${t.families(pick.families)}`;
}

/**
 * Before answering an availability playdate (T13): Already suggested at the top (one tap picks the same range), then the organizer's
 * free boxes; tapping one (orange tick) opens from/until in 30-minute steps inside it, and Send this time.
 */
export function PickChooser({
  organizerFirstName,
  zone,
  slots,
  picks,
  hidden,
  action,
  pending,
  onDecline,
}: {
  organizerFirstName: string;
  zone: string;
  slots: FreeSlot[];
  picks: Pick[];
  hidden: React.ReactNode;
  action: (form: FormData) => void;
  pending: boolean;
  onDecline: () => void;
}) {
  const [selected, setSelected] = useState<FreeSlot | null>(null);
  const [from, setFrom] = useState<string | null>(null);
  const [until, setUntil] = useState<string | null>(null);
  const suggested = picks.filter((x) => !x.yours);
  const options = selected ? pickOptions(selected, from) : null;

  const choose = (slot: FreeSlot) => {
    setSelected(slot);
    const o = pickOptions(slot, null);
    setFrom(o.froms[0] ?? null);
    setUntil(o.untils[o.untils.length - 1] ?? null); // the whole slot to start with
  };

  return (
    <div className="flex flex-col gap-5">
      {suggested.length > 0 && (
        <section aria-labelledby="suggested" className="flex flex-col gap-2">
          <h2 id="suggested" className="text-label font-semibold uppercase tracking-wider text-muted">
            {t.alreadySuggested}
          </h2>
          {suggested.map((x) => (
            <form key={x.range.start.toISOString() + x.range.end.toISOString()} action={action} className="flex items-center justify-between gap-3 rounded-card bg-card px-4 py-3 shadow-card">
              {hidden}
              <PickFields range={x.range} zone={zone} />
              <span className="min-w-0">
                <span className="block font-semibold">{rangeWords(x.range, zone)}</span>
                <span className="block text-[15px] text-muted">{names(x)}</span>
              </span>
              <Button type="submit" compact disabled={pending}>
                {t.pickThis}
              </Button>
            </form>
          ))}
        </section>
      )}

      <section aria-labelledby="free-times" className="flex flex-col gap-2">
        <h2 id="free-times" className="px-1 text-label font-bold uppercase tracking-wider text-muted">
          {t.availabilityTitle(organizerFirstName)}
        </h2>
        <ul className="grid grid-cols-2 gap-2">
          {slots.map((slot) => {
            const on = selected?.day === slot.day && selected.slot === slot.slot;
            return (
              <li key={`${slot.day}|${slot.slot}`}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => choose(slot)}
                  className={cx(
                    "flex min-h-14 w-full flex-col items-start rounded-card px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-primary",
                    on ? "bg-accent-tint ring-2 ring-accent" : "bg-primary-tint",
                  )}
                >
                  <span className="text-[15px] font-semibold">{dayLabel(slot.day)}</span>
                  <span className={cx("text-[15px]", on ? "font-semibold text-accent" : "text-primary")}>
                    {on ? "✓ " : ""}
                    {p.slotNames[slot.slot]} · {t.free}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {selected && options && from && until && (
        <form action={action} className="flex flex-col gap-3 rounded-card bg-page p-3 ring-1 ring-black/5">
          {hidden}
          <input type="hidden" name="kind" value="pick" />
          <input type="hidden" name="pickDay" value={selected.day} />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              id="pick-from"
              name="pickFrom"
              label={t.fromLabel}
              value={from}
              onChange={(e) => {
                const next = e.target.value;
                setFrom(next);
                if (toMinutes(until) < toMinutes(next) + MIN_PICK_MINUTES) setUntil(toClock(toMinutes(next) + MIN_PICK_MINUTES));
              }}
            >
              {options.froms.map((x) => (
                <option key={x} value={x}>
                  {clockLabel(x)}
                </option>
              ))}
            </SelectField>
            <SelectField id="pick-until" name="pickUntil" label={t.untilLabel} value={until} onChange={(e) => setUntil(e.target.value)}>
              {options.untils.map((x) => (
                <option key={x} value={x}>
                  {clockLabel(x)}
                </option>
              ))}
            </SelectField>
          </div>
          <Button type="submit" variant="main" fullWidth disabled={pending}>
            {t.sendPick}
          </Button>
        </form>
      )}

      <Button fullWidth onClick={onDecline}>
        {t.no}
      </Button>
    </div>
  );
}

/** After answering (T13, KD-11): Everyone's picks, Most picked on top, Your pick marked, and Switch to this on the others. */
export function EveryonesPicks({ picks, zone, hidden, action, pending }: { picks: Pick[]; zone: string; hidden: React.ReactNode; action: (form: FormData) => void; pending: boolean }) {
  if (!picks.length) return null;
  return (
    <section aria-labelledby="everyones-picks" className="flex flex-col gap-2">
      <h2 id="everyones-picks" className="text-label font-semibold uppercase tracking-wider text-muted">
        {t.everyonesPicks}
      </h2>
      {picks.map((x) => (
        <form
          key={x.range.start.toISOString() + x.range.end.toISOString()}
          action={action}
          className={cx("flex items-center justify-between gap-3 rounded-card px-4 py-3 shadow-card", x.yours ? "bg-accent-tint" : "bg-card")}
        >
          {hidden}
          <PickFields range={x.range} zone={zone} />
          <span className="min-w-0">
            <span className="block font-semibold">{rangeWords(x.range, zone)}</span>
            <span className="block text-[15px] text-muted">{names(x)}</span>
            {(x.mostPicked || x.yours) && (
              <span className="block text-label font-semibold uppercase tracking-wider text-accent">
                {[x.mostPicked ? t.mostPicked : null, x.yours ? t.yourPickTag : null].filter(Boolean).join(" · ")}
              </span>
            )}
          </span>
          {!x.yours && (
            <Button type="submit" compact disabled={pending}>
              {t.switchToThis}
            </Button>
          )}
        </form>
      ))}
    </section>
  );
}
