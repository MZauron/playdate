"use client";

import { useSyncExternalStore } from "react";
import { formatLongDay, formatTimeRange, zoneName } from "@/lib/i18n/en-CA";

const noSubscription = () => () => {};
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * KD-16: the time in the viewer's own zone, with the zone named only when it differs from the playdate's. The server (and the
 * first paint) use the playdate's zone; the browser then switches to its own.
 */
export function LocalTime({ start, end, zone }: { start: Date; end: Date; zone: string }) {
  const viewer = useSyncExternalStore(noSubscription, browserZone, () => zone);
  const named = viewer !== zone;
  return (
    <>
      <p className="font-semibold">{formatLongDay(start, viewer)}</p>
      <p className="text-[15px] text-muted">
        {formatTimeRange(start, end, viewer)}
        {named && ` ${zoneName(start, viewer)}`}
      </p>
    </>
  );
}
