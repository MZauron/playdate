// T51: Recently visited on Home: the places of the parent's own past confirmed playdates, newest first, each place once. Pure.

export type VisitedRow = { id: string; startAt: Date; placeName: string | null; placeAddress: string | null; placeProviderId: string | null };

/** The same place: the provider's id when there is one, else the typed name and address (any case, any spacing). */
function placeKey(row: VisitedRow): string | null {
  if (row.placeProviderId) return `p:${row.placeProviderId}`;
  const tidy = (s: string | null) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  return row.placeName && tidy(row.placeName) ? `t:${tidy(row.placeName)}|${tidy(row.placeAddress)}` : null;
}

/** Up to `limit` playdates, one per place (its latest visit), newest first; playdates without a place are skipped. */
export function recentPlaces<T extends VisitedRow>(rows: readonly T[], limit = 3): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of [...rows].sort((a, b) => b.startAt.getTime() - a.startAt.getTime())) {
    const key = placeKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length === limit) break;
  }
  return out;
}
