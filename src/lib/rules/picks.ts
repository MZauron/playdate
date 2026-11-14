// KD-11 (Everyone's picks) and KD-12 (majority notice for text friends).
import { sameRange } from "./time";
import type { InviteChannel, Range } from "./types";

export type FamilyPick = { inviteId: string; firstName: string; range: Range };

export type PickGroup = { range: Range; firstNames: string[]; families: number; mostPicked: boolean };

/** KD-11: picks grouped by identical range, most families first, then earliest; the top one is Most picked. First names only (KD-17). */
export function groupPicks(picks: readonly FamilyPick[]): PickGroup[] {
  const groups: { range: Range; firstNames: string[] }[] = [];
  for (const p of picks) {
    const g = groups.find((x) => sameRange(x.range, p.range));
    if (g) g.firstNames.push(p.firstName);
    else groups.push({ range: p.range, firstNames: [p.firstName] });
  }
  groups.sort(
    (a, b) =>
      b.firstNames.length - a.firstNames.length ||
      a.range.start.getTime() - b.range.start.getTime() ||
      a.range.end.getTime() - b.range.end.getTime(),
  );
  return groups.map((g, i) => ({ ...g, families: g.firstNames.length, mostPicked: i === 0 }));
}

export type NoticePick = FamilyPick & { channel: InviteChannel; majorityNoticeAt: Date | null };

/**
 * KD-12: the invites that should get the "most families picked" notice now: text friends whose
 * pick differs from the Most picked range, when at least 2 families picked it; once ever per invite.
 */
export function majorityNotices(picks: readonly NoticePick[]): { inviteIds: string[]; range: Range | null } {
  const top = groupPicks(picks)[0];
  if (!top || top.families < 2) return { inviteIds: [], range: null };
  const inviteIds = picks
    .filter((p) => p.channel === "text" && p.majorityNoticeAt === null && !sameRange(p.range, top.range))
    .map((p) => p.inviteId);
  return { inviteIds, range: top.range };
}
