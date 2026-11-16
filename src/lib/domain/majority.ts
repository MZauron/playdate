// KD-12, Q2 default: when at least two families picked the same range and a text friend picked something else, that friend gets ONE
// "most families picked" text, ever. The cron tick finds them and stamps `invites.majority_notice_at` (only where it is still empty,
// so running the tick again changes nothing). The organizer's Home then shows a Text button for each, because texts come from the
// organizer's own phone (DESIGN.md "Notifications and texts").
import { enCA, formatShortDay, formatTimeRange } from "@/lib/i18n/en-CA";
import { groupPicks, majorityNotices } from "@/lib/rules/picks";
import { sameRange } from "@/lib/rules/time";
import type { InviteChannel, Range, Zone } from "@/lib/rules/types";
import { familyPicks, type OrganizerPlaydate } from "./playdate-page";
import { firstWord } from "./playdates";

/** One collecting availability playdate as the tick sees it: each invite's channel, notice stamp and current pick. */
export type TickPlaydate = {
  id: string;
  invites: { id: string; channel: InviteChannel; majorityNoticeAt: Date | null; firstName: string; pick: Range | null }[];
};

export type TickStore = {
  /** Every collecting availability playdate whose links are still open. */
  openAvailabilityPlaydates(now: Date): Promise<TickPlaydate[]>;
  /** Stamps these invites, only where `majority_notice_at` is still empty; returns how many changed. */
  stampMajorityNotice(inviteIds: readonly string[], at: Date): Promise<number>;
};

/** KD-12 for one playdate: the invites to stamp now (text friends whose pick differs from a range ≥ 2 families picked). */
export function invitesToNotify(p: TickPlaydate): string[] {
  const picks = p.invites.flatMap((i) => (i.pick ? [{ inviteId: i.id, firstName: i.firstName, range: i.pick, channel: i.channel, majorityNoticeAt: i.majorityNoticeAt }] : []));
  return majorityNotices(picks).inviteIds;
}

/** The tick's KD-12 step. Idempotent: an invite is stamped once, ever. */
export async function runMajorityNotices(store: TickStore, now: Date): Promise<{ stamped: number }> {
  const ids = (await store.openAvailabilityPlaydates(now)).flatMap(invitesToNotify);
  return { stamped: ids.length ? await store.stampMajorityNotice(ids, now) : 0 };
}

export type MajorityNotice = { inviteId: string; playdateId: string; name: string; rangeText: string; body: string };

/** "Mon, Nov 16, 9:00 AM to 12:00 PM" */
const rangeText = (r: Range, zone: Zone) => `${formatShortDay(r.start, zone)}, ${formatTimeRange(r.start, r.end, zone)}`;

/**
 * The organizer's Home (Q2 default): one Text button per stamped text friend, while the playdate is still collecting and that friend's
 * pick still differs from the Most picked range. The text is the doc's sentence; like the update texts (Q19 default) it carries no
 * link, because the friend's link is in the first text, in the same thread.
 */
export function homeNotices(p: OrganizerPlaydate): MajorityNotice[] {
  if (p.status !== "collecting" || p.mode !== "availability") return [];
  const top = groupPicks(familyPicks(p))[0];
  if (!top || top.families < 2) return [];
  const words = rangeText(top.range, p.timezone);
  return p.invites
    .filter((i) => i.channel === "text" && i.majorityNoticeAt && !(i.answer?.pick && sameRange(i.answer.pick, top.range)))
    .map((i) => ({ inviteId: i.id, playdateId: p.id, name: firstWord(i.parentName), rangeText: words, body: enCA.majorityText(words) }));
}
